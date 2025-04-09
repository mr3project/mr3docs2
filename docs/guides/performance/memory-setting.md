---
title: Memory Settings
sidebar_position: 3
---

## Map joins and output buffers

The following configuration keys are arguably the most important for performance tuning,
especially when running complex queries with heavy joins.

* `hive.auto.convert.join.noconditionaltask.size` in `hive-site.xml`
  specifies the threshold for triggering map joins in Hive. 
  Unlike Apache Hive which internally applies an additional formula to adjust the value specified in `hive-site.xml`,
  Hive on MR3 uses the value with no adjustment.
  Hence the user is advised to choose a value much larger than recommended for Apache Hive.
* `tez.runtime.io.sort.mb` and `tez.runtime.unordered.output.buffer.size-mb` in `tez-site.xml`
  specifies the size of output buffers in Tez.

The following example shows sample values for these configuration keys. 

```xml
# terminal-command
vi conf/hive-site.xml

<property>
  <name>hive.auto.convert.join.noconditionaltask.size</name>
  <value>4000000000</value>
</property>
```

```xml
# terminal-command
vi conf/tez-site.xml

<property>
  <name>tez.runtime.io.sort.mb</name>
  <value>1040</value>
</property>

<property>
  <name>tez.runtime.unordered.output.buffer.size-mb</name>
  <value>307</value>
</property>
```

The default values can be overridden for each individual query inside Beeline connections,
as shown below.

```sh
0: jdbc:hive2://192.168.10.1:9852/> set hive.auto.convert.join.noconditionaltask.size=2000000000;
0: jdbc:hive2://192.168.10.1:9852/> set tez.runtime.io.sort.mb=2000;
0: jdbc:hive2://192.168.10.1:9852/> set tez.runtime.unordered.output.buffer.size-mb=600;
0: jdbc:hive2://192.168.10.1:9852/> !run /home/hive/sample.sql
```

Setting `tez.runtime.io.sort.mb` to a large value may result in `OutOfMemoryError`
when Java VM cannot allocate a contiguous memory segment for the output buffer.

```sh
Caused by: java.lang.OutOfMemoryError: Java heap space
...
org.apache.tez.runtime.library.common.sort.impl.PipelinedSorter.allocateSpace(PipelinedSorter.java:269)
```

In such a case, the user can try a smaller value for `tez.runtime.io.sort.mb`.

## Soft references in Tez

In a cluster with ample memory relative to the number of cores
(e.g., 12GB of memory **per core**),
using soft references for ByteBuffers allocated in PipelinedSorter in Tez can make a noticeable difference.
To be specific,
setting the configuration key `tez.runtime.pipelined.sorter.use.soft.reference` to true in `tez-site.xml` 
creates soft references for ByteBuffers allocated in PipelinedSorter
and allows these references to be reused across all TaskAttempts running in the same ContainerWorker,
thus relieving pressure on the garbage collector.
When the size of memory allocated to each ContainerWorker is small, however,
using soft references is less likely to improve the performance.

```xml
# terminal-command
vi conf/tez-site.xml

<property>
  <name>tez.runtime.pipelined.sorter.use.soft.reference</name>
  <value>true</value>
</property>
```

In the case of using soft references, 
the user should append a Java VM option `SoftRefLRUPolicyMSPerMB` (in milliseconds) for the configuration key `mr3.container.launch.cmd-opts`
in `mr3-site.xml`.
Otherwise ContainerWorkers use the default value of 1000 for `SoftRefLRUPolicyMSPerMB`.
In the following example, we set `SoftRefLRUPolicyMSPerMB` to 25 milliseconds:

```xml
# terminal-command
vi conf/mr3-site.xml

<property>
  <name>mr3.container.launch.cmd-opts</name>
  <value>-XX:+AlwaysPreTouch -Xss512k -XX:+UseG1GC -XX:+UseNUMA -XX:InitiatingHeapOccupancyPercent=40 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=200 -XX:MetaspaceSize=1024m -Djava.net.preferIPv4Stack=true -Dlog4j.configurationFile=k8s-mr3-container-log4j2.properties -Djavax.net.ssl.trustStore=/opt/mr3-run/key/hivemr3-ssl-certificate.jks -Djavax.net.ssl.trustStoreType=jks -XX:SoftRefLRUPolicyMSPerMB=25</value>
</property>
```

