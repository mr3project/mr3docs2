--- 
title: MR3 Shuffle Handler
sidebar_position: 100
---

MR3 provides its own shuffle handler in the runtime system.
A shuffle handler is implemented as a DaemonTask, and ContainerWorkers run their own threads for shuffler handlers.
By virtue of its own shuffle handler, MR3 can run in an environment where an external shuffle service is not available, most notably on Kubernetes.

## Running multiple shuffle handlers

MR3 distinguishes itself from existing execution engines, such as Tez and Spark,
**by allowing a ContainerWorker to run multiple shuffle handlers concurrently.**
In the case of Tez, only a single shuffle handler can run on each node in the cluster,
which implies that all Tez containers on a node share the common shuffle handler.
In the case of Spark, a worker daemon can run only a single shuffle handler.
In contrast, a ContainerWorker of MR3 can run multiple shuffle handlers of its own.

![multiple.shufflehandler](/mr3/multiple-shufflehandler-fs8.png)

The support for multiple shuffle handlers in a single ContainerWorker is an important feature
which, in conjunction with [Speculative Execution](./speculative), enables MR3 to eliminate fetch delays.
For more details, see [Eliminating Fetch Delays](./fetchdelay). 

## Shuffle handlers on Kubernetes

On Kubernetes,
the user can choose to run shuffle handlers in a separate process inside a ContainerWorker Pod.
That is, a ContainerWorker Pod can run two processes: one for ContainerWorker itself and another for shuffle handlers.
The two processes do not share memory at all, thus potentially reducing the frequency of garbage collection.
The memory usage of the process for shuffle handlers does not increase with the number of shuffle handlers,
and usually stays around less than 1GB regardless of the number of shuffle handlers.

![shufflehandler.process.k8s](/mr3/shufflehandler.process.k8s-fs8.png)

