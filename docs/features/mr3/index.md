---
title: "MR3 Features"
sidebar_position: 1
---

In this section, we describe the major features of MR3 as an execution engine.
Most of 
these features are unique to MR3 and not found in its predecessor MapReduce/Tez.
One can try these features by changing configuration parameters in `mr3-site.xml`.

Below 
we assume some familiarity with such notions as DAG, Vertex, Task, and TaskAttempt.
For clarity, we refer to a client program of MR3 as **MR3Client**,
the main coordinator process of MR3 as **DAGAppMaster**,
and worker processes of MR3 as **ContainerWorkers**.

* [MR3Client](./client)
* [DAGAppMaster and ContainerWorker Modes](./master-worker-mode)
* [MR3Client Inside/Outside Kubernetes](./mr3client-outside-k8s)
* [ContainerGroup](./containergroup)
* [Concurrent DAGs](./concurrent-dags)
* [DaemonTask](./daemontask)
* [DAG/Task Scheduling](./dag-scheduling)
* [Worker Scheduling](./recycle-worker)
* [Fault Tolerance](./fault-tolerance)
* [Speculative Execution](./speculative)
* [Autoscaling](./autoscaling)
* [MR3 Shuffle Handler](./shufflehandler)
* [Managing Fetchers](./shuffleserver)
* [Eliminating Fetch Delays](./fetchdelay)
* [Backpressure Handling](./backpressure)
* [Node Blacklisting](./blacklisting)
* [Remote Shuffle Service](./celeborn)

