---
title: OutOfMemoryError
sidebar_position: 25
---

The standard solution to `OutOfMemoryError` is to increase the amount of memory
allocated to each mapper, reducer, or ContainerWorker,
or to decrease the size of output buffers in Tez.
If this is not feasible,
the user can try setting the configuration key 
`mr3.container.task.failure.num.sleeps` in `mr3-site.xml`.

## `mr3.container.task.failure.num.sleeps`

The configuration key `mr3.container.task.failure.num.sleeps` specifies the number of times to sleep (15 seconds each)
in a ContainerWorker thread after a TaskAttempt fails.
**For executing batch queries,**
setting it to 1 or higher greatly helps Hive on MR3 to avoid successive query failures due to `OutOfMemoryError`,
especially in a cluster with small memory for the workload.
This is because after the failure of a TaskAttempt, 
a ContainerWorker tries to trigger garbage collection (by allocating an array of 1GB)
and temporarily suspends the thread running the TaskAttempt,
thus making subsequent TaskAttempts much less susceptible to `OutOfMemoryError`.

As an example,
consider an experiment in which we submit query 14 to 18 of the TPC-DS benchmark 12 times on a dataset of 10TB.
We execute a total of 6 * 12 = 72 queries because query 14 consists of two sub-queries.
To each mapper and reducer, 
we allocate 4GB which is too small for the scale factor of the dataset.

* If the configuration key `mr3.container.task.failure.num.sleeps` is set to zero,
query 16 and query 18 fail many times, even with the mechanism of query re-execution of Hive 3.
In the end, only 46 queries out of 72 queries succeed. 
* In contrast, if it is set to 2, query 16 and query 18 seldom fail. 
In the end, 71 queries succeed where only query 18 fails once.

Setting the configuration key `mr3.container.task.failure.num.sleeps` to 1 or higher has a drawback that
executing a query may take longer if some of its TaskAttempts fail.
Two common cases are 1) when the mechanism of query re-execution is triggered and 2) when the mechanism of fault tolerance is triggered.

1. Query re-execution: while the second DAG is running after the failure of the first DAG, 
some threads in ContainerWorkers stay idle, thus delaying the completion of the query.
2. Fault tolerance: if a running TaskAttempt is killed in order to avoid deadlock between Vertexes,
its ContainerWorker resumes accepting new TaskAttempts only after its thread finishes sleeping.

In a cluster with small memory for the workload,
the higher stability far outweighs the occasional penalty of slower execution,
so we recommend setting `mr3.container.task.failure.num.sleeps` to 1 or higher.
In a cluster with plenty of memory for the workload,
setting `mr3.container.task.failure.num.sleeps` to 0 is usually okay.
The default value is 0.

If `mr3.container.task.failure.num.sleeps` is set to 1 or higher with autoscaling enabled,
the user may see DAGAppMaster creating more ContainerWorkers than necessary when TaskAttempts fail.
This is because after a TaskAttempt fails, the ContainerWorker does not become free immediately
and DAGAppMaster tries to reschedule another TaskAttempt by creating a new ContainerWorker.

