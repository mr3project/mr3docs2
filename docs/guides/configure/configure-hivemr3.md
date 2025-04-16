---
title: Configuring Hive on MR3
sidebar_position: 3
---

The behavior of Hive on MR3 is specified by the configuration file `hive-site.xml` in the classpath.
Below we describe configuration keys relevant to Hive on MR3.

|**Name**|**Default value**|Description|
|--------|:----------------|:----------|
|hive.execution.engine|tez|Should be set to **tez** to use MR3 as the execution engine.|
|hive.execution.mode|container|Hive on MR3 supports both **container** or **llap**. Use **container** for stable execution and **llap** for fast execution.|
|hive.mr3.application.name.prefix|hive-mr3|Prefix of MR3 application names|
|hive.mr3.client.connect.timeout|60000ms|Timeout for Hive on MR3 to establish connection to MR3 DAGAppMaster|
|hive.mr3.resource.vcores.divisor|1|Divisor for the number of cores. Legitimate values are integers between 1 to 1000 (inclusive). Affects the interpretation of the following configuration keys: `hive.mr3.map.task.vcores`, `hive.mr3.reduce.task.vcores`, `hive.mr3.all-in-one.containergroup.vcores`, `hive.mr3.map.containergroup.vcores`, `hive.mr3.reduce.containergroup.vcores`, `hive.mr3.llap.daemon.task.vcores`. Example: if `hive.mr3.resource.vcores.divisor` is set to 1000, a value of 1 is interpreted as a 1000-th of a core.|
|hive.mr3.map.task.memory.mb|-1|Memory in MB allocated to each mapper. If set to -1, Hive on MR3 reads `MRJobConfig.MAP_MEMORY_MB`. Can be set to 0 (but not recommended).|
|hive.mr3.reduce.task.memory.mb|-1| Memory in MB allocated to each reducer. If set to -1, Hive on MR3 reads `MRJobConfig.REDUCE_MEMORY_MB`. Can be set to 0 (but not recommended).|
|hive.mr3.map.task.vcores|-1|Number of cores allocated to each mapper. If set to -1, Hive on MR3 reads `MRJobConfig.MAP_CPU_VCORES`. Can be set to 0 (which can be convenient in some cases).|
|hive.mr3.reduce.task.vcores|-1|Number of cores allocated to each reducer. If set to -1, Hive on MR3 reads `MRJobConfig.REDUCE_CPU_VCORES`. Can be set to 0 (which can be convenient in some cases).|
|hive.mr3.dag.queue.capacity.specs||Specifications for capacity scheduling in MR3. Effective only if set to a non-empty string. Corresponds to `mr3.dag.queue.capacity.specs` in `mr3-site.xml`.|
|hive.mr3.dag.queue.name|default|Name of the Task queue for queries. Used with capacity scheduling in MR3. Corresponds to `mr3.dag.queue.name` in `mr3-site.xml` and can be set for individual queries.|
|hive.mr3.dag.include.indeterminate.vertex|false|**true**: The DAG contains indeterminate Vertexes whose output can vary at each execution. Fault tolerance is not supported when fetch failures occur. **false**: The DAG contains no indeterminate Vertexes. Corresponds to `mr3.dag.include.indeterminate.vertex` in `mr3-site.xml` and can be set for individual queries. If set to true, set `hive.mr3.am.task.max.failed.attempts` to 1.|
|hive.mr3.container.max.java.heap.fraction|0.8|Fraction of task memory to be used as Java heap. Fixed at the time of creating each MR3Session. Corresponds to `mr3.container.max.java.heap.fraction` in `mr3-site.xml`.|
|hive.mr3.containergroup.scheme|all-in-one|ContainerGroup scheme: **all-in-one**, **per-map-reduce**, or **per-vertex**. For more details, see [ContainerGroup Scheme](/docs/features/hivemr3/containergroup-scheme).|
|hive.mr3.container.env||Environment string for ContainerGroups|
|hive.mr3.container.java.opts||Java options for ContainerGroups. This key takes precedence over `MR3Conf.MR3_CONTAINER_LAUNCH_CMD_OPTS` (`mr3.container.launch.cmd-opts`) in `mr3-site.xml`.|
|hive.mr3.container.stop.cross.dag.reuse|false|**true**: stop cross-DAG container reuse for ContainerGroups.  **false**: continue cross-DAG container reuse for ContainerGroups. Corresponds to `mr3.container.stop.cross.dag.reuse` in `mr3-site.xml` and can be set for individual queries.|
|hive.mr3.container.reuse|true|**true**: allow container reuse for running different tasks.  **false**: do not allow container reuse. Corresponds to `mr3.container.reuse` in `mr3-site.xml`.|
|hive.mr3.container.combine.taskattempts|true|**true**: allow multiple concurrent tasks in the same container.  **false**: do not allow multiple concurrent tasks in the same container. Corresponds to `mr3.container.combine.taskattempts` in `mr3-site.xml`.|
|hive.mr3.container.mix.taskattempts|true|**true**: allow concurrent tasks from different DAGs in the same container.  **false**: do not allow concurrent tasks from different DAGs in the same container. Corresponds to `mr3.container.mix.taskattempts` in `mr3-site.xml`.|
|hive.mr3.container.max.num.workers|Int.MaxValue|Max number of containers that can be created by a ContainerGroup. Corresponds to `mr3.container.max.num.workers` in `mr3-site.xml`.|
|hive.mr3.container.use.per.query.cache|true|**true**: use per-query cache shared by all tasks in the same container. **false**: do not use.|
|hive.mr3.all-in-one.containergroup.memory.mb|-1|Memory in MB allocated to each ContainerGroup under all-in-one scheme. If set to 0 or lower, reset to a default value of 1024.|
|hive.mr3.all-in-one.containergroup.vcores|-1|Number of cores allocated to each ContainerGroup under all-in-one scheme. If set to 0 or lower, reset to a default value of 1.|
|hive.mr3.map.containergroup.memory.mb|-1|Memory in MB allocated to each mapper ContainerGroup under per-map-reduce or per-vertex scheme. If set to -1, Hive on MR3 reads `MRJobConfig.MAP_MEMORY_MB`. Can be set to 0 (but not recommended).|
|hive.mr3.reduce.containergroup.memory.mb|-1|Memory in MB allocated to each reducer ContainerGroup under per-map-reduce or per-vertex scheme. If set to -1, Hive on MR3 reads `MRJobConfig.REDUCE_MEMORY_MB`. Can be set to 0 (but not recommended).|
|hive.mr3.map.containergroup.vcores|-1|Number of cores allocated to each mapper ContainerGroup under per-map-reduce or per-vertex scheme. If set to -1, Hive on MR3 reads `MRJobConfig.MAP_CPU_VCORES`. Can be set to 0 (but not recommended).|
|hive.mr3.reduce.containergroup.vcores|-1|Number of cores allocated to each reducer ContainerGroup under per-map-reduce or per-vertex scheme. If set to -1, Hive on MR3 reads `MRJobConfig.REDUCE_CPU_VCORES`. Can be set to 0 (but not recommended).|
|hive.mr3.exec.print.summary|false|**true**: display breakdown of execution steps for every query.  **false**: do not display.| 
|hive.llap.io.enabled|false|**true**: use LLAP I/O.  **false**: do not use LLAP I/O.|
|hive.mr3.llap.headroom.mb|1024|Memory in MB allocated to the headroom for Java VM overhead when LLAP I/O is enabled|
|hive.mr3.llap.daemon.task.memory.mb|0|Memory in MB allocated to a DaemonTaskAttempt for LLAP I/O|
|hive.mr3.llap.daemon.task.vcores|0|Number of cores allocated to a DaemonTaskAttempt for LLAP I/O|
|hive.mr3.llap.orc.memory.per.thread.mb|1024|Memory in MB allocated to each ORC manager in low-level LLAP I/O threads|
|hive.mr3.exec.inplace.progress|true|**true**: update execution progress in-place in the terminal.  **false**: do not update.|
|hive.mr3.use.daemon.shufflehandler|0|Number of shuffle handlers in each ContainerWorker. Corresponds to `mr3.use.daemon.shufflehandler` in `mr3-site.xml`.|
|hive.server2.mr3.share.session|false|**true**: run HiveServer2 in shared session mode.  **false**: run HiveServer2 in individual session mode. For more details, see [HiveServer2 Modes](/docs/features/hivemr3/hiveserver2).|
|hive.mr3.mapjoin.interrupt.check.interval|100000L|Interval (in terms of the number of entries) at which HashTableLoader checks the interrupt state|
|hive.mr3.dag.additional.credentials.source||Comma-separated list of additional paths for obtaining credentials. If a query has no input files (e.g., when creating a fresh table or inserting values to an existing table), HDFS tokens may empty. In such a case, the user can provide additional paths for obtaining credentials so that the query can be executed with proper HDFS tokens.|
|hive.mr3.localize.session.jars|true|**true**: localize `hive-exec.jar` as a local resource.  **false**: do not localize `hive-exec.jar` (for Hive on Kubernetes).|
|hive.mr3.aux.jars||Comma-separated list of additional jar files to include as initial session resoures|
|hive.mr3.am.task.max.failed.attempts|3|Maximum number of attempts for each Task. Corresponds to `mr3.am.task.max.failed.attempts` in `mr3-site.xml` and can be set for individual queries.|
|hive.mr3.delete.vertex.local.directory|false|**true**: delete the directory for intermediate data of a Vertex when all its destination Vertexes are completed.  **false**: do not delete. Corresponds to `mr3.am.notify.destination.vertex.complete` in `mr3-site.xml` and can be set for individual queries.|
|hive.mr3.am.task.concurrent.run.threshold.percent|100|Percentage of Tasks that are completed before starting speculative execution. Can be set to an integer between 1 and 100. Setting to 100 disables speculative execution of TaskAttempts. Corresponds to `mr3.am.task.concurrent.run.threshold.percent` in `mr3-site.xml` and can be set for individual queries.|
|hive.mr3.zookeeper.appid.namespace|mr3AppId|ZooKeeper namespace for sharing Application ID|
|hive.tez.llap.min.reducer.per.executor|0.2|Fraction of the number of Tasks to use for Reducers.|
|hive.mr3.compaction.using.mr3|false|**true**: perform compaction using MR3. High Availability should be enabled.  **false**: perform compaction using MapReduce.|
|hive.mr3.session.config.remove.prefixes||Comma-separated list of key prefixes to remove from JobConf to be passed to MR3 sessions|
|hive.mr3.dag.config.remove.prefixes||Comma-separated list of key prefixes to remove from JobConf to be passed to MR3 DAGs|

