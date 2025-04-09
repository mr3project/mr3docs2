---
title: LLAP I/O
sidebar_position: 15
---

## Configuring LLAP I/O

Hive on MR3 configures LLAP I/O with exactly the same configuration keys that Hive-LLAP uses.

* `hive.llap.io.enabled` specifies whether or not to enable LLAP I/O. If set to true, Hive attaches an MR3 DaemonTask for LLAP I/O to the unique ContainerGroup under the all-in-one scheme
and the Map ContainerGroup under the per-map-reduce scheme.
* `hive.llap.io.memory.size` specifies the size of memory for caching data. 
* `hive.llap.io.threadpool.size` specifies the number of threads for serving requests in LLAP I/O. 
* `hive.llap.client.consistent.splits` should be set to true in order to use consistent hashing of InputSplits (so that the same InputSplit is always mapped to the same ContainerWorker).

Unlike Hive-LLAP, however, the size of the headroom for Java VM overhead (in MB) can be specified explicitly with the configuration key `hive.mr3.llap.headroom.mb` (which is new in Hive on MR3). 
The following diagram shows the memory composition of ContainerWorkers with LLAP I/O under the all-in-one scheme:

![llap.memory](/hadoop/llapmemory-fs8.png)

Note that the heap size of Java VM (for `-Xmx` option) is obtained by multiplying the memory size of all TaskAttempts
(e.g., specified with the configuration key `hive.mr3.all-in-one.containergroup.memory.mb` under the all-in-one scheme)
with a factor specified with the configuration key `hive.mr3.container.max.java.heap.fraction`.

Here are a couple of examples of configuring LLAP I/O when `hive.llap.io.enabled` is set to true.

* `hive.mr3.all-in-one.containergroup.memory.mb=40960`,   
`hive.mr3.container.max.java.heap.fraction=1.0f`,   
`hive.mr3.llap.headroom.mb=8192`,   
`hive.llap.io.memory.size=32Gb`  
Memory for TaskAttempts = 40960MB = 40GB   
ContainerWorker size = 40GB + 8GB + 32GB = 80GB  
Heap size = 40960MB * 1.0 = 40GB   
Memory for Java VM overhead = Headroom size = 8GB 
* `hive.mr3.all-in-one.containergroup.memory.mb=40960`,   
`hive.mr3.container.max.java.heap.fraction=0.8f`,   
`hive.mr3.llap.headroom.mb=0`,   
`hive.llap.io.memory.size=40Gb`   
Memory for TaskAttempts = 40960MB = 40GB   
ContainerWorker size = 40GB + 0GB + 40GB = 80GB  
Heap size = 40960MB * 0.8 = 32GB  
Memory for Java VM overhead = Memory for TaskAttempts - Heap size = 8GB 

Since LLAP I/O in Hive on MR3 does not depend on ZooKeeper, the following configuration keys should be set appropriately in `hive-site.xml` so that no attempt is made to communication with ZooKeeper. 

* `hive.llap.hs2.coordinator.enabled` should be set to false.
* `hive.llap.daemon.service.hosts` should be set to an empty list.  

## Using memory-mapped files for cache

If the configuration key `hive.llap.io.allocator.mmap` is set to true in `hive-site.xml`,
LLAP I/O uses memory-mapped files (instead of memory) to cache data read via `HiveInputFormat`.
The memory-mapped files are created (but not visible to the user) under the directory specified by the configuration key `hive.llap.io.allocator.mmap.path`.

Since LLAP I/O does not consume memory for caching data,
the memory composition of ContainerWorkers with LLAP I/O is slightly different (under the all-in-one scheme).
Essentially the configuration key `hive.llap.io.memory.size` only specifies the size of all memory-mapped files for caching data,
and does not affect the memory size of ContainerWorkers.

![llap.memory.mapped](/hadoop/llapmemory-mapped-fs8.png)

For Hive on MR3 on Kubernetes,
if the configuration key `hive.llap.io.allocator.mmap` is set to true in `hive-site.xml`, 
the user should use the configuration key `hive.llap.io.allocator.mmap.path`
to specify a valid directory inside ContainerWorker Pods for creating memory-mapped files.
Using an existing directory inside ContainerWorker Pods (e.g., `/tmp`) is okay in theory,
but for the sake of performance, the user should find a fast device on worker nodes (e.g., NVMe disk),
mount a directory on it as a hostPath volume in ContainerWorker Pods,
and use the hostPath volume exclusively for LLAP I/O.

As an example,
suppose that the user wants to use a local directory `/nvme/llap` on worker nodes for LLAP I/O.
The user should set the following configuration keys:

* `mr3.k8s.pod.worker.additional.hostpaths` in `mr3-site.xml` should be set to `/nvme/llap`. 
Then MR3 uses the local directory `/nvme/llap` to mount a hostPath volume in every ContainerWorker Pod.
* `hive.llap.io.allocator.mmap.path` in `hive-site.xml` should also be set to `/nvme/llap`.
This is because the hostPath volume is mounted in the same directory `/nvme/llap`. 
Now LLAP I/O effectively uses the local directory `/nvme/llap` on worker nodes for creating memory-mapped files.

## LLAP I/O on Kubernetes

While Hive on MR3 on Kubernetes can exploit LLAP I/O
precisely in the same way as on Hadoop or in standalone mode,
its use of LLAP I/O deserves special attention because the separation of compute and storage makes it highly desirable to enable LLAP I/O.
Note that
if the data source is co-located with compute nodes,
the use of LLAP I/O does not always result in a decrease in the execution time for two reasons:

1. The cache allocated for LLAP I/O is useful only for Map Vertexes and irrelevant to Reduce Vertexes.
Hence, for those queries that read a small amount of input data and spend most of the execution time in Reduce Vertexes, the cache is underutilized.
For such queries, repurposing the cache for running Reduce Tasks would be a much better choice.
2. Depending on the underlying hardware,
reading input data from local disks and transferring over internal network (e.g., reading from NVMe SSDs and transferring over InfiniBand) may be not considerably slower than reading directly from the cache for LLAP I/O.

Thus the memory overhead for LLAP I/O should be traded off against its advantage
only when network and disk access is relatively slow, which is usually the case when running Hive on MR3 on Kubernetes.
In essence, the separation of compute and storage enables us to make the best use of LLAP I/O.

