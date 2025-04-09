--- 
title: ContainerGroup Scheme
sidebar_position: 2
---

Hive on MR3 provides three schemes for assigning ContainerGroups to Vertexes:
**per-vertex**, **per-map-reduce**, and **all-in-one**.

## Per-vertex scheme

Under the per-vertex scheme, each Vertex is assigned its own ContainerGroup. 
The per-vertex scheme is not useful for typical queries because no ContainerWorkers can be shared between Vertexes.

![cg.pervertex](/hadoop/cg.pervertex-fs8.png)

## Per-map-reduce scheme

Under the per-map-reduce scheme, all Map Vertexes are grouped in the Map ContainerGroup
while all Reduce Vertexes are grouped in the Reduce ContainerGroup.
The per-map-reduce scheme can be useful 
because Map Vertexes are usually responsible for reading input data and thus have different runtime characteristics than Reduce Vertexes,
which are responsible primarily for processing intermediate data produced on the fly.
For example, with per-map-reduce scheme, 
Map Vertexes can send all their TaskAttempts to ContainerWorkers with LLAP I/O while Reduce Vertexes execute their TaskAttempts in ordinary ContainerWorkers residing in Yarn containers.

![cg.permapreduce](/hadoop/cg.permapreduce-fs8.png)

## All-in-one scheme

Under the all-in-one scheme, all Vertexes are grouped in a single ContainerGroup.
The all-in-one scheme is an ideal choice in most situations 
because it allows any TaskAttempt to take any ContainerWorker, thereby achieving a uniform utilization across all ContainerWorkers. 
For example, ContainerWorkers are deallocated only if no TaskAttempts (from any Vertex) are ready in the queue in the DAGAppMaster.

![cg.allinone](/hadoop/cg.allinone-fs8.png)

## Specifying the ContainerGroup scheme

The ContainerGroup scheme can be specified with key `hive.mr3.containergroup.scheme` in `hive-site.xml`:
* `per-vertex` for the per-vertex scheme
* `per-map-reduce` for the per-map-reduce scheme
* `all-in-one` for the all-in-one scheme (which is the default scheme) 

Under the per-vertex or per-map-reduce scheme, 
the following four keys specify the resources to be assigned to each ContainerWorker:
* `hive.mr3.map.containergroup.vcores` for CPU cores in a Map ContainerWorker
* `hive.mr3.map.containergroup.memory.mb` for memory (in MB) in a Map ContainerWorker
* `hive.mr3.reduce.containergroup.vcores` for CPU cores in a Reduce ContainerWorker
* `hive.mr3.reduce.containergroup.memory.mb` for memory (in MB) in a Reduce ContainerWorker

Under the all-in-one scheme, 
the following two keys specify the resources to be assigned to each ContainerWorker:
* `hive.mr3.all-in-one.containergroup.vcores` for CPU cores 
* `hive.mr3.all-in-one.containergroup.memory.mb` for memory (in MB)

