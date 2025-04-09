--- 
title: ContainerGroup
sidebar_position: 30
---

## Grouping ContainerWorkers

A ContainerGroup represents a group of ContainerWorkers that share the same characteristics such as Yarn resource, Java options, environment variables, and so on. 
It specifies all the details necessary for starting ContainerWorkers and running TaskAttempts in them.
The basic idea is that every Vertex is associated with a unique ContainerGroup so that
its TaskAttempts can run in any ContainerWorkers belonging to its ContainerGroup.
MR3 further develops this idea by allowing ContainerGroups to be shared by multiple Vertexes and even across DAGs.

In the example shown below, three Vertexes from two DAGs belong to the same ContainerGroup. 
The ContainerGroup has two active ContainerWorkers which are running TaskAttempts originating from its member Vertexes. 
Note that not every Vertex belongs to the same ContainerGroup. 

![containergroup](/mr3/containergroup-fs8.png)

A ContainerGroup specifies the following options/parameters among others for running ContainerWorkers: 

* ContainerWorker mode (either Local or Yarn) 
* Resource in terms of CPU cores and memory
* A boolean flag specifying whether or not to reuse a ContainerWorker. This is typically set to true.  
* A boolean flag specifying whether or not to allow multiple TaskAttempts to run concurrently. 
If this flag is true, multiple TaskAttempts, 
potentially from different Vertexes and even from different DAGs when executing multiple DAGs concurrently, can run concurrently in the same ContainerWorker. 
(In contrast, a container in Tez can run only one TaskAttempt at a time.)

By maintaining ContainerGroups, we simplify the logic for matching TaskAttempts with ContainerWorkers on the fly.
The overall architecture of DAGAppMaster also becomes simpler. 
For example, each ContainerGroup runs its own scheduler for TaskAttempts as well as its own communicator for ContainerWorkers.  

## Executing a single DAG 

For executing a single DAG, we maintain the following invariant: 

* Every Vertex is associated with a unique ContainerGroup. Hence a DAG can use multiple ContainerGroups. 
* Multiple Vertexes in the same DAG may belong to the same ContainerGroup. Hence a ContainerWorker can run TaskAttempts from different Vertexes. 

Every Vertex can be associated with a common ContainerGroup, in which case any TaskAttempt can run in any ContainerWorker.
In the other extreme case, every Vertex can have its own ContainerGroup so that no TaskAttempts from different Vertexes can mix in the same ContainerWorker.

## Executing multiple DAGs

In the context of executing multiple DAGs in the same DAGAppMaster, MR3 allows the following rule:

* A ContainerGroup can be configured to be visible across DAGs, so different DAGs can share a common ContainerGroup.
Such a ContainerGroup is called an open ContainerGroup (in the sense that it is available to any active DAG). 
As a result, a ContainerWorker in MR3 can run TaskAttempts from different DAGs. 

The use of ContainerGroups has an implication that MR3 can incur only a negligible cost of creating ContainerWorkers in a long-running DAGAppMaster.
This is because a ContainerWorker can serve any TaskAttempt from any DAG, thereby maximizing its chance of survival until the DAGAppMaster itself terminates.
For example, if all DAGs use just a single common ContainerGroup in a busy DAGAppMaster, 
ContainerWorkers will be unlikely to terminate prematurely after a long period of idle time.
The benefit is particularly pronounced in concurrent user environments because of the support for executing concurrent DAGs in a DAGAppMaster.

In the following experiment, we sequentially submit a total of 58 DAGs (drawn from the TPC-DS benchmark) to a DAGAppMaster.
In the first run, no DAGs share the same ContainerGroup and thus no ContainerWorkers are reused across DAGs, 
resulting in 9695 ContainerWorkers allocated during the lifetime of the DAGAppMaster.

![containergroupexp1](/mr3/containergroupexp1-fs8.png)

In the second run, all DAGs share a single ContainerGroup, resulting in only 202 ContainerWorkers allocated during the lifetime of the DAGAppMaster.
The total execution time also reduces from 6634 seconds to 4597 seconds.
The reduction in execution time can be attributed to dispensing with the cost of creating ContainerWorkers.

![containergroupexp2](/mr3/containergroupexp2-fs8.png)

