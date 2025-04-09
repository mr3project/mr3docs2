---
title: Access to S3
sidebar_position: 30
---

## Configuring access to S3

There are a few configuration keys that significantly impact performance
when accessing S3 (or S3-compatible) storage.
We recommend setting at least the following configuration keys
in `core-site.xml` and `hive-site.xml`.
Note that we place `hive.mv.files.thread` in `core-site.xml`, not in `hive-site.xml`,
because it is useful only for S3.

```xml
# terminal-command
vi core-site.xml

<property>
  <name>fs.s3a.connection.maximum</name>
  <value>2000</value>
</property>

<property>
  <name>fs.s3.maxConnections</name>
  <value>2000</value>
</property>

<property>
  <name>fs.s3a.threads.max</name>
  <value>100</value>
</property>

<property>
  <name>fs.s3a.threads.core</name>
  <value>100</value>
</property>

<!-- S3 write performance -->

<property>
  <name>hive.mv.files.thread</name>
  <value>15</value>
</property>

<property>
  <name>fs.s3a.max.total.tasks</name>
  <value>5</value>
</property>

<property>
  <name>fs.s3a.blocking.executor.enabled</name>
  <value>false</value>
</property>

<!-- S3 input listing -->
<property>
  <name>mapreduce.input.fileinputformat.list-status.num-threads</name>
  <value>50</value>
</property>
```

```xml
# terminal-command
vi hive-site.xml

<!-- S3 input listing -->
<property>
  <name>hive.exec.input.listing.max.threads</name>
  <value>50</value>
</property>

<!-- MSCK (Metastore Check) -->

<property>
  <name>hive.metastore.fshandler.threads</name>
  <value>30</value>
</property>

<property>
  <name>hive.msck.repair.batch.size</name>
  <value>3000</value>
</property>

<!-- dynamic partition query -->
<property>
  <name>hive.load.dynamic.partitions.thread</name>
  <value>25</value>
</property>
```

## Vectorized reading in ORC 2

As Hive on MR3 uses ORC 2,
the user can adjust configuration keys for vectorized reading from S3.
For example,
increasing the values of the following configuration keys
(from their default values of `4K` and `1M`) typically results in
fewer S3 requests (such as `s3.GetObject` operations) and larger data sizes per request.

```xml
# terminal-command
vi core-site.xml

<property>
  <name>fs.s3a.vectored.read.min.seek.size</name>
  <value>512K</value>
</property>

<property>
  <name>fs.s3a.vectored.read.max.merged.size</name>
  <value>4M</value>
</property>
```

## Map Vertex stuck in `Initializing`

Sometimes a Map Vertex may get stuck in the state of `Initializing` for a long time
while generating InputSplits in DAGAppMaster.
This usually occurs when DAGAppMaster scans a huge number of input files stored on S3.

```sh
----------------------------------------------------------------------------------------------
        VERTICES      MODE        STATUS  TOTAL  COMPLETED  RUNNING  PENDING  FAILED  KILLED  
----------------------------------------------------------------------------------------------
Map 1                 llap  Initializing     -1          0        0       -1       0       0  
Reducer 2             llap           New      4          0        0        4       0       0  
Reducer 3             llap           New      1          0        0        1       0       0  
```

In such a case, the user can try the following approaches.

* Increase values for `mapreduce.input.fileinputformat.list-status.num-threads`
and `hive.exec.input.listing.max.threads`
(either inside Beeline connections or by restarting HiveServer2).
Here we assume that DAGAppMaster is allocated enough CPU resources.
* Set `hive.exec.orc.split.strategy` to `BI` in `hive-site.xml`
and adjust the value for `fs.s3a.block.size` in `core-site.xml`.
* Merge input files if there are many small input files.


