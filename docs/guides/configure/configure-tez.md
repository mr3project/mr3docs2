---
title: Configuring Tez Runtime
sidebar_position: 2
---

The behavior of Tez runtime is specified by the configuration file `tez-site.xml` in the classpath. 
MR3 inherits all configuration keys for Tez runtime from original Tez.
For example, `tez.runtime.io.sort.mb` specifies the amount of memory required for sorting the output.

MR3 also introduces additional configuration keys which are specific to new features of MR3,
and may interpret existing configuration keys in a different way.
Below we describe such configuration keys. 

## Tez

|**Name**|**Default value**|Description|
|--------|:----------------|:----------|
|tez.runtime.pipelined.sorter.use.soft.reference|false|**true**: use soft references for ByteBuffers allocated in PipelinedSorter. These soft references are reused across TaskAttempts running in the same ContainerWorker.  **false**: do not use soft references.| 
|tez.shuffle-vertex-manager.enable.auto-parallel|false|**true**: enable auto parallelism for ShuffleVertexManager.  **false**: disable auto parallelism. For more details, see [Auto Parallelism](../../features/hivemr3/auto-parallelism).|
|tez.shuffle-vertex-manager.auto-parallel.min.num.tasks|20|Minimum number of Tasks to trigger auto parallelism. For example, if the value is set to 20, only those Vertexes with at least 20 Tasks are considered for auto parallelism. The user can effectively disable auto parallelism by setting this configuration key to a large value.|
|tez.shuffle-vertex-manager.auto-parallel.max.reduction.percentage|10|Percentage of Tasks that can be kept after applying auto parallelism. For example, if the value is set to 10, the number of Tasks can be reduced by up to 100 - 10 = 90 percent, thereby leaving 10 percent of Tasks.|
|tez.shuffle-vertex-manager.use-stats-auto-parallelism|false|**true**: analyze input statistics when applying auto parallelism.  **false**: do not use input statistics.|
|tez.shuffle.vertex.manager.auto.parallelism.min.percent|20|Lower limit when normalizing input statistics. For example, if the value is set to 20, input statistics are normalized between 20 and 100. That is, an input size of zero is normalized to 20 while the maximum input size is mapped to 100.|
|tez.runtime.shuffle.speculative.fetch.wait.millis|30000|Elapsed time threshold for a fetcher before triggering speculative fetching.|
|tez.runtime.shuffle.stuck.fetcher.threshold.millis|3000|Elapsed time threshold for a fetcher before triggering backpressure handling and blocking further connections to the shuffle handler.|
|tez.runtime.shuffle.stuck.fetcher.release.millis|15000|Elapsed time threshold after which backpressure handling is lifted, resuming the creation of fetchers that contact the previously blocked shuffle handler.|

|**Name**|**Default value**|Description|
|--------|:----------------|:----------|
|tez.am.shuffle.auxiliary-service.id|mapreduce_shuffle|Service ID for the external shuffle service. Set to `tez_shuffle` to use MR3 shuffle handlers.|
|tez.shuffle.max.threads|0|Number of threads in each shuffle handler. With the default value of zero, each shuffle handler creates twice as many threads as the number of cores.|
|tez.shuffle.port|13563|Default port number for the shuffle handler of MR3|
|tez.runtime.shuffle.connect.timeout|12500|Maximum time in milliseconds for trying to connect to the shuffle service or the built-in shuffle handler before reporting fetch-failures. For more details, see [Fault Tolerance](../../features/mr3/fault-tolerance).|
|tez.shuffle.indexcache.mb|10|Size of path index cache in MB for MR3 shuffle handlers.|
|tez.shuffle.indexcache.share|true|**true**: All MR3 shuffle handlers share path index cache. **false**: Each MR3 shuffle handler uses its own path index cache. Set to false only when the number of shuffle handlers is very large.|
|tez.runtime.use.free.memory.fetched.input|false|**true**: If the size of free memory exceeds the size of memory allocated to a single Task, fetchers use MemoryFetchedInput (for unordered data) and InMemoryMapOutput and (for ordered data) instead of spilling to local disks. **false**: Fetchers do not consider the size of free memory.|
|tez.runtime.shuffle.parallel.copies|20|Maximum number of fetchers per LogicalInput. Note that a RuntimeTask can create several LogicalInputs.|
|tez.runtime.shuffle.total.parallel.copies|40|Maximum number of fetchers per ContainerWorker.|
|tez.runtime.shuffle.fetch.max.task.output.at.once|20|Maximum number of task output files to fetch per fetch request. A large value can cause HTTP 400 errors.|
|tez.runtime.shuffle.max.input.hostports|10000|Maximum number of host-port combinations to cache for shuffling (to prevent memory-leak in public clouds with autoscaling)|
|tez.runtime.shuffle.ranges.scheme|first|**first**: ShuffleServer selects randomly LogicalInput for shuffling. **max** (experimental): ShuffleServer selects LogicalInput with the most number of pending inputs.|
|tez.runtime.optimize.local.fetch.ordered|true|**true**: Ordered data stored on local disks is directly read. **false**: Ordered data stored on local disks is read via fetchers. Set to **false** when using memory-to-memory shuffling.|
|tez.shuffle.skip.verify.request|false|**true**: MR3 shuffle handlers skip checking the validity of shuffle requests. **false**: MR3 shuffle handlers check the validity of shuffle requests.|

## Celeborn

The following configuration keys are effective
when `tez.celeborn.enabled` is set to true and MR3 uses Celeborn as remote shuffle service.
A configuration key of the form `tez.celeborn.XXX.YYY`
is automatically converted to `celeborn.XXX.YYY` and passed to the Celeborn client.

|**Name**|**Default value**|Description|
|--------|:----------------|:----------|
|tez.celeborn.XXX.YYY||Converted to celeborn.XXX.YYY to be read by Celeborn.|
|tez.runtime.celeborn.fetch.split.threshold|1073741824|Maximum size of data (in bytes) that a fetcher can receive from Celeborn workers. The default value is 1GB.|
|tez.runtime.celeborn.unordered.fetch.spill.enabled|true|**true**: Reducers first write the output of mappers on local disks before processing. **false**: Reducers directly process the output of mappers fetched via unordered edges without writing to local disks.|
|tez.runtime.celeborn.client.fetch.throwsFetchFailure|true|**true**: Throw Exceptions and thus triggers Task/Vertex reruns whenever fetch failures occur. **false**: Do not throw Exceptions.|
