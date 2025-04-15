---
title: "In Standalone Mode"
sidebar_position: 4
---

## Basics

MR3 in standalone mode allows Hive on MR3 to run
without requiring a resource manager such as Hadoop or Kubernetes.
The user can install Hive on MR3 virtually in any type of cluster
regardless of the availability of Hadoop or Kubernetes.
A storage cluster hosting HDFS or S3 is, however, still required.

The main advantage of standalone mode is the simplicity of operating Hive on MR3.
To run Hive on MR3 in standalone mode,
it suffices to download an MR3 release,
configure Hive on MR3 by updating a few configuration files,
and copy the updated MR3 release to every worker node.
Hence running Hive on MR3 is similar to running Trino/Presto/Spark in standalone mode.

Since Hive on MR3 in standalone mode does not use a resource manager,
it does not directly support such key features as high availability, DAGAppMaster recovery, and autoscaling.
This is a price to pay for using standalone mode,
in which the user is responsible for launching and terminating every component.

This page shows how to operate Hive on MR3 in standalone mode.
Metastore, HiveServer2, and MR3 DAGAppMaster will be running on a master node
while MR3 ContainerWorkers will be running on worker nodes.
For the Metastore database,
we can use either a Derby database included in Hive or a MySQL server.
By following the instructions, the user will learn:

1. how to configure Hive on MR3 in standalone mode
2. how to start and stop Metastore
3. how to start and stop HiveServer2
4. how to create Beeline connections and send queries to HiveServer2

:::tip
We recommend that the user try [Hive on MR3 on a local machine](./local)
before running it in standalone mode.
:::

## Prerequisites

Running Hive on MR3 in standalone mode has the following prerequisites:

* Java 17 should be installed **in the same directory on every node**.
In our example, Java 17 is installed in the directory `/home/hive/jdk17`.
* The user has access to a distributed storage such as HDFS and S3.

In order to use MySQL for the Metastore database,
the user should have access to a MySQL server with all privileges.

:::info
Using PostgreSQL or MS SQL for the Metastore database is analogous to using MySQL.
:::

## Setting up a cluster

Hive on MR3 consists of the following components: Metastore, HiveServer2, MR3 DAGAppMaster, and MR3 ContainerWorkers.
In our example, we use a cluster of 5 nodes.
`orange1` is the master node where Metastore, HiveServer2, and MR3 DAGAppMaster will be running,
`orange2` to `orange5` are worker nodes where MR3 ContainerWorkers will be running.
```sh
# terminal-command
vi /etc/hosts

192.168.10.1  orange1   # master node
192.168.10.2  orange2   # worker node
192.168.10.3  orange3   # worker node
192.168.10.4  orange4   # worker node
192.168.10.5  orange5   # worker node
```

Hive on MR3 requires three types of storage:

* Data source such as HDFS and S3
* Distributed storage for storing transient data such as HDFS, S3, and NFS
* Local directories on worker nodes for storing intermediate data

In our example, we use S3 for both data source and distributed storage for storing transient data.
For data source, we use the S3 bucket `s3a://hivemr3/warehouse`.
For storing transient data, we use the S3 bucket `s3a://hivemr3/scratch`.

We require that every worker node has an identical set of local directories
for storing intermediate data.
In our example, worker nodes use a single local directory `/data1/k8s`.

## Installing on worker nodes

After [installing Hive on MR3](./install) on the master node,
copy the entire directory to every worker node.
In our example,
we run Hive on MR3 as user `hive` and
passwordless connection to worker nodes is already set up.
The following command assumes that the current working directory is `mr3`.
```sh
# terminal-command
pwd
/home/hive/mr3
# terminal-command
for i in {2..5}; do ssh hive@orange$i "mkdir -p /home/hive/mr3"; rsync -av --links . hive@orange$i:/home/hive/mr3; done
```

Now change to the directory `standalone`.
```sh
# terminal-command
cd standalone/
```

## Overview

Running Hive on MR3 involves the following steps.

* The user updates `env.sh` to set additional environment variables.
* The user updates `hive-site.xml`, `mr3-site.xml`, and `tez-site.xml`
in the configuration directory `conf`.
* The user executes `hive/metastore-service.sh` and `hive/hiveserver2-service.sh`
to start Metastore and HiveServer2.
* HiveServer2 automatically creates MR3 DAGAppMaster,
but the user should execute MR3 ContainerWorkers manually.

Usually updating `env.sh` and `hive-site.xml` is enough to get started
as the default values in `mr3-site.xml` and `tez-site.xml` work well in common settings.

:::info
The configuration directory `conf` results from
fine-tuning Hive on MR3 for the TPC-DS benchmark with a scale factor of 10TB.
Thus it provides a good basis for use in production.
:::

## Configuring `env.sh`

The first step is to set environment variables in `env.sh`.
`env.sh` is read not only by HiveServer2 (running on the master node)
but also by ContainerWorkers (running on worker nodes).

Open `env.sh` and set `JAVA_HOME` and `PATH` if necessary.
Set `JAVA_HOME` to the installation directory of Java.
```sh
# terminal-command
vi env.sh

export JAVA_HOME=/home/hive/jdk17/
export PATH=$JAVA_HOME/bin:$PATH
```

Set the following environment variables to adjust the memory size (in MB) to be allocated to each component:

* `HIVE_METASTORE_HEAPSIZE` specifies the memory size for Metastore.
* `HIVE_SERVER2_HEAPSIZE` specifies the memory size for HiveServer2.
* `HIVE_CLIENT_HEAPSIZE` specifies the memory size of Beeline.
* `MR3_AM_HEAPSIZE` specifies the memory size of MR3 DAGAppMaster.

In our example, we use the following values.
```sh
# terminal-command
vi env.sh

HIVE_METASTORE_HEAPSIZE=16384
HIVE_SERVER2_HEAPSIZE=16384
HIVE_CLIENT_HEAPSIZE=1024
MR3_AM_HEAPSIZE=16384
```

Set `HIVE_WAREHOUSE_DIR` to the S3 bucket (or the HDFS directory) storing the warehouse.
Note that for using S3, we should use prefix `s3a`, not `s3`.
```sh
# terminal-command
vi env.sh

HIVE_WAREHOUSE_DIR=s3a://hivemr3/warehouse
```

Set `HIVE_SCRATCH_DIR` to a temporary working directory **on S3** (or HDFS) for storing transient data.
Set `HIVE_BASE_OUT_DIR` to a temporary working directory **on the local file system.**

```sh
# terminal-command
vi env.sh

HIVE_SCRATCH_DIR=s3a://hivemr3/scratch
HIVE_BASE_OUT_DIR=/tmp/hive
```

If an NFS volume is mounted in the same directory on every node,
`HIVE_SCRATCH_DIR` may be set to the mount point
(e.g., `/home/nfs/hivemr3`).
In such a case,
make sure that **its permission is set to 733.**
If it does not exist,
HiveServer2 automatically creates a new directory with permission 733.

## Creating temporary directories

Create a sub-directory `operation_logs` of `HIVE_BASE_OUT_DIR` on the local file system.
```sh
# terminal-command
ls /tmp/hive/operation_logs
ls: cannot access /tmp/hive/operation_logs: No such file or directory
# terminal-command
mkdir -p /tmp/hive/operation_logs
```

## Configuring Hive on MR3

Open `conf/hive-site.xml`
and set the following configuration key
according to the current user name (if it is different from the default user `hive`).
```xml
# terminal-command
vi conf/hive-site.xml

<property>
  <name>hive.users.in.admin.role</name>
  <value>hive</value>
</property>
```

## Configuring `env.sh` for ContainerWorkers

The following environment variables in `env.sh`
(which will be copied to worker nodes later) are read by ContainerWorkers.

```sh
# terminal-command
vi env.sh

export PROCESS_CONTAINER_WORKER_SECRET=worker-secret
export PROCESS_CONTAINER_WORKER_SERVER_HOST=192.168.10.1

export PROCESS_CONTAINER_WORKER_MEMORY_MB=32768
export PROCESS_CONTAINER_WORKER_CPU_CORES=8
export PROCESS_CONTAINER_WORKER_MEMORY_XMX=26214

export PROCESS_CONTAINER_WORKER_LOCAL_DIRS=/data1/k8s
```

* `PROCESS_CONTAINER_WORKER_SECRET` specifies a string to be used as a secret for
communicating to DAGAppMaster.
* `PROCESS_CONTAINER_WORKER_SERVER_HOST` specifies the IP address of DAGAppMaster.
In our example, it is set to the IP address of the master node `orange1`.
* `PROCESS_CONTAINER_WORKER_MEMORY_MB` specifies the memory size (in MB) to be assumed by each ContainerWorker.
That is, a ContainerWorker assumes that it may use as much memory as specified by `PROCESS_CONTAINER_WORKER_MEMORY_MB`.
* `PROCESS_CONTAINER_WORKER_CPU_CORES` specifies the number of cores to be assumed by each ContainerWorker.
That is, a ContainerWorker assumes that it may use as many cores as specified by `PROCESS_CONTAINER_WORKER_CPU_CORES`.
* `PROCESS_CONTAINER_WORKER_MEMORY_XMX` specifies the argument for the Java `-Xmx` option.
hat is, it specifies the size of heap memory to be allocated to each ContainerWorker.
The user should set `PROCESS_CONTAINER_WORKER_MEMORY_XMX` to a fraction (e.g., 0.8) of
`PROCESS_CONTAINER_WORKER_MEMORY_MB`.
In our example, each ContainerWorker starts with Java option `-Xmx26214`.
* `PROCESS_CONTAINER_WORKER_LOCAL_DIRS` should be set to a (comma-separated) list of local directories on worker nodes for storing intermediate data of ContainerWorkers.

## Configuring resources

In `conf/hive-site.xml`,
the following configuration keys specify
the resource to be allocated to a Map Task, a Reduce Task, or a ContainerWorker.
In our example, we allocate 4GB and a single core to a Map Task and a Reduce Task.
In particular,
the configuration keys `hive.mr3.all-in-one.containergroup.memory.mb` and `hive.mr3.all-in-one.containergroup.vcores`
should be adjusted to match
`PROCESS_CONTAINER_WORKER_MEMORY_MB` and `PROCESS_CONTAINER_WORKER_CPU_CORES` in `env.sh`,
respectively.

```xml
# terminal-command
vi conf/hive-site.xml

<property>
  <name>hive.mr3.map.task.memory.mb</name>
  <value>4096</value>
</property>

<property>
  <name>hive.mr3.map.task.vcores</name>
  <value>1</value>
</property>

<property>
  <name>hive.mr3.reduce.task.memory.mb</name>
  <value>4096</value>
</property>

<property>
  <name>hive.mr3.reduce.task.vcores</name>
  <value>1</value>
</property>

<property>
  <name>hive.mr3.all-in-one.containergroup.memory.mb</name>
  <value>32768</value>
</property>

<property>
  <name>hive.mr3.all-in-one.containergroup.vcores</name>
  <value>8</value>
</property>
```

When updating these configuration keys, we should meet the following requirements:

* `hive.mr3.map.task.memory.mb` ≤ `PROCESS_CONTAINER_WORKER_MEMORY_MB`
* `hive.mr3.map.task.vcores` ≤ `PROCESS_CONTAINER_WORKER_CPU_CORES`
* `hive.mr3.reduce.task.memory.mb` ≤ `PROCESS_CONTAINER_WORKER_MEMORY_MB`
* `hive.mr3.reduce.task.vcores` ≤ `PROCESS_CONTAINER_WORKER_CPU_CORES`

## Checking ports

Metastore and HiveServer2 use the ports specified by
environment variables `HIVE_METASTORE_PORT` and `HIVE_SERVER2_PORT`.
Make sure that these ports are not in use.
```sh
# terminal-command
vi env.sh

HIVE_METASTORE_PORT=9840
HIVE_SERVER2_PORT=9842
```

## Configuring Metastore

Hive on MR3 can run with any compatible version of Metastore,
not necessarily the one included in the MR3 release.
In our example, we start a new instance of Metastore
using either Derby or MySQL for its database.

:::info
Using PostgreSQL or MS SQL for the Metastore database is analogous to using MySQL.
:::

### Option 1 - Using Derby

In order to use Derby for the Metastore database,
open `env.sh` and set `HIVE_METASTORE_DB_TYPE` to `derby`.
```sh
# terminal-command
vi env.sh

HIVE_METASTORE_DB_TYPE=derby
```

Open `conf/hive-site.xml` and update the following configuration keys.
Remove the configuration keys `javax.jdo.option.ConnectionDriverName`
and `javax.jdo.option.ConnectionUserName`.
```xml
# terminal-command
vi conf/hive-site.xml

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
Enter password:
Welcome to the MariaDB monitor.  Commands end with ; or \g.
Your MariaDB connection id is 560632
Server version: 5.5.60-MariaDB MariaDB Server

Copyright (c) 2000, 2018, Oracle, MariaDB Corporation Ab and others.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

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
```

* `HIVE_METASTORE_DB_TYPE` should be set to `mysql`.
* `HIVE_DATABASE_HOST` specifies the node where the MySQL server runs.
* `HIVE_DATABASE_NAME` specifies the name of a new database to be created for Metastore
inside MySQL.
In our example, we use `hivemr3`.

Open `conf/hive-site.xml`
and
set `javax.jdo.option.ConnectionUserName` to the MySQL user name
and `javax.jdo.option.ConnectionPassword` to the password.

```xml
# terminal-command
vi conf/hive-site.xml

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

## Configuring S3 (optional)

T access S3 storage,
additional configuration keys should be set in `conf/core-site.xml`.
Open `conf/core-site.xml` and set configuration keys for S3.
The configuration key `fs.s3a.endpoint` should be set to point to the storage server.

```xml
# terminal-command
vi conf/core-site.xml

<property>
  <name>fs.s3a.aws.credentials.provider</name>
  <value>com.amazonaws.auth.EnvironmentVariableCredentialsProvider</value>
</property>

<property>
  <name>fs.s3a.endpoint</name>
  <value>http://192.168.10.100:9000</value>
</property>

<property>
  <name>fs.s3a.path.style.access</name>
  <value>true</value>
</property>
```

The user may need to change the parameters for accessing S3
to avoid `SdkClientException: Unable to execute HTTP request: Timeout waiting for connection from pool`.
For more details, see [Troubleshooting](../guides/troubleshoot).

When using
the class `EnvironmentVariableCredentialsProvider` to read AWS credentials,
two environment variables
`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `env.sh` should be set to the access ID and the password, respectively.

```sh
# terminal-command
vi env.sh

export AWS_ACCESS_KEY_ID=_your_aws_access_key_id_
export AWS_SECRET_ACCESS_KEY=_your_aws_secret_secret_key_
```

## Configuring security in Metastore

For simplicity, we disable security on the Metastore side.

```xml
# terminal-command
vi conf/hive-site.xml

<property>
  <name>hive.metastore.pre.event.listeners</name>
  <value></value>
</property>
```

## Configuring HiveServer2

Check the configuration for authentication and authorization.

```xml
# terminal-command
vi conf/hive-site.xml

<property>
  <name>hive.security.authenticator.manager</name>
  <value>org.apache.hadoop.hive.ql.security.HadoopDefaultAuthenticator</value>
</property>

<property>
  <name>hive.security.authorization.manager</name>
  <value>org.apache.hadoop.hive.ql.security.authorization.plugin.sqlstd.SQLStdConfOnlyAuthorizerFactory</value>
</property>
```

## Distributing `env.sh` to worker nodes

As it is also read by ContainerWorkers,
copy `env.sh` to the same directory on every worker node.

```sh
# terminal-command
for i in {2..5}; do scp env.sh hive@orange$i:/home/hive/mr3/standalone; done
```

We do not need to copy configuration files in the directory `conf` to worker nodes
because they are passed directly from MR3 DAGAppMaster.

## Running Metastore

Run Metastore and initialize the database schema using `--init-schema` option.
When using MySQL for the Metastore database,
the script automatically downloads a MySQL connector
from `https://cdn.mysql.com/Downloads/Connector-J/mysql-connector-java-8.0.28.tar.gz`.

```sh
# terminal-command
hive/metastore-service.sh start --init-schema
Downloading a MySQL connector: https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.28.tar.gz
...

# Running Metastore #

Output directory: /home/hive/mr3/standalone/hive/run-result/metastore/hivemr3-2025-03-15-01-51-52-26ca41a2
Starting Metastore...
```

After a while, check if Metastore has successfully started.
```sh
# terminal-command
tail -f /home/hive/mr3/standalone/hive/run-result/metastore/hivemr3-2025-03-15-01-51-52-26ca41a2/out-metastore.txt
...
Starting metastore schema initialization to 4.0.0
Initialization script hive-schema-4.0.0.mysql.sql
...
Initialization script completed
...
2025-03-15 01:52:10: Starting Hive Metastore Server
```

The user should use `--init-schema` to initialize the database schema
when running Metastore for the first time.
Without `--init-schema`, the script fails with the following error message. 

```sh
MetaException(message:Version information not found in metastore.)
```

When restarting Metastore,
do not use `--init-schema` option in order to reuse existing Hive databases.

The log file of Metastore is found under the output directory of Metastore.
```sh
# terminal-command
ls /home/hive/mr3/standalone/hive/run-result/metastore/hivemr3-2025-03-15-01-51-52-26ca41a2/hive-logs/
hive.log
```

## Running HiveServer2

After Metastore starts, run HiveServer2. 
In order to use LocalProcess mode for MR3 DAGAppMaster, use `--localprocess` option.

```sh
# terminal-command
hive/hiveserver2-service.sh start --localprocess

# Running HiveServer2 #

Output directory: /home/hive/mr3/standalone/hive/run-result/hiveserver2/hivemr3-2025-03-15-01-55-23-f39f05da
Starting HiveServer2...
```

In LocalProcess mode, MR3 DAGAppMaster runs as a regular process on the same machine,
rather than a thread inside HiveServer2 or a Yarn container.

After a while, check if HiveServer2 has successfully started by inspecting its log file.

```sh
# terminal-command
grep -e "New MR3Session created" /home/hive/mr3/standalone/hive/run-result/hiveserver2/hivemr3-2025-03-15-01-55-23-f39f05da/hive-logs/hive.log 
2025-03-15T01:55:39,669  INFO [main] session.MR3SessionManagerImpl: New MR3Session created: a18401a6-4477-4497-ab2c-641d1793b57a, hive
```

As we use LocalProcess mode for MR3 DAGAppMaster,
its log file is found under the directory `hive/run-result/hiveserver2/am-local-log-dir`.

After a while, a DAGAppMaster process is created and the user can find its log.
```sh
# terminal-command
ls /home/hive/mr3/standalone/hive/run-result/hiveserver2/am-local-log-dir/application_267311741971334594_0001/run.log 
/home/hive/mr3/standalone/hive/run-result/hiveserver2/am-local-log-dir/application_267311741971334594_0001/run.log
```

## Running ContainerWorkers

In standalone mode, the user should execute ContainerWorkers manually.
For example, the user can create a script for executing ContainerWorkers.

```sh
# terminal-command
vi run.sh

#!/bin/bash

for i in {2..5}; do
  ssh orange$i "cd /home/hive/mr3/standalone/hive/; ./run-worker.sh;" &
done
```

ContainerWorkers are not immediately registered in DAGAppMaster, as shown in the log of DAGAppMaster:

```sh
# terminal-command
tail -f /home/hive/mr3/standalone/hive/run-result/hiveserver2/am-local-log-dir/application_267311741971334594_0001/run.log
...
2025-03-15 02:02:43,647 [IPC Server handler 0 on default port 19666] INFO  ProcessCommunicatorServerClient$ [] - tryRegisterProcess(): 47c19154-c703-4a80-859f-72ba6f7e886e, 192.168.10.2, 32768MB, 8 cores
```

Instead DAGAppMaster registers ContainerWorkers after the first query is submitted.

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
Output directory: /home/hive/mr3/standalone/hive/run-result/beeline/hivemr3-2025-03-15-02-06-08-40e4d680

# Running Beeline using Hive-MR3 #

...
Connecting to jdbc:hive2://orange1:9842/;;;
Connected to: Apache Hive (version 4.0.0)
Driver: Hive JDBC (version 4.0.0)
Transaction isolation: TRANSACTION_REPEATABLE_READ
Beeline version 4.0.0 by Apache Hive
0: jdbc:hive2://orange1:9842/> 
```

Use the default database.

```sh
0: jdbc:hive2://orange1:9842/> use default;
```

Create a table called `pokemon`.

```sh
0: jdbc:hive2://orange1:9842/> CREATE TABLE pokemon (Number Int,Name String,Type1 String,Type2 String,Total Int,HP Int,Attack Int,Defense Int,Sp_Atk Int,Sp_Def Int,Speed Int) row format delimited fields terminated BY ',' lines terminated BY '\n' tblproperties("skip.header.line.count"="1");
```

Import the sample dataset.

```sh
0: jdbc:hive2://orange1:9842/> load data local inpath './pokemon.csv' INTO table pokemon;
```

Execute queries.

```sh
0: jdbc:hive2://orange1:9842/> select avg(HP) from pokemon;

0: jdbc:hive2://orange1:9842/> create table pokemon1 as select *, IF(HP>160.0,'strong',IF(HP>140.0,'moderate','weak')) AS power_rate from pokemon;

0: jdbc:hive2://orange1:9842/> select COUNT(name), power_rate from pokemon1 group by power_rate;
```

:::info
Since we execute queries on a small dataset,
some ContainerWorkers may not be immediately registered in DAGAppMaster.
:::

## Stopping Hive on MR3

In standalone mode,
the user is responsible for starting and terminating
all of Metastore, HiveServer, DAGAppMaster, and ContainerWorkers.
Thus manually terminate all the processes with the command `kill`.

