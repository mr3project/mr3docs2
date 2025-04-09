---
title: "Setting mr3-site.xml"
sidebar_position: 7
---

The configuration keys relevant to Hive on MR3 on Kubernetes
in the file `conf/mr3-site.xml`
are explained in the **Kubernetes** section of [Configuring MR3](../configure/configure-mr3#kubernetes).
Below we provide more details about these configuration keys.

## Set automatically

Hive on MR3 automatically sets the following configuration keys,
so their values in `kubernetes/conf/mr3-site.xml` are ignored.

* `mr3.k8s.namespace`
* `mr3.k8s.pod.master.serviceaccount`
* `mr3.k8s.pod.worker.serviceaccount`
* `mr3.k8s.pod.master.image`
* `mr3.k8s.pod.master.user`
* `mr3.k8s.master.working.dir`
* `mr3.k8s.master.persistentvolumeclaim.mounts`
* `mr3.k8s.pod.worker.image`
* `mr3.k8s.pod.worker.user`
* `mr3.k8s.worker.working.dir`
* `mr3.k8s.worker.persistentvolumeclaim.mounts`
* `mr3.k8s.conf.dir.configmap`
* `mr3.k8s.conf.dir.mount.dir`
* `mr3.k8s.keytab.secret`
* `mr3.k8s.worker.secret`
* `mr3.k8s.mount.keytab.secret`
* `mr3.k8s.mount.worker.secret`
* `mr3.k8s.keytab.mount.dir`
* `mr3.k8s.keytab.mount.file`

## Use default values

For the following configuration keys, their default values in `kubernetes/conf/mr3-site.xml` must be used.

* `mr3.k8s.master.command` (with a default value of `/opt/mr3-run/hive/run-master.sh`)
* `mr3.k8s.worker.command` (with a default value of `/opt/mr3-run/hive/run-worker.sh`)

## Check default values

For the following configuration keys, their default values in `kubernetes/conf/mr3-site.xml` usually suffice,
but the user may need to update their values according to the setting of the Kubernetes cluster.

* `mr3.k8s.api.server.url`
* `mr3.k8s.client.config.file`
* `mr3.k8s.service.account.use.token.ca.cert.path`
* `mr3.k8s.service.account.token.path`
* `mr3.k8s.service.account.token.ca.cert.path`
* `mr3.k8s.nodes.polling.interval.ms`
* `mr3.k8s.pods.polling.interval.ms`
* `mr3.k8s.pod.creation.timeout.ms`
* `mr3.k8s.pod.master.node.selector`
* `mr3.k8s.master.pod.affinity.match.label`. A value `hivemr3_app=hiveserver2` means that the DAGAppMaster Pod is likely to be placed on the same node that hosts a Pod with label `hivemr3_app=hiveserver2`, namely the HiveServer2 Pod. 
* `mr3.k8s.pod.worker.node.selector`

## Override default values when necessary

For the following configuration keys, the user should check their values before starting Hive on MR3.

* `mr3.k8s.pod.image.pull.policy`
* `mr3.k8s.pod.image.pull.secrets`
* `mr3.k8s.host.aliases`

## Local directories

The following configuration keys determine emptyDir and hostPath volumes to be mounted inside DAGAppMaster and ContainerWorker Pods, and thus should be updated for each installation of Hive on MR3.

* `mr3.k8s.pod.master.emptydirs`
* `mr3.k8s.pod.master.hostpaths`
* `mr3.k8s.pod.worker.emptydirs`
* `mr3.k8s.pod.worker.hostpaths`

For both DAGAppMaster and ContainerWorker Pods, emptyDir and hostPath volumes become local directories where intermediate data is written, so at least one such volume should be provided.
For the DAGAppMaster Pod, the following setting is usually okay because DAGAppMaster needs just a single local directory (unless it uses Local mode for ContainerWorkers):

* `mr3.k8s.pod.master.emptydirs` = `/opt/mr3-run/work-local-dir`
* `mr3.k8s.pod.master.hostpaths` is set to empty.

For ContainerWorker Pods, the set of available local directories matters for performance.
If the same set of local disks are mounted on every node in the Kubernetes cluster,
the user can set `mr3.k8s.pod.master.hostpaths` to the list of directories from local disks while leaving `mr3.k8s.pod.worker.emptydirs` to empty.
For example, the following setting is appropriate for a homogeneous Kubernetes cluster in which three local disks are mounted on every node:

* `mr3.k8s.pod.worker.emptydirs` is set to empty
* `mr3.k8s.pod.worker.hostpaths` = `/data1/k8s,/data2/k8s,/data3/k8s`

Note that the user should never use more than one directory from each local disk because it only degrades the performance of writing to local disks.
If no such local disks are attached, `mr3.k8s.pod.worker.hostpaths` should be set to empty and the user should use an emptyDir volume for writing intermediate data, as in:

* `mr3.k8s.pod.worker.emptydirs` = `/opt/mr3-run/work-local-dir`
* `mr3.k8s.pod.worker.hostpaths` is set to empty.

## Tolerations

The user can use the following configuration keys to specify tolerations for DAGAppMaster and ContainerWorker Pods.

* `mr3.k8s.pod.master.toleration.specs`
* `mr3.k8s.pod.worker.toleration.specs`

Their values are a comma-separated list of toleration specifications.
The format of a toleration specification is `[key]:[operator]:[value]:[effect]:[toleration in seconds]`
where `[value]` and `:[toleration in seconds]` are optional.
Here are a few valid examples:
`hello:Equal:world:NoSchedule`, 
`hello:Exists::NoSchedule`,
`hello:Equal:world:NoExecute:300`,
`hello:Exists::NoExecute:300`.

Note that a wrong specification fails the creation of DAGAppMaster Pod or ContainerWorker Pods,
so the user should check the validity of every toleration specification before running HiveServer2.
For example, `foo:Equal::NoSchedule` is a wrong specification
because `[value]` must be empty when `[operator]` is `Exists`.
(Cf. `foo:Equal::NoSchedule` is okay.)

