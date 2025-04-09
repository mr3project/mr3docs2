---
title: On Secure Hadoop
sidebar_position: 2
---

This page shows how to operate Hive on MR3 in a Kerberos-enabled secure Hadoop cluster using a MySQL database for Metastore
(after [completing the preliminary steps](./)).
By following the instructions, the user will learn:

1. how to configure Hive on MR3 in a Kerberos-enabled secure Hadoop cluster
2. how to start and stop Metastore
3. how to start and stop HiveServer2
4. how to create Beeline connections and send queries to HiveServer2

This scenario has three additional prerequisites:

* A Kerberos-enabled secure Hadoop cluster is available.
* The user has a service keytab file for securing Metastore and HiveServer2.
* The user has a keytab file for renewing HDFS tokens.

## Checking the keytab files

In our example, we will run both Metastore and HiveServer2 as user `hive`.
We assume that a service keytab file `hive.service.keytab` has already been created by the administrator and placed in the directory `/etc/security/keytabs`.

Login as user `hive`.
Check the service principal associated with the service keytab file.
In our example, we use service principal `hive/navy0@NAVY` where `NAVY` is the Kerberos realm.
Note that the service keytab file has permission 600 and is accessible only to user `hive`.

```sh
# terminal-command
ls -alt /etc/security/keytabs/hive.service.keytab
-rw------- 1 hive hadoop 672 Jan 26  2025 /etc/security/keytabs/hive.service.keytab
# terminal-command
klist -kt /etc/security/keytabs/hive.service.keytab
Keytab name: FILE:/etc/security/keytabs/hive.service.keytab
KVNO Timestamp           Principal
---- ------------------- ------------------------------------------------------
   2 01/26/2025 14:19:51 hive@NAVY
...
   2 01/26/2025 14:19:51 hive/navy0@NAVY
...
```

Acquire a Kerberos ticket from the service keytab file.

```sh
# terminal-command
kinit -k -t /etc/security/keytabs/hive.service.keytab hive/navy0@NAVY
# terminal-command
klist
Ticket cache: FILE:/tmp/krb5cc_1005
Default principal: hive/navy0@NAVY

Valid starting       Expires              Service principal
03/08/2025 00:14:13  03/09/2025 00:14:13  krbtgt/NAVY@NAVY
```

We also assume that a user keytab file `hive.keytab` has been created for user `hive`
and placed in the home directory.
If not, login as user `root` and create a new file as follows.
First run `kadmin.local` and create a new principal `hive@NAVY`.

```sh
# terminal-command
kadmin.local
Authenticating as principal root/admin@NAVY with password.
kadmin.local:  addprinc hive@NAVY
WARNING: no policy specified for hive@NAVY; defaulting to no policy
Enter password for principal "hive@NAVY":
Re-enter password for principal "hive@NAVY":
add_principal: Principal or policy already exists while creating "hive@NAVY".
```

Create a keytab file `hive.keytab` for user `hive`.
```sh
kadmin.local:  xst -k hive.keytab hive
Entry for principal hive with kvno 4, encryption type aes256-cts-hmac-sha1-96 added to keytab WRFILE:hive.keytab.
Entry for principal hive with kvno 4, encryption type aes128-cts-hmac-sha1-96 added to keytab WRFILE:hive.keytab.
Entry for principal hive with kvno 4, encryption type des3-cbc-sha1 added to keytab WRFILE:hive.keytab.
Entry for principal hive with kvno 4, encryption type arcfour-hmac added to keytab WRFILE:hive.keytab.
Entry for principal hive with kvno 4, encryption type des-hmac-sha1 added to keytab WRFILE:hive.keytab.
Entry for principal hive with kvno 4, encryption type des-cbc-md5 added to keytab WRFILE:hive.keytab.
```

Check the principal associated with the keytab file.

```sh
# terminal-command
klist -k -t hive.keytab
Keytab name: FILE:hive.keytab
KVNO Timestamp           Principal
---- ------------------- ------------------------------------------------------
   4 03/08/2025 03:32:48 hive@NAVY
...
```

Copy the keytab file to the home directory.

```sh
# terminal-command
cp hive.keytab /home/hive/
# terminal-command
chown hive /home/hive/hive.keytab
# terminal-command
chmod 600 /home/hive/hive.keytab
```

## Configuring Metastore

In our example,
we assume that a MySQL user `hivemr3` (on node `navy0`) has access to a MySQL server with all privileges.
Later we will configure Metastore so that it connects to the MySQL server using the user name `hivemr3`.
The MySQL server may run on any node, not necessarily on the node where Metastore or HiveServer2 will be running.
In our example, it runs on the same node.

```sh
# terminal-command
mysql -h navy0 -u hivemr3 -p
...

mysql> SHOW GRANTS FOR 'hivemr3'@'navy0';
+--------------------------------------------------+
| Grants for hivemr3@navy0                         |
+--------------------------------------------------+
| GRANT ALL PRIVILEGES ON *.* TO 'hivemr3'@'navy0' |
+--------------------------------------------------+
1 row in set (0.00 sec)
```

Open `env.sh` and set the following environment variables.
```sh
# terminal-command
vi env.sh

HIVE_METASTORE_DB_TYPE=mysql
HIVE_DATABASE_HOST=$HOSTNAME
HIVE_DATABASE_NAME=hivemr3

HIVE_MYSQL_DRIVER=/usr/share/java/mysql-connector-java-8.0.12.jar
```

* `HIVE_METASTORE_DB_TYPE` should be set to `mysql`.
* `HIVE_DATABASE_HOST` specifies the node where the MySQL server runs.
* `HIVE_DATABASE_NAME` specifies the name of a new database to be created for Metastore
inside MySQL.
In our example, we use `hivemr3`.
* `HIVE_MYSQL_DRIVER` should point to the MySQL connector jar file.

As we use `--tpcds` option,
open `conf/tpcds/hive-site.xml` and update the following configuration keys.
Set `javax.jdo.option.ConnectionUserName` to the MySQL user name
and `javax.jdo.option.ConnectionPassword` to the password.

```xml
# terminal-command
vi conf/tpcds/hive-site.xml

<property>
  <name>hive.metastore.db.type</name>
  <value>MYSQL</value>
</property>

<property>
  <name>javax.jdo.option.ConnectionURL</name>
  <value>jdbc:mysql://${hive.database.host}/${hive.database.name}?createDatabaseIfNotExist=true</value>
</property>

<property>
  <name>javax.jdo.option.ConnectionDriverName</name>
  <value>com.mysql.jdbc.Driver</value>
</property>

<property>
  <name>javax.jdo.option.ConnectionUserName</name>
  <value>hivemr3</value>
</property>

<property>
  <name>javax.jdo.option.ConnectionPassword</name>
  <value>password</value>
</property>
```

## Configuring security

Open `env.sh`
and enable security by setting `SECURE_MODE` to true and `HIVE_SERVER2_AUTHENTICATION` to KERBEROS.
Set the following three Kerberos principals and their corresponding keytab files.

* `HIVE_METASTORE_KERBEROS_PRINCIPAL` specifies the service principal for Metastore.
* `HIVE_SERVER2_KERBEROS_PRINCIPAL` specifies the service principal for HiveServer2.
* `USER_PRINCIPAL` specifies the principal to use when renewing HDFS tokens.

In our example, we use `hive.service.keytab` for Metastore and HiveServer2, and `hive.keytab` for renewing HDFS tokens.
In order to automatically renew HDFS tokens, we set `TOKEN_RENEWAL_HDFS_ENABLED` set to true.

```sh
# terminal-command
vi env.sh

SECURE_MODE=true

HIVE_METASTORE_KERBEROS_PRINCIPAL=hive/_HOST@NAVY
HIVE_METASTORE_KERBEROS_KEYTAB=/etc/security/keytabs/hive.service.keytab

HIVE_SERVER2_AUTHENTICATION=KERBEROS
HIVE_SERVER2_KERBEROS_PRINCIPAL=hive/_HOST@NAVY
HIVE_SERVER2_KERBEROS_KEYTAB=/etc/security/keytabs/hive.service.keytab

USER_PRINCIPAL=hive@NAVY
USER_KEYTAB=/home/hive/hive.keytab

TOKEN_RENEWAL_HDFS_ENABLED=true
```

## Running Metastore

Run Metastore using `--tpcds` option and initialize the database schema using `--init-schema` option.

```sh
# terminal-command
hive/metastore-service.sh start --tpcds --init-schema
```

The user should use `--init-schema` to initialize the database schema
when running Metastore for the first time.
Without `--init-schema`, the script fails with the following error message. 

```sh
MetaException(message:Version information not found in metastore.)
```

When restarting Metastore,
do not use `--init-schema` option in order to reuse existing Hive databases.
For example, the user can kill Metastore and restart it as follows.

```sh
# terminal-command
hive/metastore-service.sh stop --tpcds
# terminal-command
hive/metastore-service.sh start --tpcds
```

## Running HiveServer2

Run HiveServer2 using `--tpcds` option.
Do not use LocalProcess mode for MR3 DAGAppMaster (with `--amprocess` option)
which is not supported in a secure Hadoop cluster.

```sh
# terminal-command
hive/hiveserver2-service.sh start --tpcds
```

Create a new directory `hive/run-beeline-result` and set its permission to 777
so that any user can execute Beeline from the current working directory.

```sh
# terminal-command
mkdir -p hive/run-beeline-result
# terminal-command
chmod 777 hive/run-beeline-result
```

Download a sample dataset which will be accessed by another user.

```sh
# terminal-command
wget https://github.com/mr3project/mr3/releases/download/v2.0/pokemon.csv
```

## Running Beeline

The user may use any client program (not necessarily Beeline included in the MR3 release) to connect to HiveServer2.
In our example, we run Beeline included in the MR3 release.

We run Beeline as another user `gla` to send queries to HiveServer2.
Login as user `gla` and change the working directory.

```sh
# terminal-command
cd /home/hive/mr3/hadoop
```

Make sure that user `gla` cannot read the keytab files.

```sh
# terminal-command
cat /etc/security/keytabs/hive.service.keytab
cat: /etc/security/keytabs/hive.service.keytab: Permission denied
# terminal-command
cat /home/hive/hive.keytab
cat: /home/hive/hive.keytab: Permission denied
```

Acquire a Kerberos ticket for user `gla` (either by executing `kinit` or reading a Kerberos keytab file).

```sh
# terminal-command
klist
Ticket cache: FILE:/tmp/krb5cc_1001
Default principal: gla@NAVY

Valid starting       Expires              Service principal
03/09/2025 02:43:51  03/10/2025 02:43:51  krbtgt/NAVY@NAVY
```

The user may use any client program to connect to HiveServer2.
In our example, we run Beeline included in the MR3 release.

Run Beeline.

```sh
# terminal-command
hive/run-beeline.sh
```

Use the default database.

```sh
0: jdbc:hive2://navy0:9842/> use default;
```

Create a table called `pokemon`.

```sh
0: jdbc:hive2://navy0:9842/> CREATE TABLE pokemon (Number Int,Name String,Type1 String,Type2 String,Total Int,HP Int,Attack Int,Defense Int,Sp_Atk Int,Sp_Def Int,Speed Int) row format delimited fields terminated BY ',' lines terminated BY '\n' tblproperties("skip.header.line.count"="1");
```

Import the sample dataset.

```sh
0: jdbc:hive2://navy0:9842/> load data local inpath './pokemon.csv' INTO table pokemon;
```

Execute queries.

```sh
0: jdbc:hive2://navy0:9842/> select avg(HP) from pokemon;

0: jdbc:hive2://navy0:9842/> create table pokemon1 as select *, IF(HP>160.0,'strong',IF(HP>140.0,'moderate','weak')) AS power_rate from pokemon;

0: jdbc:hive2://navy0:9842/> select COUNT(name), power_rate from pokemon1 group by power_rate;
```

Exit Beeline.
The warehouse directory on HDFS has now two sub-directories corresponding to the two Hive tables created above.
Note that the sub-directories are owned by user `hive`, not user `gla`, because impersonation is disabled.

```sh
# terminal-command
hdfs dfs -ls /user/hive/warehouse
Found 2 items
drwxr-xr-x   - hive hadoop          0 2025-03-09 03:29 /user/hive/warehouse/pokemon
drwxr-xr-x   - hive hadoop          0 2025-03-09 03:30 /user/hive/warehouse/pokemon1
```

## Stopping HiveServer2 and Metastore

Stop HiveServer2 as user `hive`.

```sh
# terminal-command
hive/hiveserver2-service.sh stop --tpcds
```

Stop Metastore as user `hive`.

```sh
# terminal-command
hive/metastore-service.sh stop --tpcds
```

