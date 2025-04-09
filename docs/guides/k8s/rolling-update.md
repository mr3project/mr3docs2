---
title: Performing Rolling Updates
sidebar_position: 40
---

Hive on MR3 allows the user to perform rolling updates of HiveServer2, DAGAppMaster, and ContainerWorker Pods.
By performing rolling updates,
the user does not have to terminate an active instance of Hive on MR3
when a new Docker image is available.

## Setting the image pull policy

In order to perform rolling updates of DAGAppMaster and ContainerWorker Pods,
the user should make sure that the configuration key `mr3.k8s.pod.image.pull.policy` in `conf/mr3-site.xml` 
is set to `Always` so that new Pods created after an update uses the most recent Docker image.

```xml
# terminal-command
vi conf/mr3-site.xml

<property>
  <name>mr3.k8s.pod.image.pull.policy</name>
  <value>Always</value>
</property>
```

For HiveServer2 Pod, the user should set the field `spec.template.spec.containers.imagePullPolicy` to `Always`
in `yaml/hive.yaml`.

```yaml
# terminal-command
vi yaml/hive.yaml

spec:
  template:
    spec:
      containers:
        imagePullPolicy: Always
```

A naive approach is just to delete running Pods. 
This actually works well in most situations
thanks to the fault-tolerance and recovery mechanism of MR3.
The downside is that all queries in the middle of execution may experience a brief delay,
or even fail if DAGAppMaster Pod is deleted.
In production environments where no queries should be interrupted,
we instead recommend the user to use MasterControl to stop DAGAppMaster and ContainerWorker Pods gracefully.

Below we demonstrate how to perform rolling updates with MasterControl. 

## Updating ContainerWorker Pods with MasterControl

First obtain the ApplicationID from the log file for HiveServer2 (outside Kubernetes).

```sh
# terminal-command
kubectl logs -n hivemr3 hivemr3-hiveserver2-78d455fb76-jrqgt | grep ApplicationID
2020-01-14T07:01:06,552  INFO [main] client.MR3Client$: Starting DAGAppMaster with ApplicationID application_30211_0000 in session mode
```

Execute MasterControl with command `stopContainerWorkers` inside the HiveServer2 Pod to gracefully stop all ContainerWorkers.
The user may execute MasterControl even in the presence of running queries (which are not affected).

```sh
# terminal-command
kubectl exec -n hivemr3 -it hivemr3-hiveserver2-78d455fb76-jrqgt -- /bin/bash -c 'export PS1="$ "; exec /bin/bash'
# terminal-command
./master-control.sh stopContainerWorkers application_30211_0000
Sent a request to stop all ContainerWorkers for application_30211_0000
```

After all queries complete and ContainerWorker Pods are deleted,
the user can update the Docker image for ContainerWorker Pods.
Then all new ContainerWorker Pods use the updated Docker image.

## Updating DAGAppMaster Pod with MasterControl

Similarly to updating ContainerWorker Pods,
the user can update DAGAppMaster Pod by executing MasterControl with command `closeDagAppMaster`.
Unlike updating ContainerWorker Pods, however,
the user should update the Docker image for DAGAppMaster Pod before executing MasterControl
because a new DAGAppMaster Pod automatically starts.
Since no running queries are affected by MasterControl, the user may execute MasterControl at any time.
After a while, a new DAGAppMaster Pod starts which uses the new Docker image.

```sh
# terminal-command
./master-control.sh closeDagAppMaster application_30211_0000
Sent a request to close DAGAppMaster for application_30211_0000
```

## Updating HiveServer2 Pod

MR3 uses a Deployment resource for HiveServer2.
Thus the user can follow the standard procedure for Deployment resources
to perform rolling updates of HiveServer2 Pod.

