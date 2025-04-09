---
title: "Performance Tuning"
sidebar_position: 10
---

After getting up and running Hive on MR3, the user may wish to improve its performance by changing configuration parameters.
Because of the sheer number of configuration parameters in Hive, Tez, and MR3, however,
it is out of the question to write a definitive guide to finding an optimal set of configuration parameters.
As a consequence, 
the user should usually embark on a long journey to find a set of configuration parameters suitable for his or her workloads.

Still we can identify a relatively small number of configuration parameters 
that typically have a major and immediate impact on the performance for common workloads.
This section provides performance guides that describe these configuration parameters,
roughly in order of importance. 

:::info
All examples in this section assume Hive on MR3 on Kubernetes executed with shell scripts.
The guides, however, can be readily adapted for other environments.
:::

* [Resource Configuration](./resources)
* [Memory Settings](./memory-setting)
* [Shuffle Configuration](./shuffle)
* [Auto Parallelism](./auto-parallelism)
* [Column Statistics](./metastore)
* [LLAP I/O](./llap-io)
* [Single-table Queries](./tuning-bi-query)
* [`OutOfMemoryError`](./outofmemory)
* [Access to S3](./s3-tuning)
* [Performance Tuning on Kubernetes](./performance-tuning-k8s)
* [Kernel Parameters on Kubernetes](./configure-kernel)

