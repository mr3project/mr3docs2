---
title: On Non-secure Hadoop
sidebar_position: 1
---

This page shows how to operate Hive on MR3 in a non-secure Hadoop cluster without Kerberos
(after [completing the preliminary steps](./)).
By following the instructions, the user will learn:

1. how to configure Hive on MR3 in a non-secure Hadoop cluster
2. how to start and stop Metastore
3. how to start and stop HiveServer2
4. how to create Beeline connections and send queries to HiveServer2

## Configuring Metastore

Hive on MR3 can run with any compatible version of Metastore,
not necessarily the one included in the MR3 release.
For example, if a Metastore instance is already running in a Hadoop cluster,
the user may reuse it without starting a new instance.

In our example, we start a new instance of Metastore.
We use either Derby or MySQL 
for the Metastore database.

:::info
Using PostgreSQL or MS SQL for the Metastore database is analogous to using MySQL.
:::

### Option 1 - Using Derby

To use Derby for the Metastore database,
open `env.sh` and set `HIVE_METASTORE_DB_TYPE` to `derby`.
```sh
# terminal-command
vi env.sh

HIVE_METASTORE_DB_TYPE=derby
```

As we use `--tpcds` option,
open `conf/tpcds/hive-site.xml` and update the following configuration keys.
Remove the configuration keys `javax.jdo.option.ConnectionDriverName`
and `javax.jdo.option.ConnectionUserName`.
```xml
# terminal-command
vi conf/tpcds/hive-site.xml

<property>
  <name>hive.metastore.db.type</name>
  <value>DERBY</value>
</property>

<property>
  <name>javax.jdo.option.ConnectionURL</name>
  <value>jdbc:derby:;databaseName=${hive.local.data}/metastore_cluster/${hive.database.name};create=true</value>
</property>

<!--
<property>
  <name>javax.jdo.option.ConnectionDriverName</name>
  <value>com.mysql.jdbc.Driver</value>
</property>

<property>
  <name>javax.jdo.option.ConnectionUserName</name>
  <value>hivemr3</value>
</property>
 -->
```

### Option 2 - Using MySQL

To use MySQL for the Metastore database,
we assume that a MySQL user `root` has access to a MySQL server with all privileges.
The MySQL server may run on any node, not necessarily on the node where Metastore or HiveServer2 will be running.

```sh
# terminal-command
mysql -u root -p
...

MariaDB [(none)]> SHOW GRANTS FOR 'root'@'%';
+--------------------------------------------------------------------------------------------------------------------------------+
| Grants for root@%                                                                                                              |
+--------------------------------------------------------------------------------------------------------------------------------+
| GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY PASSWORD '*2470C0C06DEE42FD1618BB99005ADCA2EC9D1E19' WITH GRANT OPTION |
+--------------------------------------------------------------------------------------------------------------------------------+
1 row in set (0.00 sec)
```

Open `env.sh` and set the following environment variables.
```sh
# terminal-command
vi env.sh

HIVE_METASTORE_DB_TYPE=mysql
HIVE_DATABASE_HOST=$HOSTNAME
HIVE_DATABASE_NAME=hivemr3
HIVE_MYSQL_DRIVER=/usr/share/java/mysql-connector-java.jar
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
  <value>root</value>
</property>

<property>
  <name>javax.jdo.option.ConnectionPassword</name>
  <value>password</value>
</property>
```

:::info
For other types of Metastore databases,
`HIVE_METASTORE_DB_TYPE` in `env.sh` should be set to `postgresql` or `mssql`.
The configuration keys `javax.jdo.option.ConnectionURL`
and `javax.jdo.option.ConnectionDriverName` in `conf/tpcds/hive-site.xml` should be updated as well.
:::

## Running Metastore

Run Metastore using `--tpcds` option and initialize the database schema using `--init-schema` option.

```sh
# terminal-command
hive/metastore-service.sh start --tpcds --init-schema

# Running Metastore using Hive-MR3 #

Output Directory: 
/home/hive/mr3/hadoop/hive/metastore-service-result/hive-2025-03-14-00-20-47-89f10360

Starting Metastore...
```

After a while, check if Metastore has successfully started.
```sh
# terminal-command
tail -f /home/hive/mr3/hadoop/hive/metastore-service-result/hive-2025-03-14-00-20-47-89f10360/out-metastore.txt
...
Starting metastore schema initialization to 4.0.0
Initialization script hive-schema-4.0.0.derby.sql
...
Initialization script completed
...
2025-03-14 00:20:58: Starting Hive Metastore Server
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

The log file of Metastore is found under the output directory of Metastore.
```sh
# terminal-command
ls /home/hive/mr3/hadoop/hive/metastore-service-result/hive-2025-03-14-00-20-47-89f10360/hive-logs/
hive.log
```

## Running HiveServer2

Run HiveServer2 using `--tpcds` option.
In order to use LocalProcess mode for MR3 DAGAppMaster, use `--amprocess` option.

```sh
# terminal-command
hive/hiveserver2-service.sh start --tpcds --amprocess

# Running HiveServer2 using Hive-MR3 #

Output Directory: 
/home/hive/mr3/hadoop/hive/hiveserver2-service-result/hive-2025-03-14-00-35-08-b34a5b8f

Starting HiveServer2...
```

In LocalProcess mode, MR3 DAGAppMaster runs as a regular process on the same machine,
rather than a thread inside HiveServer2 or a Yarn container.

After a while, check if HiveServer2 has successfully started by inspecting its log file.

```sh
# terminal-command
grep -e "New MR3Session created" /home/hive/mr3/hadoop/hive/hiveserver2-service-result/hive-2025-03-14-00-35-08-b34a5b8f/hive-logs/hive.log 
2025-03-13T15:35:34,451  INFO [main] session.MR3SessionManagerImpl: New MR3Session created: cca348a5-1f4e-4f59-a9f2-c7defbe0630f, hive
```

The user can find a new Yarn application of type `mr3` submitted by the user.

```sh
# terminal-command
yarn application -list
...
application_1739072579773_0335	hive-mr3-cca348a5-1f4e-4f59-a9f2-c7defbe0630f	                 mr3	hive	   default	           RUNNING	         UNDEFINED	             0%	                                N/A
```

As we use LocalProcess mode for MR3 DAGAppMaster,
its log file is found under the output directory of HiveServer2.

```sh
# terminal-command
ls /home/hive/mr3/hadoop/hive/hiveserver2-service-result/hive-2025-03-14-00-35-08-b34a5b8f/application_1739072579773_0335/run.log 
/home/hive/mr3/hadoop/hive/hiveserver2-service-result/hive-2025-03-14-00-35-08-b34a5b8f/application_1739072579773_0335/run.log
```

## Running Beeline

The user may use any client program (not necessarily Beeline included in the MR3 release) to connect to HiveServer2.
In our example, we run Beeline included in the MR3 release.

Download a sample dataset.

```sh
# terminal-command
wget https://github.com/mr3project/mr3/releases/download/v2.0/pokemon.csv
```

Run Beeline.

```sh
# terminal-command
hive/run-beeline.sh
```

Use the default database.

```sh
0: jdbc:hive2://blue0:9842/> use default;
```

Create a table called `pokemon`.

```sh
0: jdbc:hive2://blue0:9842/> CREATE TABLE pokemon (Number Int,Name String,Type1 String,Type2 String,Total Int,HP Int,Attack Int,Defense Int,Sp_Atk Int,Sp_Def Int,Speed Int) row format delimited fields terminated BY ',' lines terminated BY '\n' tblproperties("skip.header.line.count"="1");
```

Import the sample dataset.

```sh
0: jdbc:hive2://blue0:9842/> load data local inpath './pokemon.csv' INTO table pokemon;
```

Execute queries.

```sh
0: jdbc:hive2://blue0:9842/> select avg(HP) from pokemon;

0: jdbc:hive2://blue0:9842/> create table pokemon1 as select *, IF(HP>160.0,'strong',IF(HP>140.0,'moderate','weak')) AS power_rate from pokemon;

0: jdbc:hive2://blue0:9842/> select COUNT(name), power_rate from pokemon1 group by power_rate;
```

Exit Beeline.
The warehouse directory on HDFS has now two sub-directories corresponding to the two Hive tables created above.

```sh
# terminal-command
hdfs dfs -ls /user/hive/warehouse
Found 2 items
drwxr-xr-x   - hive hdfs          0 2025-03-13 15:42 /user/hive/warehouse/pokemon
drwxr-xr-x   - hive hdfs          0 2025-03-13 15:43 /user/hive/warehouse/pokemon1
```

## Stopping HiveServer2 and Metastore

Stop HiveServer2.
MR3 DAGAppMaster also stops.

```sh
# terminal-command
hive/hiveserver2-service.sh stop --tpcds
```

Stop Metastore.

```sh
# terminal-command
hive/metastore-service.sh stop --tpcds
```

