---
title: High Availability
sidebar_position: 5
---

:::info
On Kubernetes, 
high availability for HiveServer2 is directly supported by Kubernetes
because we use Deployment to create HiveServer2 Pods.
:::

## High availability for HiveServer2 on Hadoop

In conjunction with service discovery by ZooKeeper,
Hive on MR3 on Hadoop supports high availability which allows multiple HiveServer2 instances to share a common MR3 DAGAppMaster.
As a single MR3 DAGAppMaster serves all HiveServer2 instances, 
all resources in the cluster are fully exploited regardless of which HiveServer2 instances Beeline connections contact.
Moreover running multiple HiveServer2 instances concurrently implies that 
individual HiveServer2 instances are less likely to fail under heavy load. 
Thus high availability of Hive on MR3 enables us to maximize cluster utilization while minimizing the chance of service failure.

![high.availability.share.am](/hadoop/high.availability.share.am-fs8.png)

If high availability is enabled, 
Hive on MR3 maintains a leader HiveServer2 instance which is responsible for checking the status of the Yarn application for the current MR3 DAGAppMaster
and launching a new Yarn application if an error occurs.
After launching a new Yarn application (including the case when the first HiveServer2 instance starts), the leader HiveServer2 instance updates the Yarn ApplicationID in a dedicated ZooKeeper znode.
Then all HiveServer2 instances are notified of the updated Yarn ApplicationID and establish fresh connections to the new MR3 DAGAppMaster.
In the case that the leader HiveServer2 instance crashes, another HiveServer2 instance is elected as new leader by ZooKeeper.
In this way, we ensure that all HiveServer2 instances keep a consistent view of a common MR3 DAGAppMaster.

## Running multiple HiveServer2 instances

As an application of high availability of Hive on MR3, 
we can run multiple HiveServer2 instances, each with its own Metastore, without splitting the cluster.
The additional requirement is that in a secure cluster with Kerberos, all Metastore instances should manage data in the same cluster 
by using the same KDC (Key Distribution Center for Kerberos tickets) and KMS (Key Management Server for delegation tokens).
For example, we cannot import several Metastore instances running in different secure clusters.
Note that since multiple Metastore instances are reachable,
service discovery mode should not be used when running Beeline, i.e., the user should specify the address of the intended HiveServer2 instance manually.

![high.availability.multiple.metastore](/hadoop/high.availability.multiple.metastore-fs8.png)

High availability makes sense only in shared session mode of Hive on MR3.
In individual session mode, each Beeline connection creates its own DAGAppMaster anyway,
so service discovery alone suffices and there is no point in enabling high availability.

