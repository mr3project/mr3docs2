---
title: "On Hadoop"
sidebar_position: 4
---

This page provides the preliminary steps for setting up Hive on MR3 on Hadoop.
The same user, not necessarily an administrator of the Hadoop cluster,
will run both Metastore and HiveServer2.
For the Metastore database,
we use either a Derby database included in Hive or a MySQL database.

:::tip
We recommend that the user try [Hive on MR3 on a local machine](../local)
before running it on Hadoop.
:::

## Prerequisites

Running Hive on MR3 on Hadoop has the following prerequisites:

* Hadoop 3 or higher is available.
* The installation directory of Java 17 must be the same **on every worker node**.
* The user has access to 1) the home directory `/user/${USER}` and 2) `/tmp` directory on HDFS.
In our example, the user `hive` executes Hive on MR3.
* In order to use MySQL for the Metastore database,
the user should have access to a MySQL server with all privileges.

[After installing Hive on MR3](../install), change to the directory `hadoop`.
```sh
# terminal-command
cd hadoop/
```

:::caution
The Snappy library should be installed on every node
because Hive on MR3 uses Snappy by default to compress intermediate data.
Alternatively the user can set the configuration key `tez.runtime.compress.codec` in `tez-site.xml`
to `DefaultCodec`.

```xml
# terminal-command
vi conf/tpcds/tez-site.xml

<property>
  <name>tez.runtime.compress.codec</name>
  <value>org.apache.hadoop.io.compress.DefaultCodec</value>
</property>
```
:::

## Configuring Java in `hadoop-env.sh`

In order to run Metastore and HiveServer2 with Java 17,
`JAVA_HOME` in `hadoop-env.sh` **located in the Hadoop configuration directory**
should be set to the installation directory of Java 17.

```sh
# terminal-command
vi /etc/hadoop/conf/hadoop-env.sh

export JAVA_HOME=/usr/lib/java17/
```

This step is necessary because Metastore and HiveServer2
eventually read `JAVA_HOME` in `hadoop-env.sh` before executing Java.

## Overview

Running Hive on MR3 involves the following steps.

* The user updates `env.sh` to set additional environment variables.
* The user updates `hive-site.xml`, `mr3-site.xml`, and `tez-site.xml`
in a configuration directory.
* The user executes `hive/metastore-service.sh` and `hive/hiveserver2-service.sh`
to start Metastore and HiveServer2.
* HiveServer2 automatically creates MR3 DAGAppMaster, which in turn creates MR3 ContainerWorkers.

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

To run Hive on MR3 in a Hadoop cluster, we use `--tpcds` option.

:::info
The configuration directory `conf/tpcds` results from
fine-tuning Hive on MR3 for the TPC-DS benchmark with a scale factor of 10TB.
Thus it provides a good basis for use in production.
:::

:::tip
Depending on the size of the Hadoop cluster, 
the user limits `nofile` (open files) and `nproc` (max user processes) reported by the command `ulimit` should be sufficiently large.
The user can change these values by updating the file `/etc/security/limits.conf` or an equivalent file.
:::

## Configuring `env.sh`

`env.sh` is a self-descriptive script containing
major environment variables that should be set in every environment.

* Set `JAVA_HOME` and `PATH` if necessary.
* Set `MR3_JAVA_HOME` to the common installation directory of Java.
* Set `HADOOP_HOME` to the Hadoop installation directory.

```sh
# terminal-command
vi env.sh

export JAVA_HOME=/usr/lib/java17/
export PATH=$JAVA_HOME/bin:$PATH
MR3_JAVA_HOME=/usr/lib/java17/

export HADOOP_HOME=/usr/local/hadoop
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

HIVE_METASTORE_HEAPSIZE=32768
HIVE_SERVER2_HEAPSIZE=32768
HIVE_CLIENT_HEAPSIZE=1024
MR3_AM_HEAPSIZE=32768
```

`HIVE_WAREHOUSE_DIR` specifies the warehouse directory **on HDFS.**
```sh
# terminal-command
vi env.sh

HIVE_WAREHOUSE_DIR=/user/hive/warehouse
```

It is okay to use an existing warehouse directory.
Create a new warehouse directory if it does not exist.
```sh
# terminal-command
hdfs dfs -mkdir -p /user/hive/warehouse
```

Set `HIVE_SCRATCH_DIR` to a temporary working directory **on HDFS.**
Set `HIVE_BASE_OUT_DIR` to a temporary working directory **on the local file system.**
```sh
# terminal-command
vi env.sh

HIVE_SCRATCH_DIR=/tmp/hive
HIVE_BASE_OUT_DIR=/tmp/hive
```

## Creating temporary directories

If the directory specified by `HIVE_SCRATCH_DIR` already exists on HDFS (e.g., when running Hive on MR3 for the second time),
make sure that **its permission is set to 733.**
If it does not exist,
HiveServer2 automatically creates a new directory with permission 733.
```sh
# terminal-command
hdfs dfs -ls /tmp/ | grep hive
drwx-wx-wx   - hive          hdfs          0 2025-03-13 14:11 /tmp/hive
```

Create a sub-directory `operation_logs` of `HIVE_BASE_OUT_DIR` on the local file system.
```sh
# terminal-command
ls /tmp/hive/operation_logs
ls: cannot access /tmp/hive/operation_logs: No such file or directory
# terminal-command
mkdir -p /tmp/hive/operation_logs
```

## Uploading MR3 jar files to HDFS

`HDFS_LIB_DIR` in `env.sh` specifies the directory on HDFS
to which MR3 jar files should be uploaded.
When running Hive on MR3, these jar files are registered as local resources for Hadoop jobs
and automatically distributed to worker nodes (where NodeManagers are running).

Create a new directory `/user/${USER}/lib` on HDFS corresponding to `HDFS_LIB_DIR`.

```sh
# terminal-command
hdfs dfs -mkdir -p /user/hive/lib
```

Upload MR3 jar files to HDFS
by executing `mr3/upload-hdfslib-mr3.sh` and `tez/upload-hdfslib-tez.sh`.

```sh
# terminal-command
mr3/upload-hdfslib-mr3.sh

# Uploading MR3 jar file to HDFS #
Output (HDFS): /user/hive/lib/mr3

-rw-r--r--   3 hive          hdfs   31966931 2025-03-13 14:16 /user/hive/lib/mr3/mr3-tez-2.0-assembly.jar
# terminal-command
tez/upload-hdfslib-tez.sh

# Uploading tez-0.9.1.mr3.2.0 jar files to HDFS #
Output (HDFS): /user/hive/lib/tez

drwxr-xr-x   - hive          hdfs          0 2025-03-13 14:16 /user/hive/lib/tez/tar
-rw-r--r--   3 hive          hdfs  370504115 2025-03-13 14:16 /user/hive/lib/tez/tar/tez-0.9.1.mr3.2.0.tar.gz
```

## Configuring Hive on MR3

Open `conf/tpcds/hive-site.xml`
and set the following configuration key
according to the current user name (if it is different from the default user `hive`).
```xml
# terminal-command
vi conf/tpcds/hive-site.xml

<property>
  <name>hive.users.in.admin.role</name>
  <value>hive</value>
</property>
```

## Configuring resources

In `conf/tpcds/hive-site.xml`,
the following configuration keys specify
the resource to be allocated to a Map Task, a Reduce Task, or a ContainerWorker.
In our example, we allocate 4GB and a single core to a Map Task and a Reduce Task.
A single worker container (called ContainerWorker in MR3) uses 40GB of memory and 10 cores,
so it can accommodate 10 concurrent Tasks.

```xml
# terminal-command
vi conf/tpcds/hive-site.xml

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
  <value>40960</value>
</property>

<property>
  <name>hive.mr3.all-in-one.containergroup.vcores</name>
  <value>10</value>
</property>
```

When updating these configuration keys, we should meet the following requirements:

* `hive.mr3.map.task.memory.mb` ≤ `hive.mr3.all-in-one.containergroup.memory.mb`
* `hive.mr3.map.task.vcores` ≤ `hive.mr3.all-in-one.containergroup.vcores`
* `hive.mr3.reduce.task.memory.mb` ≤ `hive.mr3.all-in-one.containergroup.memory.mb`
* `hive.mr3.reduce.task.vcores` ≤ `hive.mr3.all-in-one.containergroup.vcores`

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

:::info
After completing the above steps, proceed to the following guides:

* [On Non-secure Hadoop](./run-hadoop) demonstrates
how to operate Hive on MR3 in a non-secure Hadoop cluster.
* [On Secure Hadoop](./run-hadoop-kerberos) demonstrates
to operate Hive on MR3 in a Kerberos-enabled secure Hadoop cluster
using a MySQL database for Metastore.
:::

