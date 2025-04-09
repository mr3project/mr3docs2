---
title: Comparison with Hive-LLAP
sidebar_position: 9
---

In conjunction with the ability to execute multiple TaskAttempts concurrently inside a single ContainerWorker,
the support for LLAP I/O makes Hive on MR3 functionally equivalent to Hive-LLAP.
Hence Hive on MR3 can serve as a substitute for Hive-LLAP in typical use cases.
Despite their functional equivalence, however,
Hive on MR3 and Hive-LLAP are fundamentally different in their architecture. 

## Hive on MR3

In the case of Hive on MR3,
a single MR3 DAGAppMaster can execute multiple DAGs concurrently, 
thus eliminating the need for one DAGAppMaster per DAG as in Hive-LLAP (if HiveServer2 runs in shared session mode).
More importantly, the DAGAppMaster has full control over all ContainerWorkers,
thus eliminating the potential performance overhead due to lack of knowledge on their internal states.
For example, the DAGAppMaster never sends more TaskAttempts than a ContainerWorker can accommodate,
which implies that the logic for executing TaskAttempts inside a ContainerWorker is very simple.

![tpcds.red.sequential.total.time](/hadoop/hivemr3.0.2vshivellap/hivemr3.architecture-fs8.png)

## Hive-LLAP

In contrast, Hive-LLAP executes multiple DAGs through an interaction between a group of Tez DAGAppMasters, which are effectively owned by HiveServer2,
and another group of LLAP daemons.
Since DAGAppMasters and LLAP daemons are independent processes (e.g., killing DAGAppMasters does not affect LLAP daemons, and vice versa), 
the interaction between the two groups is inevitably more complex than in Hive on MR3. 
In fact, all individual DAGAppMasters themselves are independent processes and compete for the service provided by LLAP daemons, 
thereby adding another layer of complexity in the architecture. 

![tpcds.red.sequential.total.time](/hadoop/hivemr3.0.2vshivellap/hivellap.architecture.without.zookeeper-fs8.png)

## Advantage of Hive on MR3 

The difference in the architecture leads to distinct characteristics of the two systems. 
Below we highlight the advantage that
the simplicity of the design of Hive on MR3 offers over Hive-LLAP.

### 1. Easier deployment

As it does not require ZooKeeper, Hive on MR3 is **so much** easier to deploy than Hive-LLAP,
whether on Kubernetes or on Hadoop.
In a typical Hadoop cluster, 
the user should be able to install and run Hive on MR3 quickly
if a database server for Metastore is already running.
On Kubernetes, Hive on MR3 is just an ordinary application whose dependencies are all packaged in the Docker image.

### 2. Higher stability and faster execution

The simplicity in the design of Hive on MR3 yields a noticeable difference in performance, especially in highly concurrent environments.

The simplicity also helps us to fix bugs that would not be easy to fix in Hive-LLAP (and Hive on Tez).
For example, Hive-LLAP has a memory leak issue related to HiveConf and UDFClassLoader objects ([HIVE-14430](https://issues.apache.org/jira/browse/HIVE-14430)).
Hive on MR3 shows no such memory leak, as evidenced by the following graph which shows the heap size and the number of loaded classes in HiveServer2 
when a total of 250,000 queries invoking UDFs, each with its own Beeline connection, are submitted over a period of 60 hours.
In the end, HiveServer2 keeps only 13 HiveConf objects.
![hiveserver2.progress](/hadoop/hiveserver2.progress-fs8.png)

### 3. Elastic allocation of cluster resources 

For Hive-LLAP, the administrator user should decide in advance the number of LLAP daemons and their resource usage after taking into account the plan for running the cluster.
Once started, LLAP daemons do not release their resources, which comes with two undesirable consequences:

* When LLAP daemons are idle, their resources cannot be reassigned to busy applications in the same cluster.
* When LLAP daemons are busy, there is no way to exploit idle resources in the cluster.

These problems are particularly relevant to Hive-LLAP because LLAP daemons usually consume very large containers, often the largest containers that Yarn can allocate.
In contrast, Hive on MR3 suffers from no such problems because ContainerWorkers are allocated directly from Yarn:

* In order to release idle ContainerWorkers more often, the user only needs to adjust the value of the configuration key `mr3.container.idle.timeout.ms` in `mr3-site.xml`.
Alternatively the user can just kill idle ContainerWorkers manually.
* When idle resources exist, Hive on MR3 automatically requests more resources on behalf of its ContainerWorkers.

In this way, Hive on MR3 cooperates with existing applications while trying to maximize its own resource usage. 

Another important advantage offered by Hive on MR3 is that the restriction of <i>"exactly one container/daemon per node"</i> is lifted.
In the case of Hive-LLAP, every node in the cluster can host just a single LLAP daemon.
In contrast, Hive on MR3 places no restriction on the number of ContainerWorkers running on each node in the cluster.
For example,
a node can host a single huge ContainerWorker like Hive-LLAP, or many small ContainerWorkers at a finer level of granularity.
In fact, ContainerWorkers can even vary in size (if multiple ContainerGroups are mixed),
and heterogeneous nodes can host different numbers of ContainerWorkers.

This flexibility in allocating ContainerWorkers enables Hive on MR3 to run seamlessly in an environment in which LLAP daemons are impractical to run.
For example,
nodes with less than 24GB of memory (e.g., small instances in public clouds) are perfectly okay for running Hive on MR3.
This is because from the viewpoint of MR3,
running many small ContainerWorkers on a single node is no different from running each small ContainerWorker on its own dedicated node.

![elastic.allocation](/hadoop/elastic.allocation-fs8.png)

### 4. Better support for concurrency 

In Hive-LLAP, the degree of concurrency is limited by the maximum number of Tez DAGAppMasters that can be created at once by Yarn. 
This is because each running query requires a dedicated Tez DAGAppMaster for managing its TaskAttempts.
In practice, the administrator user can impose a hard limit on the number of concurrent queries
by setting the configuration key `hive.server2.tez.sessions.per.default.queue` in `hive-site.xml` to a suitable value. 

In Hive on MR3,
if HiveServer2 runs in shared session mode,
the degree of concurrency is limited only by the amount of memory allocated to a single MR3 DAGAppMaster managing all concurrent queries.
The administrator user may also set the configuration key `mr3.am.max.num.concurrent.dags` in `mr3-site.xml` to specify the maximum number of concurrent queries.
Note that HiveServer2 can also run in individual session mode, in which case the degree of concurrency is limited by the maximum number of MR3 DAGAppMasters like in Hive-LLAP.

In comparison with Hive-LLAP, the use of a single DAGAppMaster brings an advantage to Hive on MR3:
in the presence of many concurrent queries, 
it consumes much less memory for a single MR3 DAGAppMaster than Hive-LLAP consumes for as many Tez DAGAppMasters.
Moreover we observe virtually no performance penalty for sharing a DAGAppMaster for many concurrent queries.
This is because 
the computational load on the DAGAppMaster is proportional not to the number of concurrent queries
but to the total number of active TaskAttempts, which cannot exceed the limit determined by the total cluster resources.

### 5. Support for `hive.server2.enable.doAs=true` 

In principle, Hive on MR3 always allows the user to enable doAs by setting the configuration key `hive.server2.enable.doAs` to true 
because it is just an ordinary application running on top of MR3.
With LLAP I/O in a secure cluster, however, enabling doAs can be a problem 
because the LLAP I/O module caches data across many users with different access privileges. 
This is also the reason why Hive-LLAP disallows setting `hive.server2.enable.doAs` to true.

On the other hand, as long as LLAP I/O is disabled,
Hive on MR3 can safely enable doAs.
Therefore, in environments where 1) LLAP I/O is optional and 2) doAs should be enabled,
Hive on MR3 is a better choice than the only available alternative, namely Hive on Tez. 
In such environments, Hive on MR3 overcomes a well-known limitation of Hive-LLAP.

### 6. Miscellaneous 

* By taking advantage of LocalProcess mode in MR3, HiveServer2 can start a DAGAppMaster outside the Hadoop cluster, e.g., on the same machine where HiveServer2 itself runs. 
This feature is also useful for testing and debugging because the log file of the DAGAppMaster is easily accessible.
* HiveCLI can use LLAP I/O. Note, however, that different instances of HiveCLI do not share the cache for LLAP I/O because each instance maintains its own set of ContainerWorkers.
* On Hadoop, Hive-LLAP usually creates many Tez DAGAppMasters: 
![hive.llap.web](/hadoop/hive-container-list-fs8.png)
In contrast, Hive on MR3 running in shared session mode maintains a single DAGAppMaster: 
![hive.mr3.web](/hadoop/mr3-container-list-fs8.png)
