--- 
title: Concurrent DAGs
sidebar_position: 40
---

## Executing DAGs concurrently

In MR3, a DAGAppMaster in session mode can execute multiple DAGs not only sequentially but also concurrently. 
Here are two examples:

* When a user submits a stream of DAGs to the MR3SessionClient,
the DAGAppMaster can execute one DAG at a time from the incoming stream.
If multiple such users connect to the same MR3SessionClient, the DAGAppMaster executes just as many concurrent DAGs.
* When a user submits many independent DAGs at once to the MR3SessionClient,
the DAGAppMaster can try to start as many DAGs as its configuration allows in order to finish the entire job quickly.

In either case, 
the DAGAppMaster should manages multiple concurrent DAGs, thus partially playing the role of JobTracker in the original Hadoop MapReduce.
The following example shows a DAGAppMaster executing DAGs from four concurrent streams:

![concurrentdag](/mr3/concurrentdag-fs8.png)

## Maximizing cluster utilization/throughput

In conjunction with the use of ContainerGroups, this feature of MR3 helps us to 
minimize both the overhead of launching Yarn containers and the idle period of ContainerWorkers,
thereby maximizing the overall cluster utilization and throughput, especially in a concurrent user environment.
In the presence of a sufficient number of active DAGs, 
ContainerWorkers are unlikely to remain idle even for a short period time
because Vertexes belonging to the same ContainerGroup, whether from the same DAG or from different DAGs, can share ContainerWorkers.
For a long-running DAGAppMaster serving DAGs from many users, 
the overhead of launching Yarn containers effectively disappears. 

In the following experiment, we run 16 clients to submit identical DAGs (which are instances of query 18 in the TPC-DS benchmark) to a DAGAppMaster.
Each client sequentially submits 10 DAGs, so the DAGAppMaster receives a total of 160 identical DAGs.
In the first run, 
no DAGs share the same ContainerGroup and thus no ContainerWorkers are shared across DAGs,
resulting in 4137 ContainerWorkers allocated during the lifetime of the DAGAppMaster.
Each DAG creates approximately 4137 / 160 = 26 ContainerWorkers.

![concurrentdagexp1](/mr3/concurrentdagexp1-fs8.png)

In the second run, all DAGs share the same ContainerGroup and thus all ContainerWorkers are shared,
resulting in only 196 ContainerWorkers allocated during the lifetime of the DAGAppMaster.
The total execution time also decreases from 4056 seconds to 3282 seconds.
The reduction in execution time can be attributed to dispensing with the cost of creating ContainerWorkers.

![concurrentdagexp2](/mr3/concurrentdagexp2-fs8.png)

The maximum number of concurrent DAGs in a DAGAppMaster can be specified with key `mr3.am.max.num.concurrent.dags` in `mr3-site.xml`.
