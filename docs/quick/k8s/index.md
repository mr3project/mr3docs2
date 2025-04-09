---
title: "On Kubernetes"
sidebar_position: 6
---

With MR3 as the execution engine,
the user can run Hive directly on Kubernetes without installing Hadoop.
All the enterprise features of Apache Hive are equally available,
such as high availability, Kerberos authentication, SSL data encryption, and authorization with Apache Ranger.
On public clouds, Hive on MR3 can take advantage of autoscaling supported by MR3.

A Kubernetes cluster created with Hive on MR3 consists of the following components:

* Key components of Hive on MR3 -- Metastore, HiveServer2, MR3 DAGAppMaster, and MR3 ContainerWorkers
* Apache Ranger for managing authorization
* MR3-UI and Grafana for visualization

We assume some familiarity with key concepts in Kubernetes such as Pods, Containers, Volumes, ConfigMaps, and Secrets.
Proceed to the following guides:

* [Shell Scripts](./run-k8s)
  shows how to run Hive on MR3 on Kubernetes using executable shell scripts.
* [Helm](./run-helm-k8s) 
  shows how to run Hive on MR3 on Kubernetes using Helm.
* [TypeScript](./typescript) shows how to use TypeScript code
  to run Hive on MR3 on Kubernetes, along with Ranger, MR3-UI, Grafana, Superset.
* [Common Procedures](./common) contains additional procedures related to compaction and security in Hive on MR3.

:::info
To try without installing additional dependencies, use executable shell scripts.

Helm reduces the complexity of setting configuration parameters to some extent.

TypeScript code reads a configuration file written in TypeScript
to generate a single YAML file containing the entire specification
for running Hive on MR3.
**It significantly reduces the complexity of setting configuration parameters**
because all configuration parameters in the output YAML file
are set consistently across all the components.
There is no need to be familiar with TypeScript.
:::

:::tip
Before trying to run Hive on MR3 on Kubernetes,
check if swap space is disabled in the Kubernetes cluster.
:::

