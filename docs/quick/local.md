---
title: On a Local Machine
sidebar_position: 3
---

This page shows how to operate Hive on MR3 on a single machine.
All the components of Hive on MR3, such as Metastore, HiveServer2, MR3 DAGAppMaster,
and MR3 ContainerWorkers,
will be running on the same machine.
By following the instructions, the user will learn:

1. how to install and configure Hive on MR3 on a single machine
2. how to start and stop Metastore with a Derby database
3. how to start and stop HiveServer2
4. how to create Beeline connections and send queries to HiveServer2
5. difference between LocalThread mode and LocalProcess mode

After [installing Hive on MR3](./install), change to the directory `hadoop`.
```sh
# terminal-command
cd hadoop/
```

## Overview

Running Hive on MR3 involves the following steps.

* The user updates `env.sh` to set additional environment variables.
* The user updates `hive-site.xml`, `mr3-site.xml`, and `tez-site.xml`
in a configuration directory.
* The user executes `hive/metastore-service.sh` and `hive/hiveserver2-service.sh`
to start Metastore and HiveServer2.

Usually updating `env.sh` and `hive-site.xml` is enough to get started
as the default values in `mr3-site.xml` and `tez-site.xml` work well in common settings.

The MR3 release includes two sets of preset configuration files
in the directories `conf/local` and `conf/tpcds`.
These configuration directories are intended for the following scenarios:

* `conf/local`: running Hive on MR3 in local mode in which every component runs on a single machine
* `conf/tpcds`: running Hive on MR3 in a Hadoop cluster

Each script in the MR3 release accepts one of the following options to select a corresponding configuration directory.

```sh
 --local        Run jobs with configurations in conf/local/ (default)
 --tpcds        Run jobs with configurations in conf/tpcds/
```

To run Hive on MR3 on a local machine, we use `--local` option.

## Configuring `env.sh`

`env.sh` is a self-descriptive script containing
major environment variables that should be set in every environment.

* Set `JAVA_HOME` and `PATH` if necessary.
* Set `MR3_JAVA_HOME` to the common installation directory of Java.

```sh
# terminal-command
vi env.sh

export JAVA_HOME=/usr/lib/java17/
export PATH=$JAVA_HOME/bin:$PATH
MR3_JAVA_HOME=/usr/lib/java17/
```

Set the following environment variables to adjust the memory size (in MB) to be allocated to each component:

* `HIVE_METASTORE_HEAPSIZE` specifies the memory size for Metastore.
* `HIVE_SERVER2_HEAPSIZE` specifies the memory size for HiveServer2.
* `HIVE_CLIENT_HEAPSIZE` specifies the memory size of Beeline.
* `MR3_AM_HEAPSIZE` specifies the memory size of MR3 DAGAppMaster.

Since MR3 DAGAppMaster is to run as a thread inside HiveServer2,
`MR3_AM_HEAPSIZE` should be strictly smaller than `HIVE_SERVER2_HEAPSIZE`.
In our example, we use the following values.
```sh
# terminal-command
vi env.sh

HIVE_METASTORE_HEAPSIZE=4096
HIVE_SERVER2_HEAPSIZE=16384
HIVE_CLIENT_HEAPSIZE=1024
MR3_AM_HEAPSIZE=10240
```

Set `HIVE_SCRATCH_DIR` and `HIVE_BASE_OUT_DIR` to temporary working directories
on the local file system.
In our example, we use a common directory `/tmp/gla` (as the current user is `gla`).
```sh
# terminal-command
vi env.sh

HIVE_SCRATCH_DIR=/tmp/gla
HIVE_BASE_OUT_DIR=/tmp/gla
```

## Creating temporary directories

Create a new directory specified by `HIVE_SCRATCH_DIR` and **set its permission to 733**.

```sh
# terminal-command
ls /tmp/gla
ls: cannot access /tmp/gla: No such file or directory
# terminal-command
mkdir -p /tmp/gla
# terminal-command
chmod 733 /tmp/gla
```

Create a sub-directory `operation_logs` of `HIVE_BASE_OUT_DIR`.
```sh
# terminal-command
ls /tmp/gla/operation_logs
ls: cannot access /tmp/gla/operation_logs: No such file or directory
# terminal-command
mkdir -p /tmp/gla/operation_logs
```

## Configuring Hive on MR3

Open `conf/local/hive-site.xml`
and set the following configuration key
according to the current user name (instead of the default user `hive`).
```xml
# terminal-command
vi conf/local/hive-site.xml

<property>
  <name>hive.users.in.admin.role</name>
  <value>gla</value>
</property>
```

## Configuring resources

Open `conf/local/mr3-site.xml` and set the configuration keys
`mr3.am.local.resourcescheduler.max.memory.mb` and `mr3.am.local.resourcescheduler.max.cpu.cores`
which determine the memory size (in MB) and the number of cores to be allocated to all ContainerWorkers.
Since all ContainerWorkers are to run inside MR3 DAGAppMaster,
`mr3.am.local.resourcescheduler.max.memory.mb` should be strictly smaller than `MR3_AM_HEAPSIZE` in `env.sh`.
On the other hand, `mr3.am.local.resourcescheduler.max.cpu.cores` specifies virtual resources and can be set to any value.

```xml
# terminal-command
vi conf/local/mr3-site.xml

<property>
  <name>mr3.am.local.resourcescheduler.max.memory.mb</name>
  <value>8192</value>
</property>

<property>
  <name>mr3.am.local.resourcescheduler.max.cpu.cores</name>
  <value>4</value>
</property>
```

In `hive-site.xml`, the following configuration keys specify
the resource to be allocated to a Map Task, a Reduce Task, or a ContainerWorker.
In our example, we allocate 2GB and a single core to a Map Task, a Reduce Task, and a ContainerWorker.

```xml
# terminal-command
vi conf/local/hive-site.xml

<property>
  <name>hive.mr3.map.task.memory.mb</name>
  <value>2048</value>
</property>

<property>
  <name>hive.mr3.map.task.vcores</name>
  <value>1</value>
</property>

<property>
  <name>hive.mr3.reduce.task.memory.mb</name>
  <value>2048</value>
</property>

<property>
  <name>hive.mr3.reduce.task.vcores</name>
  <value>1</value>
</property>

<property>
  <name>hive.mr3.all-in-one.containergroup.memory.mb</name>
  <value>2048</value>
</property>

<property>
  <name>hive.mr3.all-in-one.containergroup.vcores</name>
  <value>1</value>
</property>
```

When updating these configuration keys, we should meet the following requirements:

* `hive.mr3.map.task.memory.mb` ≤ `hive.mr3.all-in-one.containergroup.memory.mb`
* `hive.mr3.map.task.vcores` ≤ `hive.mr3.all-in-one.containergroup.vcores`
* `hive.mr3.reduce.task.memory.mb` ≤ `hive.mr3.all-in-one.containergroup.memory.mb`
* `hive.mr3.reduce.task.vcores` ≤ `hive.mr3.all-in-one.containergroup.vcores`
* `hive.mr3.all-in-one.containergroup.memory.mb` ≤ `mr3.am.local.resourcescheduler.max.memory.mb`
* `hive.mr3.all-in-one.containergroup.vcores` ≤ `mr3.am.local.resourcescheduler.max.cpu.cores`

## Checking ports

Metastore and HiveServer2 use the ports specified by
environment variables `HIVE_METASTORE_PORT_LOCAL` and `HIVE_SERVER2_PORT`.
Make sure that these ports are not in use.
```sh
# terminal-command
vi env.sh

HIVE_METASTORE_LOCAL_PORT=9841
HIVE_SERVER2_PORT=9842
```

## Running Metastore

Run Metastore with a Derby database using `--local` option and initialize the database schema using `--init-schema` option.

```sh
# terminal-command
hive/metastore-service.sh start --local --init-schema

# Running Metastore using Hive-MR3 #

Output Directory:
/data1/gla/mr3/hadoop/hive/metastore-service-result/hive-2025-03-11-17-25-09-dced2eaf

Starting Metastore...
```

After a while, check if Metastore has successfully started.
```sh
# terminal-command
more /data1/gla/mr3/hadoop/hive/metastore-service-result/hive-2025-03-11-17-25-09-dced2eaf/out-metastore.txt
...
Metastore connection Driver :	 org.apache.derby.jdbc.EmbeddedDriver
Metastore connection User:	 APP
Starting metastore schema initialization to 4.0.0
Initialization script hive-schema-4.0.0.derby.sql
...
Initialization script completed
...
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
hive/metastore-service.sh stop --local
# terminal-command
hive/metastore-service.sh start --local
```

## Running HiveServer2

Run HiveServer2 using `--local` option.

```sh
# terminal-command
hive/hiveserver2-service.sh start --local

# Running HiveServer2 using Hive-MR3 #

Output Directory:
/data1/gla/mr3/hadoop/hive/hiveserver2-service-result/hive-2025-03-11-17-29-15-6a3cdf01

Starting HiveServer2...
```

After a while, check if HiveServer2 has successfully started.

```sh
# terminal-command
grep "New MR3Session created" /data1/gla/mr3/hadoop/hive/hiveserver2-service-result/hive-2025-03-11-17-29-15-6a3cdf01/hive-logs/hive.log
2025-03-11T17:29:34,010  INFO [main] session.MR3SessionManagerImpl: New MR3Session created: b303c7d9-b02f-4199-b54a-a0872bf032b0, gla
```

## Running Beeline

The user may use any client program (not necessarily Beeline included in the MR3 release) to connect to HiveServer2. In our example, we run Beeline included in the MR3 release.

Download a sample dataset.

```sh
# terminal-command
wget https://github.com/mr3project/mr3/releases/download/v2.0/pokemon.csv
```

Run Beeline.
```sh
# terminal-command
hive/run-beeline.sh
Output Directory:
/data1/gla/mr3/hadoop/hive/run-beeline-result/hive-2025-03-11-17-32-44-ed402242


# Running Beeline using Hive-MR3 (4.0.0) #
...
Connecting to jdbc:hive2://gold7:9842/;;ssl=false
Connected to: Apache Hive (version 4.0.0)
Driver: Hive JDBC (version 4.0.0)
Transaction isolation: TRANSACTION_REPEATABLE_READ
Beeline version 4.0.0 by Apache Hive
0: jdbc:hive2://gold7:9842/>
```

Use the default database.

```sh
0: jdbc:hive2://gold7:9842/> show databases;
...
+----------------+
| database_name  |
+----------------+
| default        |
+----------------+
1 row selected (1.544 seconds)
0: jdbc:hive2://gold7:9842/> use default;
...
No rows affected (0.035 seconds)
```

Create a table called `pokemon`.

```sh
0: jdbc:hive2://gold7:9842/> CREATE TABLE pokemon (Number Int,Name String,Type1 String,Type2 String,Total Int,HP Int,Attack Int,Defense Int,Sp_Atk Int,Sp_Def Int,Speed Int) row format delimited fields terminated BY ',' lines terminated BY '\n' tblproperties("skip.header.line.count"="1");
...
No rows affected (1.126 seconds)
```

Import the sample dataset.

```sh
0: jdbc:hive2://gold7:9842/> load data local inpath './pokemon.csv' INTO table pokemon;
...
No rows affected (0.59 seconds)
```

Execute queries.

```sh
0: jdbc:hive2://gold7:9842/> select avg(HP) from pokemon;
...
+---------------------+
|         _c0         |
+---------------------+
| 144.84882280049567  |
+---------------------+
1 row selected (3.704 seconds)
0: jdbc:hive2://gold7:9842/> create table pokemon1 as select *, IF(HP>160.0,'strong',IF(HP>140.0,'moderate','weak')) AS power_rate from pokemon;
...
807 rows affected (1.095 seconds)
0: jdbc:hive2://gold7:9842/> select COUNT(name), power_rate from pokemon1 group by power_rate;
...
+------+-------------+
| _c0  | power_rate  |
+------+-------------+
| 363  | strong      |
| 336  | weak        |
| 108  | moderate    |
+------+-------------+
3 rows selected (0.568 seconds)
```

Exit Beeline.
The user can find the directory for Metastore and the warehouse directory under `hive/hive-local-data/`.

```sh
# terminal-command
ls hive/hive-local-data/
metastore5  warehouse
# terminal-command
ls hive/hive-local-data/warehouse/
pokemon  pokemon1
```

## Stopping HiveServer2

Stop HiveServer2.

```sh
# terminal-command
hive/hiveserver2-service.sh stop --local
```

By stopping HiveServer2, we automatically stop MR3 DAGAppMaster as well
because it runs as a thread inside HiveServer2, or in LocalThread mode.
Note, however, that Metastore is still running.

## Using LocalProcess mode for MR3 DAGAppMaster

In LocalProcess mode, MR3 DAGAppMaster runs as a separate process rather than a thread inside HiveServer2.
Hence HiveServer2 does not need additional resources for accommodating MR3 DAGAppMaster.
Open `env.sh` and adjust the memory size for HiveServer2.

```sh
# terminal-command
vi env.sh

HIVE_SERVER2_HEAPSIZE=8192
```

Open `conf/local/mr3-site.xml` and set the configuration key `mr3.master.mode` to `local-process`.
```xml
# terminal-command
vi conf/local/mr3-site.xml

<property>
  <name>mr3.master.mode</name>
  <value>local-process</value>
</property>
```

Run HiveServer2 using `--amprocess` option as well.

```sh
# terminal-command
hive/hiveserver2-service.sh start --local --amprocess

# Running HiveServer2 using Hive-MR3 #

Output Directory:
/data1/gla/mr3/hadoop/hive/hiveserver2-service-result/hive-2025-03-11-17-35-58-c2285f92

Starting HiveServer2...
```

After a while, the user can find the log file of MR3 DAGAppMaster.

```sh
# terminal-command
ls /data1/gla/mr3/hadoop/hive/hiveserver2-service-result/hive-2025-03-11-17-35-58-c2285f92/*/run.log
/data1/gla/mr3/hadoop/hive/hiveserver2-service-result/hive-2025-03-11-17-35-58-c2285f92/application_187651741682175204_0001/run.log
```

The user can also find the process for MR3 DAGAppMaster.

```sh
# terminal-command
ps -ef | grep DAGAppMaster | grep mr3
gla      19036 18765 49 17:36 pts/0    00:00:08 ... com.datamonad.mr3.master.DAGAppMaster --session
```

Run Beeline and and send queries to HiveServer2.

```sh
# terminal-command
hive/run-beeline.sh
```

Stop HiveServer2.

```sh
# terminal-command
hive/hiveserver2-service.sh stop --local
```

After a while, the process for MR3 DAGAppMaster also stops.

```sh
# terminal-command
ps -ef | grep DAGAppMaster | grep mr3
```

## Stopping Metastore

Stop Metastore.

```sh
# terminal-command
hive/metastore-service.sh stop --local
```

