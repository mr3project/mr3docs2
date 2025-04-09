---
title: Kernel Parameters on Kubernetes
sidebar_position: 200
---

Hive on MR3 on Kubernetes allows the user to 
configure kernel parameters of ContainerWorker Pods using the `sysctl` interface.
Ideally we wish to set kernel parameters directly by exploiting `securityContext` for ContainerWorker Pods,
but the Kubernetes client of MR3 does not support setting `securityContext` yet.
As a workaround,
MR3 creates an **init container** which 
executes the `sysctl` command to configure kernel parameters before starting ContainerWorker.

## Using `sysctl` in init containers

In order to use the `sysctl` interface,
the user should specify kernel parameters of ContainerWorker Pods
with the configuration key `mr3.k8s.pod.worker.security.context.sysctls` in `kubernetes/conf/mr3-site.xml`.
For example,
we can specify new values for `net.core.somaxconn` and `net.ipv4.ip_local_port_range` as follows:

```xml
# terminal-command
vi kubernetes/conf/mr3-site.xml

<property>
  <name>mr3.k8s.pod.worker.security.context.sysctls</name> 
  <value>net.core.somaxconn=16384,net.ipv4.ip_local_port_range='1024 65535'</value>
</property>
```

In addition,
the user should specify the Docker image for init containers 
with the configuration key `mr3.k8s.pod.worker.init.container.image`.
Usually a small Docker image (such as `busybox`) works okay as long as it contains commands `/bin/sh` and `sysctl`.

```xml
# terminal-command
vi kubernetes/conf/mr3-site.xml

<property>
  <name>mr3.k8s.pod.worker.init.container.image</name>
  <value>busybox</value>
</property>
```
If `mr3.k8s.pod.worker.security.context.sysctls` is set to empty, no init container is created.

The user can check kernel parameters inside ContainerWorker Pods.

```sh
# terminal-command
kubectl exec -n hivemr3 -it mr3worker-a576-21 -- sysctl net.core.somaxconn
net.core.somaxconn = 16384
```

## Setting PodSecurityPolicy

The administrator user should use a suitable cluster-level PodSecurityPolicy resource
so that 1) ContainerWorker Pods can create privileged containers 
(because init containers run privileged mode)
and 2) those kernel parameters to be specified with `mr3.k8s.pod.worker.security.context.sysctls` can be overridden.

