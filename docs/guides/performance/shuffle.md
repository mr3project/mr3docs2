---
title: Shuffle Configuration
sidebar_position: 4
---

The performance of Hive on MR3 is heavily influenced by its shuffle configuration.
The key components involved in shuffling are: 1) ShuffleServer and 2) shuffle handlers.

:::info
ShuffleServer manages fetchers that send fetch requests **to remote ContainerWorkers**,
whereas shuffle handlers provides a shuffle service
by managing fetch requests **from remote ContainerWorkers**.
:::

## Configuring ShuffleServer

Hive on MR3 centralizes the management of all fetchers under a common ShuffleServer
(see [Managing Fetchers](../../features/mr3/shuffleserver)).

![mr3.tez.shuffle.new](/mr3/mr3.tez.shuffle.new-fs8.png)

After choosing the resources for ContainerWorkers and the concurrency level,
the user should adjust two configuration keys in `tez-site.xml`.

* `tez.runtime.shuffle.parallel.copies` specifies
the maximum number of concurrent fetchers that a single LogicalInput can request.
* `tez.runtime.shuffle.total.parallel.copies` specifies
the maximum number of concurrent fetchers that can run inside a ContainerWorker.

:::tip
We recommend starting with the following settings:

* `tez.runtime.shuffle.parallel.copies` to 10
* `tez.runtime.shuffle.total.parallel.copies` to 10 * the total number of cores assigned to each ContainerWorker
:::

## Using MR3 shuffle handlers

By default, Hive on MR3 uses MR3 shuffle handlers instead of an external shuffle service.
The following configuration keys in `mr3-site.xml` and `tez-site.xml`
enable the runtime system of MR3 to route intermediate data to MR3 shuffle handlers.

* `mr3.use.daemon.shufflehandler` in `mr3-site.xml` specifies the number of shuffle handlers in each ContainerWorker.
If its value is greater than zero,
a ContainerWorker creates its own threads for shuffle handlers.
If it is set to zero, no shuffle handlers are created
and MR3 uses an external shuffle service.
* `tez.am.shuffle.auxiliary-service.id` in `tez-site.xml`
should be set to `tez_shuffle` in order to use MR3 shuffle handlers.
On Hadoop,
it can be set to `mapreduce_shuffle` to use the Hadoop shuffle service.

The following configuration keys in `tez-site.xml` control the behavior of shuffle handlers.
Note that

|**Name**|**Default value**|Description|
|--------|:----------------|:----------|
|tez.shuffle.connection-keep-alive.enable|false|**true**: keep connections alive for reuse. **false**: do not reuse|
|**tez.shuffle.max.threads**|0|Number of threads for each shuffle handler. The default value of 0 sets the number of threads to 2 * the number of cores.|
|tez.shuffle.listen.queue.size|128|Size of the listening queue. Can be set to the value in `/proc/sys/net/core/somaxconn`.|
|tez.shuffle.port|13563|port number for shuffle handlers. If a ContainerWorker fails to secure a port number for a shuffle handler, it chooses a random port number instead.|
|tez.shuffle.mapoutput-info.meta.cache.size|1000|Size of meta data of the output of mappers|

Running too many shuffle handlers or creating too many threads per shuffle handler
can negatively impact performance on ContainerWorkers with limited resources.
Hence
the user may have to adjust the value for `tez.shuffle.max.threads` in order to limit the total number of threads for shuffle handlers.
For example, on a node with 40 cores,
setting `tez.shuffle.max.threads` to the default value of 0
creates 2 * 40 = 80 threads for each shuffle handler.
If `mr3.use.daemon.shufflehandler` is set to 20, a ContainerWorker creates a total of 80 * 20 = 1600 threads for shuffle handlers, which may be excessive.

:::info
`hive.mr3.use.daemon.shufflehandler` in `hive-site.xml`
is mapped to `mr3.use.daemon.shufflehandler` in `mr3-site.xml`.
:::
:::tip
We recommend starting with the following settings:

* `tez.shuffle.max.threads` to 20
* `hive.mr3.use.daemon.shufflehandler` to the total number of cores assigned to each ContainerWorker / 2
:::

## Local disks

ContainerWorkers write intermediate data on local disks,
so using fast storage for local disks (such as NVMe SSDs) always improves shuffle performance.
Using multiple local disks is also preferable to using just a single local disk
because Hive on MR3 rotates local disks when creating files for storing intermediate data.

## Compressing intermediate data

Compressing intermediate data usually results in better shuffle performance.
The user can compress intermediate data by setting the following two configuration keys in `tez-site.xml`.

* `tez.runtime.compress` should be set to true.
* `tez.runtime.compress.codec` should be set to the codec for compressing intermediate data.

By default, `tez.runtime.compress.codec` is set to `org.apache.hadoop.io.compress.SnappyCodec` in `tez-site.xml`.
On Hadoop, the Snappy library should be manually installed on every node.
On Kubernetes and in standalone mode,
the Snappy library is already included in the MR3 release.

:::info
The user can also use Zstandard compression
after installing the Zstandard library and setting `tez.runtime.compress.codec` to
`org.apache.hadoop.io.compress.ZStandardCodec`.
Note, however, that a query may fail if it generates large intermediate files (e.g., over 25MB).
:::

## Configuring kernel parameters

A common solution to reduce the chance of [fetch delays](../../features/mr3/fetchdelay) is to adjust a few kernel parameters to prevent packet drops.
For example, the user can adjust the following kernel parameters on every node in the cluster:

* increase the value of `net.core.somaxconn` (e.g., from the default value of 128 to 16384)
* optionally increase the value of `net.ipv4.tcp_max_syn_backlog` (e.g., to 65536)
* optionally decrease the value of `net.ipv4.tcp_fin_timeout` (e.g., to 30)

Unfortunately configuring kernel parameters is only a partial solution
which does not eliminate fetch delays completely.
This is because if the application program is slow in processing connection requests,
TCP listen queues eventually become full and fetch delays ensue.
In other words, without optimizing the application program itself,
we can never eliminate fetch delays by adjusting kernel parameters alone.

## Configuring network interfaces

The node configuration for network interfaces also affects the chance of fetch delays.
For example, frequent fetch delays due to packet loss may occur
if the scatter-gather feature is enabled on network interfaces on worker nodes.

```sh
# terminal-command
ethtool -k p1p1
...
scatter-gather: on
  tx-scatter-gather: on
  tx-scatter-gather-fraglist: off [fixed]
```

In such a case, the user can disable relevant features on network interfaces.

```sh
# terminal-command
ethtool -K p1p1 sg off
```

## Preventing fetch delays

If fetch delays occur frequently,
the user can try two features of MR3:
[running multiple shuffle handlers in a ContainerWorker](../../features/mr3/shufflehandler)
and [speculative execution](../../features/mr3/speculative).

:::tip
To check for fetch delays,
disable the query results cache by setting
the configuration key `hive.query.results.cache.enabled` to false,
and run a shuffle-heavy query many times.
If the execution time is unstable and fluctuates significantly, fetch delays are likely the cause.
:::

To enable speculative execution,
set the configuration key `hive.mr3.am.task.concurrent.run.threshold.percent` in `hive-site.xml` to the percentage of completed Tasks
before starting to watch TaskAttempts for speculative execution.
The user should also set the configuration key `hive.mr3.am.task.max.failed.attempts` to the maximum number of TaskAttempts for the same Task.
In the following example,
a ContainerWorker waits until 95 percent of Tasks complete before starting to watch TaskAttempts,
and create up to 3 TaskAttempts for the same Task.

```xml
# terminal-command
vi conf/hive-site.xml

<property>
  <name>hive.mr3.am.task.concurrent.run.threshold.percent</name>
  <value>95</value>
</property>

<property>
  <name>hive.mr3.am.task.max.failed.attempts</name>
  <value>3</value>
</property>
```

## Using free memory to store shuffle input

Hive on MR3 can utilize memory to store shuffle data transmitted from mappers to reducers.
If a ContainerWorker runs multiple Tasks concurrently,
a Task may find free memory in the Java heap
even after exhausting the entire memory allocated to it.
The configuration key `tez.runtime.use.free.memory.fetched.input`
(which is set to true in the MR3 release)
controls whether or not to use such free memory to store shuffle data.
Setting it to true can significantly reduce the execution time of a query if:

1. Multiple Tasks can run concurrently in a ContainerWorker
(e.g., 18 Tasks in a single ContainerWorker).
2. The query produces more shuffle data than can be accommodated in memory.
3. Local disks use slow storage (such as HDDs).

The following log of HiveServer2 shows that during the execution of a query,
689,693,191 bytes of shuffle data are stored in memory,
with no data being written to local disks.
(63,312,923 bytes of data are read directly from local disks
because mappers and reducers are collocated.)

```sh
2023-12-15T06:59:16,028  INFO [HiveServer2-Background-Pool: Thread-84] mr3.MR3Task:    SHUFFLE_BYTES_TO_MEM: 689693191
2023-12-15T06:59:16,028  INFO [HiveServer2-Background-Pool: Thread-84] mr3.MR3Task:    SHUFFLE_BYTES_TO_DISK: 0
2023-12-15T06:59:16,028  INFO [HiveServer2-Background-Pool: Thread-84] mr3.MR3Task:    SHUFFLE_BYTES_DISK_DIRECT: 63312923
```

Depending on the amount of shuffle data and the size of memory allocated to individual Tasks,
Hive on MR3 may write shuffle data to local disks.
In the following example,
10,475,065,599 bytes of shuffle data are written to local disks.

```sh
2023-12-15T07:09:57,472  INFO [HiveServer2-Background-Pool: Thread-99] mr3.MR3Task:    SHUFFLE_BYTES_TO_MEM: 142177894794
2023-12-15T07:09:57,472  INFO [HiveServer2-Background-Pool: Thread-99] mr3.MR3Task:    SHUFFLE_BYTES_TO_DISK: 10475065599
2023-12-15T07:09:57,472  INFO [HiveServer2-Background-Pool: Thread-99] mr3.MR3Task:    SHUFFLE_BYTES_DISK_DIRECT: 13894557846
```

## Memory-to-memory merging vs disk-based merging for ordered records

By default,
Hive on MR3 performs memory-to-memory merging
to merge ordered records shuffled from upstream vertices.

```xml
# terminal-command
vi tez-site.xml

<property>
  <name>tez.runtime.optimize.local.fetch.ordered</name>
  <value>false</value>
</property>

<property>
  <name>tez.runtime.shuffle.memory-to-memory.enable</name>
  <value>true</value>
</property>
```

If the number of ordered records to be merged in each reducer is huge,
disk-based merging can be more effective.
To switch to disk-based merging, make the following changes in `tez-site.xml`.

* set `tez.runtime.optimize.local.fetch.ordered` to true
* set `tez.runtime.shuffle.memory-to-memory.enable` to false

## Pipelined shuffling

For a vertex producing ordered records,
Hive on MR3 performs merging before shuffling to downstream vertices.
While the default behavior is usually optimal for shuffle-intensive queries,
it may not be the best choice for single-table queries.
The user can disable the default behavior and try pipelined shuffling instead
with the following changes in `tez-site.xml`.

* set `tez.runtime.pipelined-shuffle.enabled` to true
* set `tez.runtime.enable.final-merge.in.output` to false

To use pipelined shuffling, the user should **disable speculative execution**
to avoid launching multiple concurrent TaskAttempts for the same Task.
This is because partial results from separate TaskAttempts cannot be mixed
in downstream TaskAttempts.
(A downstream TaskAttempt kills itself whenever it receives partial results
from different upstream TaskAttempts.)

* set `hive.mr3.am.task.concurrent.run.threshold.percent` to 100 in `hive-site.xml`
to disable speculative execution

:::tip
Since pipelined shuffling is not safe to use with speculative execution,
try pipelined shuffling only for time-critical queries
where minimizing execution time is essential
(e.g., when even a 5 percent reduction in execution time makes a difference)
and check if it is effective.
In particular,
do not use pipelined shuffling for long-running batch queries.
:::

## `tez.runtime.shuffle.connect.timeout` in `tez-site.xml`

The configuration key `tez.runtime.shuffle.connect.timeout` specifies
the maximum time (in milliseconds) for trying to connect to an external shuffle service
or built-in shuffle handlers before reporting fetch-failures.
(See [Fault Tolerance](../../features/mr3/fault-tolerance/) for a few examples.)
With the default value of 12500,
a TaskAttempt retries up to twice following the first attempt, each after waiting for 5 seconds. 

If the connection fails too often
because of the contention for disk access or network congestion, 
using a large value for `tez.runtime.shuffle.connect.timeout` may be a good decision
because it leads to more retries, thus decreasing the chance of fetch-failures. 
(If the connection fails because of hardware problems,
fetch-failures are eventually reported regardless of the value of `tez.runtime.shuffle.connect.timeout`.)
On the other hand,
using too large a value may delay reports of fetch-failures much longer than Task/Vertex reruns take,
thus significantly increasing the execution time of the query. 
Hence the user should choose an appropriate value that
triggers Task/Vertex reruns reasonably fast. 

## Running shuffle handlers in a separate process (on Kubernetes)

Depending on resources allocated to each mapper, reducer, and ContainerWorker,
it may help to run shuffle handlers in a separate process inside the ContainerWorker Pod.
For more details,
see [MR3 Shuffle Handler](../../features/mr3/shufflehandler).

In order to run shuffle handlers in a separate process,
the user should set three configuration keys in `mr3-site.xml`.

* Set `mr3.use.daemon.shufflehandler` to zero.
Then the process for ContainerWorker itself does not create threads for shuffle handlers,
and a separate process for shuffle handlers is created.
* Set `mr3.k8s.shuffle.process.ports` to a comma-separated list of port numbers.
Then MR3 creates a shuffle handler for each port number in the separate process for shuffle handlers.
For example, if it is set to `15500,15510,15520,15530,15540`, MR3 creates 5 shuffle handlers with port number 15500 to 15540.
* Set `mr3.k8s.shufflehandler.process.memory.mb` to the size of memory in MB for the process for shuffle handlers. The default value is 1024.

:::tip
Recall that `hive.mr3.use.daemon.shufflehandler` in `hive-site.xml`
overrides `mr3.use.daemon.shufflehandler` in `mr3-site.xml`.
:::

The port numbers specified by the configuration key `mr3.k8s.shuffle.process.ports`
should not conflict with those already in use inside a ContainerWorker Pod.
Usually port numbers in the range of 10000 and above are safe to use.
Since every ContainerWorker Pod is assigned a unique IP address, no conflict arises between different ContainerWorker Pods,
whether they run on the same physical node or not.

