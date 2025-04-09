---
title: MasterControl
sidebar_position: 20
---

MasterControl is a utility that allows the user to connect to DAGAppMaster and manage DAGs.
MasterControl works when DAGAppMaster runs in Yarn or Kubernetes mode.

## Using MasterControl on Hadoop

On Hadoop, MasterControl should be executed by the owner of DAGAppMaster. 
The script to execute is `mr3/master-control.sh`.
It takes a command with a Yarn ApplicationID. 

```sh
# terminal-command
mr3/master-control.sh 
...
Usage:
  getDags <AppID>                          : Get all running/finished DAGs
  getRunningDags <AppID>                   : Get all running DAGs
  killDag <AppId> <DAGID>                  : Send a request to kill a DAG
  ackDagFinished <AppID> <DAGID>           : Acknowledge the completion of a DAG
  stopContainerWorkers <AppID>             : Gracefully stop all running ContainerWorkers
  closeDagAppMaster <AppID>                : Gracefully stop DAGAppMaster
```

The command `stopContainerWorkers` waits until all current DAGs are finished, and then terminates all running ContainerWorkers. 
The command `closeDagAppMaster` waits until all current DAGs are finished, and then terminates the current DAGAppMaster.
For other commands, we show examples below.

We list all running DAGs in the Yarn application `application_1742983838780_0079`.
MasterControl prints IDs and names of all running DAGs.

```sh
# terminal-command
mr3/master-control.sh getDags application_1742983838780_0079
...
Lists of running/finished DAGs in application_1742983838780_0079:
dag_1742983838780_0079_1521 hive_20250406140922_d51821dd-9187-4106-ba11-9b0dad91b32d:1521
dag_1742983838780_0079_1538 hive_20250406141409_2c9d9b24-ac71-4ff2-9d4b-3c0ff2e787f6:1538
```

:::caution
`master-control.sh` may fail with `IllegalAccessError`:
```
java.lang.IllegalAccessError: class com.datamonad.mr3.client.DAGClientHandlerProtocolRPC$GetAllDagsRequestProto tried to access private field com.google.protobuf.AbstractMessage.memoizedSize (com.datamonad.mr3.client.DAGClientHandlerProtocolRPC$GetAllDagsRequestProto and com.google.protobuf.AbstractMessage are in unnamed module of loader 'app')
```
This error occurs because Hive on MR3 uses Protobuf 3
while Protobuf 2 jar files are included in the classpath.
To avoid this error, remove Protobuf 2 jar files in the classpath.
:::

We kill the running DAG `dag_1742983838780_0079_1521`.

```sh
# terminal-command
mr3/master-control.sh killDag application_1742983838780_0079 dag_1742983838780_0079_1521
...
Sent a request to kill DAG dag_1742983838780_0079_1521.
```

After a while, the DAG `dag_1742983838780_0079_1521` is killed and no longer appears in the list of running DAGs.

## Using MasterControl on Kubernetes

On Kubernetes,
we should execute MasterControl inside the HiveServer2 Pod
(where `env.sh` is already mounted and the environment variable `CLIENT_TO_AM_TOKEN_KEY` is already set).
The first step is to obtain the ApplicationID from the log file for HiveServer2 (outside Kubernetes).
In the following example, we get the name of the HiveServer2 Pod, use it as an argument to `kubectl logs`, and obtain the ApplicationID `application_2407_0000`.

```sh
# terminal-command
kubectl get pods -n hivemr3 | grep hiveserver2
hiveserver2-595f4c56c4-rxbgx            1/1     Running   0          4m39s

# terminal-command
kubectl logs -n hivemr3 hiveserver2-595f4c56c4-rxbgx | grep ApplicationID
2025-04-06T08:03:31,266  INFO [main] client.MR3Client$: Starting DAGAppMaster with ApplicationID application_9348_0000 in session mode
```

Next check if the environment variable `CLIENT_TO_AM_TOKEN_KEY` is already set inside the HiveServer2 Pod.

```sh
# terminal-command
kubectl exec -it -n hivemr3 hiveserver2-595f4c56c4-rxbgx -- /bin/bash -c 'export PS1="$ "; exec /bin/bash'
# terminal-command
printenv | grep CLIENT_TO_AM_TOKEN_KEY
CLIENT_TO_AM_TOKEN_KEY=b93f7b72-bad3-4259-9040-fe57fb339050
```

Now the user can execute `master-control.sh` using the ApplicationID.

```sh
# terminal-command
./master-control.sh

Usage:
  getDags <AppID>                          : Get all running/finished DAGs
  getRunningDags <AppID>                   : Get all running DAGs
  killDag <AppId> <DAGID>                  : Send a request to kill a DAG
  ackDagFinished <AppID> <DAGID>           : Acknowledge the completion of a DAG
  stopContainerWorkers <AppID>             : Gracefully stop all running ContainerWorkers
  closeDagAppMaster <AppID>                : Gracefully stop DAGAppMaster
  updateResourceLimit <AppID> <Max memory in GB> <Max CPU cores>   : Update the resource limit
  updateAutoScaling <AppID> <autoScaleOutThresholdPercent> <autoScaleInThresholdPercent> <autoScaleInMinHosts> <autoScaleOutNumInitialContainers>  : Update autoscaling parameters

# terminal-command
./master-control.sh getDags application_9348_0000
...
Lists of running/finished DAGs in application_9348_0000:
Lists of running/finished DAGs in application_9348_0000:
dag_9348_0000_5 tpcds-query12

# terminal-command
./master-control.sh killDag application_9348_0000 dag_9348_0000_5
Sent a request to kill DAG dag_9348_0000_5.
```

On Kubernetes, the user can use the command `updateResourceLimit`
to update (either increase or decrease) the limit on the total resources for all ContainerWorker Pods.
This command overrides the settings for 
the configuration keys `mr3.k8s.worker.total.max.memory.gb` and `mr3.k8s.worker.total.max.cpu.cores`
in `mr3-site.xml`.
If current ContainerWorker Pods consume more resources than the new limit,
MR3 returns excess resources by stopping young ContainerWorker Pods. 
In order not to disrupt the execution of active DAGs,
MR3 gracefully stops these ContainerWorker Pods which continue to run normally until all active DAGs completed.

```sh
# terminal-command
./master-control.sh updateResourceLimit application_9348_0000 128 32
...
Sent a request to update the resource limit for application_9348_0000: 128 32
```

On Kubernetes, the user can use the command `updateAutoScaling`
to update the configuration for autoscaling.

* `autoScaleOutThresholdPercent` specifies **ScaleOutThreshold** = `mr3.auto.scale.out.threshold.percent`.
* `autoScaleInThresholdPercent` specifies **ScaleInThreshold** = `mr3.auto.scale.in.threshold.percent`.
* `autoScaleInMinHosts` specifies **AutoScaleInMinHosts** = `mr3.auto.scale.in.min.hosts`.
* `autoScaleOutNumInitialContainers` specifies `mr3.auto.scale.out.num.initial.containers`. 

## Rerunning Beeline

When running Hive on MR3,
a Beeline connection fails to execute queries with the following error
if the user has executed the command `closeDagAppMaster` and 
the current DAGAppMaster is gracefully stopping itself.

```sh
Caused by: org.apache.hadoop.ipc.RemoteException(com.datamonad.mr3.api.common.MR3Exception): DAGAppMaster.gracefulShutdown() already called and cannot take a new DAG
```

This is normal behavior because DAGAppMaster refuses to take new DAGs if it is gracefully stopping itself.
As the same Beeline connection cannot execute any more queries,
just restarting Beeline solves the problem.

