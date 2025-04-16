---
title: "On Kubernetes"
sidebar_position: 20
---

The quick start guide for running Hive on MR3 on Kubernetes
[with Kerberos](/docs/quick/k8s/run-k8s/kerberos)
includes instructions for using Kerberos authentication on Kubernetes.
This page provides additional details for reference.

## Requirements

To use Kerberos authentication, the following requirements should be met.

* KDC (Key Distribution Center) for managing Kerberos tickets should be set up by the administrator. 
* If Metastore runs in a secure mode,
its service keytab file should be copied to the directory `kubernetes/key`. 
* If HiveServer2 uses Kerberos authentication,
its service keytab file should be copied to the directory `kubernetes/key`.
* In order to access HDFS in DAGAppMaster and ContainerWorkers,
a user keytab file should be copied to the directory `kubernetes/key`
(for the configuration keys `mr3.keytab` and `mr3.k8s.keytab.mount.file` in `mr3-site.xml`).
**The user keytab file is required only if HDFS is accessed.**
* In order to access encrypted (Kerberized) HDFS,
Hadoop KMS (Key Management Server) should be set up for managing impersonation and delegation tokens.
If encrypted HDFS is part of a secure Hadoop cluster,
the administrator can reuse the existing KMS. 

In general, we need two service keytab files and a user keytab file
for three environment variables in `kubernetes/env.sh`.

![kerberos.keytab.file](/k8s/kerberos.keytab.file-fs8.png)

In practice, it is okay to use a common service keytab file for both Metastore and HiveServer2.
Furthermore it is also okay to use the same service keytab file for HDFS tokens.
Thus the user can use a single service keytab file for running Hive on MR3 on Kubernetes.

## Service principal

The use of Kerberos authentication has an implication that in `kubernetes/env.sh`,
**the service name of the principal in `HIVE_SERVER2_KERBEROS_PRINCIPAL`
should match the user in `DOCKER_USER`.**
For example,
`hive/mr3@PL` is a valid Kerberos service principal
because `DOCKER_USER` is set to `hive` by default.

The two values should match for two reasons.

* DAGAppMaster checks whether HiveServer2 has the right permission
  by comparing 1) the user of DAGAppMaster which is set in `DOCKER_USER`
  and 2) the user of HiveServer2 which is the service name of the principal.
* Shuffle handlers in ContainerWorkers compare the service name of the principal
  against the owner of intermediate files which is set in `DOCKER_USER`.

:::info
DAGAppMaster and ContainerWorkers assume the user in `DOCKER_USER`
because an internal script (`mr3-setup.sh`) sets
the configuration keys `mr3.k8s.pod.master.user` and `mr3.k8s.pod.worker.use`
to the user in `DOCKER_USER`.
:::

The user can disable permission checking in DAGAppMaster
by setting `mr3.am.acls.enabled` to false in `mr3-site.xml`. 
Since DAGAppMaster does not expose its address to the outside,
the security of HiveServer2 is not compromised.


