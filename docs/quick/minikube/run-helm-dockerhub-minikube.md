---
title: Helm
sidebar_position: 2
---

This page shows how to use Helm and a pre-built Docker image available at [DockerHub](https://hub.docker.com/u/mr3project) in order to operate Hive on MR3 on Minikube.
All the components
(Metastore, HiveServer2, MR3 DAGAppMaster, and MR3 ContainerWorkers) will be running inside Minikube.
For the Metastore database, we will run a MySQL database in a Docker container,
but an existing MySQL database is also okay to use.
By following the instructions, the user will learn:

1. how to start Metastore using Helm
2. how to use Helm to run Hive on MR3
3. how to create Beeline connections and send queries to HiveServer2 running inside Minikube

## Prerequisites

Running Hive on MR3 on Minikube has the following prerequisites:

* A running Minikube cluster is available.
* The user should be able to execute: 1) command `kubectl`; 2) command `helm`; 3) command `docker` if no MySQL database is available.

[After installing Hive on MR3](../install),
change to the directory `helm`.

```sh
# terminal-command
cd helm/
```

In our example, all commands are executed by user `gla`.
We use Helm 2.17.0.

:::caution
If `install.sh` was not executed while installing Hive on MR3,
manually create symbolic links to the two directories `kubernetes/conf` and `kubernetes/key`.

```sh
# terminal-command
mkdir -p ../kubernetes/key
# terminal-command
ln -s ../../kubernetes/conf/ hive/conf
# terminal-command
ln -s ../../kubernetes/key/ hive/key
```
:::

## Overview

Hive on MR3 creates four kinds of Pods: Metastore, HiveServer2, MR3 DAGAppMaster, and MR3 ContainerWorker.
The user manually creates a Metastore Pod and a HiveServer2 Pod.
A DAGAppMaster Pod is created by HiveServer2, and
ContainerWorker Pods are created by DAGAppMaster when executing queries.

Running Hive on MR3 with Helm involves the following steps.

* The user creates `values-minikube.yaml` to configure Pods.
* The user updates `hive-site.xml`, `mr3-site.xml`, and `tez-site.xml`
in the configuration directory `hive/conf`.
* The user installs Helm chart for Hive on MR3 with `values-minikube.yaml`
to start Metastore and HiveServer2.

In the second step,
updating `hive-site.xml` and `mr3-site.xml` is usually enough to get started
as the default values in `tez-site.xml` work well in common settings.

## Starting a MySQL database

For simplicity, we will run a MySQL database for the Metastore database in a Docker container.

```sh
# terminal-command
docker run -d --name mysql-server -p 3306:3306 -e MYSQL_ROOT_PASSWORD=passwd mysql:5.6
# terminal-command
mysql --user=root --password=passwd --host=127.0.0.1 -e 'show databases;'
+--------------------+
| Database           |
+--------------------+
| information_schema |
| mysql              |
| performance_schema |
+--------------------+
```

## Creating local directories

We need to create two new local directories:
1) for a PersistentVolume to be shared by all Pods
2) for a hostPath volume where ContainerWorker Pods write intermediate data

Create a local directory for the PersistentVolume.
In our example, we use `/data1/gla/workdir`.

```sh
# terminal-command
mkdir /data1/gla/workdir
# terminal-command
chmod 777 /data1/gla/workdir
```

Create a local directory for the hostPath volume for ContainerWorker Pods.
In our example, we use `/data1/gla/k8s`.

```sh
# terminal-command
mkdir -p /data1/gla/k8s
# terminal-command
chmod 777 /data1/gla/k8s
```

## Configuring Pods

Create a new file `hive/values-minikube.yaml`
and update the following fields
to override the default values in `values.yaml`.

* `docker.image` is set to the Docker image for all Pods except for ContainerWorker Pods.
* `docker.containerWorkerImage` is set to the Docker image for ContainerWorker Pods.
* `docker.imagePullPolicy` is set to `IfNotPresent` because we download the Docker image from DockerHub.
* `create.metastore` is set to true because we will create a Metastore Pod.
* `metastore.databaseHost` is set to the address of the host where the MySQL database is running.
* `metastore.initSchema` is set to true because it is the first time to run Metastore. For subsequent runs, the user may set it to false.
* `hive.externalIp` is set to the IP address of a Service for HiveServer2 Pod.
* `workDir.volumeStr` is set to the local directory for the PersistentVolume created in the previous step.

Set the resources for HiveServer2 and Metastore Pods.
`heapSize` specifies the memory size (in MB) for the Java process
and should be set to a value equivalent to `resources.requests.memory`.

```yaml
# terminal-command
vi hive/values-minikube.yaml

docker:
  image: mr3project/hive:4.0.0.mr3.2.0
  containerWorkerImage: mr3project/hive:4.0.0.mr3.2.0
  imagePullPolicy: IfNotPresent

create:
  metastore: true

metastore:
  databaseHost: 192.168.10.1    # use your IP address (where the MySQL database is running)
  warehouseDir: file:///opt/mr3-run/work-dir/warehouse
  initSchema: true
  resources:
    requests:
      cpu: 1
      memory: 4Gi
    limits:
      cpu: 1
      memory: 4Gi
  heapSize: 4096

hive:
  externalIp: 192.168.10.1      # use your IP address
  resources:
    requests:
      cpu: 1
      memory: 8Gi
    limits:
      cpu: 1
      memory: 8Gi
  heapSize: 8192

workDir:
  isNfs: false
  volumeStr: "hostPath:\n  path: /home/gla/workdir"
```

Update `hive/templates/metastore.yaml` to remove `nodeAffinity` as we do not use node affinity rules.
```yaml
# terminal-command
vi hive/templates/metastore.yaml

      affinity:
      # nodeAffinity:
      #   requiredDuringSchedulingIgnoredDuringExecution:
      #     nodeSelectorTerms:
      #     - matchExpressions:
      #       - key: roles
      #         operator: In
      #         values:
      #         - "masters"
```

## Resources for DAGAppMaster Pod

By default, we allocate 16GB of memory and 4 CPUs to a DAGAppMaster Pod.
To adjust resources, update `conf/mr3-site.xml`.
```xml
# terminal-command
vi conf/mr3-site.xml

<property>
  <name>mr3.am.resource.memory.mb</name>
  <value>16384</value>
</property>

<property>
  <name>mr3.am.resource.cpu.cores</name>
  <value>4</value>
</property>
```

## Configuring MR3 DAGAppMaster and ContainerWorker Pods

Open `hive/conf/mr3-site.xml` and set the configuration key `mr3.k8s.pod.image.pull.policy`
to `IfNotPresent` because we download the Docker image from DockerHub.
Set the configuration key `mr3.k8s.pod.worker.hostpaths`
to the local directory for the hostPath PersistentVolume.

```xml
# terminal-command
vi hive/conf/mr3-site.xml

<property>
  <name>mr3.k8s.pod.image.pull.policy</name>
  <value>IfNotPresent</value>
</property>

<property>
  <name>mr3.k8s.pod.worker.hostpaths</name>
  <value>/data1/gla/k8s</value>
</property>
```

## Configuring security

Update the following configuration keys in `hive/conf/hive-site.xml`.

* The two configuration keys `javax.jdo.option.ConnectionUserName` and `javax.jdo.option.ConnectionPassword` should match
the user name and password of the MySQL server for Metastore.
* `hive.metastore.pre.event.listeners` is set to empty
because we do not enable security on the Metastore side.
* `hive.security.authorization.manager` is set to use `SQLStdHiveAuthorizerFactory`.

```xml
# terminal-command
vi hive/conf/hive-site.xml

<property>
  <name>javax.jdo.option.ConnectionUserName</name>
  <value>root</value>
</property>

<property>
  <name>javax.jdo.option.ConnectionPassword</name>
  <value>passwd</value>
</property>

<property>
  <name>hive.metastore.pre.event.listeners</name>
  <value></value>
</property>

<property>
  <name>hive.security.authorization.manager</name>
  <value>org.apache.hadoop.hive.ql.security.authorization.plugin.sqlstd.SQLStdHiveAuthorizerFactory</value>
</property>
```

## Configuring resources

In `hive/conf/hive-site.xml`, the following configuration keys specify
the resource to be allocated to a Map Task, a Reduce Task, or a ContainerWorker.
In our example, we allocate 2GB of memory and a single core to a Map Task, a Reduce Task, and a ContainerWorker.

```xml
# terminal-command
vi hive/conf/hive-site.xml

<property>
  <name>hive.mr3.map.task.memory.mb</name>
  <value>2048</value>
</property>

<property>
  <name>hive.mr3.map.task.vcores</name>
  <value>1</value>
</property>

<property>
  <name>hive.mr3.reduce.task.memory.mb</name>
  <value>2048</value>
</property>

<property>
  <name>hive.mr3.reduce.task.vcores</name>
  <value>1</value>
</property>

<property>
  <name>hive.mr3.all-in-one.containergroup.memory.mb</name>
  <value>2048</value>
</property>

<property>
  <name>hive.mr3.all-in-one.containergroup.vcores</name>
  <value>1</value>
</property>
```

When updating these configuration keys, we should meet the following requirements:

* `hive.mr3.map.task.memory.mb` ≤ `hive.mr3.all-in-one.containergroup.memory.mb`
* `hive.mr3.map.task.vcores` ≤ `hive.mr3.all-in-one.containergroup.vcores`
* `hive.mr3.reduce.task.memory.mb` ≤ `hive.mr3.all-in-one.containergroup.memory.mb`
* `hive.mr3.reduce.task.vcores` ≤ `hive.mr3.all-in-one.containergroup.vcores`

## Configuring Minikube

Before starting Hive on MR3, the user should remove the label `node-role.kubernetes.io/master` from `minikube` node.
This is because Hive on MR3 does not count the resources of master nodes
when estimating the resources for ContainerWorker Pods.
Since `minikube` node, the only node in the Minikube cluster, is a master node,
we should demote it to an ordinary node in order to secure resources for ContainerWorker Pods.
Thus, in order to be able to create ContainerWorker Pods in `minikube` node,
the user should execute the following command:

```sh
# terminal-command
kubectl label node minikube node-role.kubernetes.io/master-
```

## Starting Hive on MR3

:::caution
`hive/values-hive.yaml` should not contain two separate sections for the same key.
In the following example,
the field `metastore.databaseHost` is ignored because of the second section for the key `metastore`.

```yaml
metastore:
  databaseHost: 192.168.10.1

metastore:
  initSchema: true
```
:::

Before starting Hive on MR3,
make sure that no ConfigMaps and Services exist in the namespace `hivemr3`.
For example, the user may see ConfigMaps and Services left over from a previous run.

```sh
# terminal-command
kubectl get configmaps -n hivemr3
NAME                       DATA   AGE
mr3conf-configmap-master   1      7m12s
mr3conf-configmap-worker   1      7m7s

# terminal-command
kubectl get svc -n hivemr3
NAME                    TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)                          AGE
service-master-6730-0   ClusterIP      10.97.29.191    <none>           80/TCP,9890/TCP                  7m32s
service-worker          ClusterIP      None            <none>           <none>                           7m29s
```

In such a case, manually delete these ConfigMaps and Services.

```sh
# terminal-command
kubectl delete configmap -n hivemr3 mr3conf-configmap-master mr3conf-configmap-worker
# terminal-command
kubectl delete svc -n hivemr3 service-master-6730-0 service-worker
```

Install Helm chart for Hive on MR3 with `hive/values-minikube.yaml`.
We use `hivemr3` for the namespace.
Metastore automatically downloads a MySQL connector
from `https://cdn.mysql.com/Downloads/Connector-J/mysql-connector-java-8.0.28.tar.gz`.

```sh
# terminal-command
helm install --namespace hivemr3 hive -f hive/values-minikube.yaml
2025/03/19 20:15:15 found symbolic link in path: /data1/gla/mr3/helm/hive/conf resolves to /data1/gla/mr3/kubernetes/conf
2025/03/19 20:15:15 found symbolic link in path: /data1/gla/mr3/helm/hive/key resolves to /data1/gla/mr3/kubernetes/key
NAME:   romping-rattlesnake
LAST DEPLOYED: Wed Mar 19 20:15:15 2025
NAMESPACE: hivemr3
STATUS: DEPLOYED
...

==> v1/ConfigMap
NAME                    DATA  AGE
client-am-config        4     0s
env-configmap           1     0s
hivemr3-conf-configmap  18    0s
...
```

Check if all ConfigMaps are non-empty.
If the `DATA` column for `hivemr3-conf-configmap` is 0,
try to remove unnecessary files in the configuration directory `conf`. 
This usually happens when a temporary file (e.g., `.hive-site.xml.swp`) is kept at the time of installing Helm chart.

Find three Pods running in the Minikube cluster: Metastore, HiveServer2, and MR3 DAGAppMaster.
HiveServer2 Pod becomes ready after a readiness probe contacts it.
Depending on the configuration for readiness probe, HiveServer2 may restart once before running normally.
No ContainerWorkers Pods are created until queries are submitted.

```sh
# terminal-command
kubectl get pods -n hivemr3
NAME                                   READY   STATUS    RESTARTS   AGE
hivemr3-hiveserver2-78d455fb76-jrqgt   1/1     Running   0          2m26s
hivemr3-metastore-0                    1/1     Running   0          2m26s
mr3master-4798-0-68459c444f-lzmjl      1/1     Running   0          53s
```

## Running Beeline

The user may use any client program (not necessarily Beeline included in the MR3 release) to connect to HiveServer2
via the Service created by Helm
(which opens a Thrift port 9852 and an HTTP port 10001 by default).
In our example, we run Beeline inside the Hiveserver2 Pod.

Download a sample dataset and copy it to the directory for the PersistentVolume.

```sh
# terminal-command
wget https://github.com/mr3project/mr3-release/releases/download/v1.0/pokemon.csv
# terminal-command
cp pokemon.csv /data1/gla/workdir
# terminal-command
chmod 777 /data1/gla/workdir/pokemon.csv
```

The user can verify that the sample dataset is accessible inside the HiveServer2 Pod.

```sh
# terminal-command
kubectl exec -n hivemr3 -it hivemr3-hiveserver2-78d455fb76-jrqgt -- /bin/bash -c "ls /opt/mr3-run/work-dir/pokemon.csv"
/opt/mr3-run/work-dir/pokemon.csv
```

Run Beeline.

```sh
# terminal-command
kubectl exec -n hivemr3 -it hivemr3-hiveserver2-78d455fb76-jrqgt -- /bin/bash -c 'export PS1="$ "; exec /bin/bash'
# terminal-command
export USER=root
# terminal-command
/opt/mr3-run/hive/run-beeline.sh
Output directory: /opt/mr3-run/hive/run-result/hivemr3-2025-03-19-11-18-36

# Running Beeline using Hive-MR3 #

...
Connecting to jdbc:hive2://hivemr3-hiveserver2-78d455fb76-jrqgt:9852/;;;
Connected to: Apache Hive (version 4.0.0)
Driver: Hive JDBC (version 4.0.0)
Transaction isolation: TRANSACTION_REPEATABLE_READ
Beeline version 4.0.0 by Apache Hive
0: jdbc:hive2://hivemr3-hiveserver2-78d455fb7> 
```

Use the default database.
```sh
0: jdbc:hive2://hivemr3-hiveserver2-78d455fb7> show databases;
...
+----------------+
| database_name  |
+----------------+
| default        |
+----------------+
1 row selected (1.999 seconds)
```

Create a table called `pokemon`.
```sh
0: jdbc:hive2://hivemr3-hiveserver2-78d455fb7> CREATE TABLE pokemon (Number Int,Name String,Type1 String,Type2 String,Total Int,HP Int,Attack Int,Defense Int,Sp_Atk Int,Sp_Def Int,Speed Int) row format delimited fields terminated BY ',' lines terminated BY '\n' tblproperties("skip.header.line.count"="1");
```

Import the sample dataset.
```sh
0: jdbc:hive2://hivemr3-hiveserver2-78d455fb7> load data local inpath '/opt/mr3-run/work-dir/pokemon.csv' INTO table pokemon;
```

Execute queries.
```sh
0: jdbc:hive2://hivemr3-hiveserver2-78d455fb7> select avg(HP) from pokemon;
...
+---------------------+
|         _c0         |
+---------------------+
| 144.84882280049567  |
+---------------------+
1 row selected (20.693 seconds)

0: jdbc:hive2://hivemr3-hiveserver2-78d455fb7> create table pokemon1 as select *, IF(HP>160.0,'strong',IF(HP>140.0,'moderate','weak')) AS power_rate from pokemon;
...

0: jdbc:hive2://hivemr3-hiveserver2-78d455fb7> select COUNT(name), power_rate from pokemon1 group by power_rate;
...
+------+-------------+
| _c0  | power_rate  |
+------+-------------+
| 108  | moderate    |
| 363  | strong      |
| 336  | weak        |
+------+-------------+
3 rows selected (1.426 seconds)
```

The user can see that ContainerWorker Pods have been created.
```sh
# terminal-command
kubectl get pods -n hivemr3
NAME                                   READY   STATUS    RESTARTS   AGE
hivemr3-hiveserver2-78d455fb76-jrqgt   1/1     Running   0          5m43s
hivemr3-metastore-0                    1/1     Running   0          5m43s
mr3master-4798-0-68459c444f-lzmjl      1/1     Running   0          4m10s
mr3worker-ccbd-1                       1/1     Running   0          67s
mr3worker-ccbd-2                       1/1     Running   0          16s
```

The user can find the warehouse directory `/data1/gla/workdir/warehouse`.
```sh
# terminal-command
ls /data1/gla/workdir/warehouse
pokemon  pokemon1
```

## Stopping Hive on MR3

In order to terminate Hive on MR3, the user should first delete the DAGAppMaster Pod and then delete Helm chart, not the other way.
This is because deleting Helm chart revokes the ServiceAccount object which DAGAppMaster uses to delete ContainerWorker Pods.
Hence, if the user deletes Helm chart first, all remaining Pods should be deleted manually.

Delete Deployment for DAGAppMaster which in turn deletes all ContainerWorker Pods automatically.
```sh
# terminal-command
kubectl get deployment -n hivemr3
NAME                  READY   UP-TO-DATE   AVAILABLE   AGE
hivemr3-hiveserver2   1/1     1            1           6m3s
mr3master-4798-0      1/1     1            1           4m30s

# terminal-command
kubectl -n hivemr3 delete deployment mr3master-4798-0
deployment.extensions "mr3master-4798-0" deleted
```

Delete Helm chart.
```sh
# terminal-command
helm delete romping-rattlesnake
release "romping-rattlesnake" deleted
```

As the last step, the user will find that the following objects belonging to the namespace `hivemr3` are still alive:

* two ConfigMaps `mr3conf-configmap-master` and `mr3conf-configmap-worker`
* Service for DAGAppMaster, e.g., `service-master-4798-0`
* Service `service-worker`

```sh
# terminal-command
kubectl get configmaps -n hivemr3
NAME                       DATA   AGE
mr3conf-configmap-master   1      5m23s
mr3conf-configmap-worker   1      5m18s

# terminal-command
kubectl get svc -n hivemr3
NAME                    TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)           AGE
service-master-4798-0   ClusterIP   10.104.212.174   <none>        80/TCP,9890/TCP   5m36s
service-worker          ClusterIP   None             <none>        <none>            5m32s
```

These ConfigMaps and Services are not deleted by the command `helm delete` because
they are created not by Helm but by HiveServer2 and DAGAppMaster.
Hence the user should delete these ConfigMaps and Services manually.
```sh
# terminal-command
kubectl delete configmap -n hivemr3 mr3conf-configmap-master mr3conf-configmap-worker
configmap "mr3conf-configmap-master" deleted
configmap "mr3conf-configmap-worker" deleted

# terminal-command
kubectl delete svc -n hivemr3 service-master-4798-0 service-worker
service "service-master-4798-0" deleted
service "service-worker" deleted
```

