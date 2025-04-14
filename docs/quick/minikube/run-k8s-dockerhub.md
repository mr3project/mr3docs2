---
title: Shell Scripts
sidebar_position: 1
---

This page shows how to use a pre-built Docker image available at [DockerHub](https://hub.docker.com/u/mr3project) in order to operate Hive on MR3 on Minikube.
All the components
(Metastore, HiveServer2, MR3 DAGAppMaster, and MR3 ContainerWorkers) will be running inside Minikube.
For the Metastore database, we will run a MySQL database in a Docker container,
but an existing MySQL database is also okay to use.
By following the instructions, the user will learn:

1. how to start Metastore
2. how to run Hive on MR3
3. how to create Beeline connections and send queries to HiveServer2 running inside Minikube

## Prerequisites

Running Hive on MR3 on Minikube has the following prerequisites:

* A running Minikube cluster is available.
* The user should be able to execute: 1) command `kubectl`; 2) command `docker` if no MySQL database is available.

[After installing Hive on MR3](../install),
change to the directory `kubernetes`.

```sh
# terminal-command
cd kubernetes/
```

In our example, all commands are executed by user `gla`.

## Overview

Hive on MR3 consists of four components: Metastore, HiveServer2,
MR3 DAGAppMaster, and MR3 ContainerWorkers.
The user manually creates a Metastore Pod and a HiveServer2 Pod.
A DAGAppMaster Pod is created by HiveServer2, and
ContainerWorker Pods are created by DAGAppMaster when executing queries.

Running Hive on MR3 involves the following steps.

* The user updates `env.sh` to set additional environment variables.
* The user updates a few `yaml` files in the directory `yaml`.
* The user updates `hive-site.xml`, `mr3-site.xml`, and `tez-site.xml`
in the configuration directory `conf`.
* The user executes `run-metastore.sh` and `run-hive.sh`
to start Metastore and HiveServer2.

In the third step,
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

## Configuring `env.sh`

`env.sh` is a self-descriptive script containing
major environment variables that should be set in every environment.

Open `env.sh` and set the following environment variable.

```sh
# terminal-command
vi env.sh

HIVE_DATABASE_HOST=192.168.10.1       # use your IP address (where the MySQL database is running)
```

* `HIVE_DATABASE_HOST` specifies the host where the MySQL database is running.

## Docker image

We use a pre-built Docker image available at [DockerHub](https://hub.docker.com/u/mr3project).
Open `env.sh` and set the following environment variables.

* `DOCKER_HIVE_IMG` specifies the Docker image for MR3 DAGAppMaster Pod.
* `DOCKER_HIVE_WORKER_IMG` specifies the Docker image for MR3 ContainerWorker Pod.

```sh
# terminal-command
vi env.sh

DOCKER_HIVE_IMG=mr3project/hive:4.0.0.mr3.2.0
DOCKER_HIVE_WORKER_IMG=$DOCKER_HIVE_IMG
```

In `yaml/metastore.yaml` and `yaml/hive.yaml`,
set the filed `image` to the Docker image for Metastore and HiveServer2 Pods.

```yaml
# terminal-command
vi yaml/metastore.yaml

spec:
  template:
    spec:
      containers:
      - image: mr3project/hive:4.0.0.mr3.2.0
```

```yaml
# terminal-command
vi yaml/hive.yaml

spec:
  template:
    spec:
      containers:
      - image: mr3project/hive:4.0.0.mr3.2.0
```

## Resources for Metastore and HiveServer2 Pods

Open `env.sh` and 
set the following environment variables to 
the memory size (in MB) to be allocated to HiveServer2 and Metastore Pods.

* `HIVE_SERVER2_HEAPSIZE` should match the memory size for HiveServer2 Pod.
* `HIVE_METASTORE_HEAPSIZE` should match the memory size for Metastore Pod.

In our example, we use the following values.

```sh
# terminal-command
vi env.sh

HIVE_SERVER2_HEAPSIZE=8192            # HiveServer2 Pod memory in MB
HIVE_METASTORE_HEAPSIZE=8192          # Metastore Pod memory in MB
```

Open `yaml/metastore.yaml` and set the resources to match `HIVE_METASTORE_HEAPSIZE` in `env.sh`.

```yaml
# terminal-command
vi yaml/metastore.yaml

      containers:
        resources:
          requests:
            cpu: 1
            memory: 8Gi
          limits:
            cpu: 1
            memory: 8Gi
```

Open `yaml/hive.yaml` and set the resources to match `HIVE_SERVER2_HEAPSIZE`.

```yaml
# terminal-command
vi yaml/hive.yaml

      containers:
        resources:
          requests:
            cpu: 1
            memory: 8Gi
          limits:
            cpu: 1
            memory: 8Gi
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

## Configuring PersistentVolume

Update `yaml/workdir-pv.yaml`
to create a hostPath PersistentVolume using the directory created earlier.

```yaml
# terminal-command
vi yaml/workdir-pv.yaml

spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Delete
  hostPath:
    path: "/data1/gla/workdir"
```

## Configuring Metastore Pod

Open `yaml/metastore.yaml` and update the following fields.

* Remove `nodeAffinity` as we do not use node affinity rules.
* `args` includes `"--init-schema"` because it is the first time to run Metastore.
* `imagePullPolicy` is set to `IfNotPresent` because we download the Docker image from DockerHub.

```yaml
# terminal-command
vi yaml/metastore.yaml

      affinity:
      # nodeAffinity:
      #   requiredDuringSchedulingIgnoredDuringExecution:
      #     nodeSelectorTerms:
      #     - matchExpressions:
      #       - key: roles
      #         operator: In
      #         values:
      #         - "masters"

      containers:
        args: ["start", "--kubernetes", "--init-schema"]
        imagePullPolicy: IfNotPresent
```

## Configuring HiveServer2 Pod

Open `yaml/hive.yaml` and update the following fields.

* `imagePullPolicy` is set to `IfNotPresent` because we download the Docker image from DockerHub.

```yaml
# terminal-command
vi yaml/hive.yaml

      containers:
        imagePullPolicy: IfNotPresent
```

## Configuring Service for HiveServer2

The manifest `yaml/hiveserver2-service.yaml`
defines a Service for exposing HiveServer2 to the outside of the Minikube cluster.
Define a Service for HiveServer2 Pod using the IP address of the local machine.
By default, HiveServer2 uses port 9852 for Thrift transport and port 10001 for HTTP transport.

```yaml
# terminal-command
vi yaml/hiveserver2-service.yaml

spec:
  ports:
  - protocol: TCP
    port: 9852
    targetPort: 9852
    name: thrift
  - protocol: TCP
    port: 10001
    targetPort: 10001
    name: http
  externalIPs:
  - 192.168.10.1        # use your IP address
```

## Configuring MR3 DAGAppMaster and ContainerWorker Pods

Open `conf/mr3-site.xml` and set the configuration key `mr3.k8s.pod.image.pull.policy`
to `IfNotPresent` because we download the Docker image from DockerHub.
Set the configuration key `mr3.k8s.pod.worker.hostpaths`
to the local directory for the hostPath PersistentVolume.

```xml
# terminal-command
vi conf/mr3-site.xml

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

Update the following configuration keys in `conf/hive-site.xml`.

* The two configuration keys `javax.jdo.option.ConnectionUserName` and `javax.jdo.option.ConnectionPassword` should match
the user name and password of the MySQL server for Metastore.
* `hive.metastore.pre.event.listeners` is set to empty
because we do not enable security on the Metastore side.
* `hive.security.authorization.manager` is set to use `SQLStdHiveAuthorizerFactory`.

```xml
# terminal-command
vi conf/hive-site.xml

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

In `conf/hive-site.xml`, the following configuration keys specify
the resource to be allocated to a Map Task, a Reduce Task, or a ContainerWorker.
In our example, we allocate 2GB of memory and a single core to a Map Task, a Reduce Task, and a ContainerWorker.

```xml
# terminal-command
vi conf/hive-site.xml

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

## Running Metastore

To run Metastore, execute the script `run-metastore.sh`.
Before starting Metastore, the script automatically downloads a MySQL connector
from `https://cdn.mysql.com/Downloads/Connector-J/mysql-connector-java-8.0.28.tar.gz`
because `--init-schema` option is passed to Metastore.

```sh
# terminal-command
./run-metastore.sh
...
CLIENT_TO_AM_TOKEN_KEY=87fae4e6-22fe-4ba2-bc6c-ec6390d90e02
MR3_APPLICATION_ID_TIMESTAMP=11559
MR3_SHARED_SESSION_ID=c358fea5-3ed9-45be-a6a0-955b4d331509
ATS_SECRET_KEY=1921e316-470e-44e3-919b-86c6e8726935
configmap/client-am-config created
statefulset.apps/hivemr3-metastore created
service/metastore created
```

## Running HiveServer2

To run HiveServer2, execute the script `run-hive.sh`.
```sh
# terminal-command
./run-hive.sh
...
CLIENT_TO_AM_TOKEN_KEY=d669b617-aa23-43b4-9ba5-75f4cc6e34d6
MR3_APPLICATION_ID_TIMESTAMP=3027
MR3_SHARED_SESSION_ID=4840bc48-f592-4673-8daf-e6972b49153d
ATS_SECRET_KEY=d24e5626-de69-40bf-8906-b0931712ee9b
Error from server (AlreadyExists): configmaps "client-am-config" already exists
deployment.apps/hivemr3-hiveserver2 created
service/hiveserver2 created
```

The scripts mount the following files inside the Metastore and HiveServer2 Pods:

* `env.sh`
* `conf/*`

In this way, the user can completely specify the behavior of Metastore and HiveServer2 as well as DAGAppMaster and ContainerWorkers.

:::info
In order to make any changes to these files effective,
the user should restart Metastore and HiveServer2
after deleting existing ConfigMaps and Services in the namespace `hivemr3`.
:::

Executing the script `run-hive.sh` starts a HiveServer2 Pod and a DAGAppMaster Pod in a moment.
HiveServer2 Pod becomes ready after a readiness probe contacts it.
Depending on the configuration for readiness probe, HiveServer2 may restart once before running normally.
No ContainerWorkers Pods are created until queries are submitted.

```sh
# terminal-command
kubectl get pods -n hivemr3
NAME                                 READY   STATUS    RESTARTS   AGE
hivemr3-hiveserver2-b9d6bdbb-484h6   1/1     Running   0          103s
hivemr3-metastore-0                  1/1     Running   0          2m
mr3master-1559-0-654ff9999f-dsgj2    1/1     Running   0          73s
```

## Running Beeline

The user may use any client program (not necessarily Beeline included in the MR3 release) to connect to HiveServer2
via the Service created with `yaml/hiveserver2-service.yaml`
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
kubectl exec -n hivemr3 -it hivemr3-hiveserver2-b9d6bdbb-484h6 -- /bin/bash -c "ls /opt/mr3-run/work-dir/pokemon.csv"
/opt/mr3-run/work-dir/pokemon.csv
```

Run Beeline.

```sh
# terminal-command
kubectl exec -n hivemr3 -it hivemr3-hiveserver2-b9d6bdbb-484h6 -- /bin/bash -c 'export PS1="$ "; exec /bin/bash'
# terminal-command
export USER=root
# terminal-command
/opt/mr3-run/hive/run-beeline.sh
Output directory: /opt/mr3-run/hive/run-result/hivemr3-2025-03-19-02-25-28


# Running Beeline using Hive-MR3 #

...
Connecting to jdbc:hive2://hivemr3-hiveserver2-b9d6bdbb-484h6:9852/;;;
Connected to: Apache Hive (version 4.0.0)
Driver: Hive JDBC (version 4.0.0)
Transaction isolation: TRANSACTION_REPEATABLE_READ
Beeline version 4.0.0 by Apache Hive
0: jdbc:hive2://hivemr3-hiveserver2-b9d6bdbb-> 
```

Use the default database.
```sh
0: jdbc:hive2://hivemr3-hiveserver2-b9d6bdbb-> show databases;
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
0: jdbc:hive2://hivemr3-hiveserver2-b9d6bdbb-> CREATE TABLE pokemon (Number Int,Name String,Type1 String,Type2 String,Total Int,HP Int,Attack Int,Defense Int,Sp_Atk Int,Sp_Def Int,Speed Int) row format delimited fields terminated BY ',' lines terminated BY '\n' tblproperties("skip.header.line.count"="1");
```

Import the sample dataset.
```sh
0: jdbc:hive2://hivemr3-hiveserver2-b9d6bdbb-> load data local inpath '/opt/mr3-run/work-dir/pokemon.csv' INTO table pokemon;
```

Execute queries.
```sh
0: jdbc:hive2://hivemr3-hiveserver2-b9d6bdbb-> select avg(HP) from pokemon;
...
+---------------------+
|         _c0         |
+---------------------+
| 144.84882280049567  |
+---------------------+
1 row selected (20.011 seconds)

0: jdbc:hive2://hivemr3-hiveserver2-69b7c4574> create table pokemon1 as select *, IF(HP>160.0,'strong',IF(HP>140.0,'moderate','weak')) AS power_rate from pokemon;
...

0: jdbc:hive2://hivemr3-hiveserver2-69b7c4574> select COUNT(name), power_rate from pokemon1 group by power_rate;
...
+------+-------------+
| _c0  | power_rate  |
+------+-------------+
| 108  | moderate    |
| 363  | strong      |
| 336  | weak        |
+------+-------------+
3 rows selected (1.509 seconds)
```

The user can see that ContainerWorker Pods have been created.
```sh
# terminal-command
kubectl get pods -n hivemr3
NAME                                 READY   STATUS    RESTARTS   AGE
hivemr3-hiveserver2-b9d6bdbb-484h6   1/1     Running   0          5m18s
hivemr3-metastore-0                  1/1     Running   0          5m35s
mr3master-1559-0-654ff9999f-dsgj2    1/1     Running   0          4m48s
mr3worker-0968-1                     1/1     Running   0          62s
mr3worker-0968-2                     1/1     Running   0          29s
```

The user can find the warehouse directory `/data1/gla/workdir/warehouse`.
```sh
# terminal-command
ls /data1/gla/workdir/warehouse
pokemon  pokemon1
```

## Stopping Hive on MR3

Delete Deployment for HiveServer2.

```sh
# terminal-command
kubectl -n hivemr3 delete deployment hivemr3-hiveserver2
deployment.extensions "hivemr3-hiveserver2" deleted
```

Deleting Deployment for HiveServer2 does not automatically terminate the DAGAppMaster Pod.
This is a feature, not a bug, which is due to the support of high availability in Hive on MR3.
For example,
after setting environment variable `MR3_APPLICATION_ID_TIMESTAMP` properly,
executing the script `run-hive.sh` again attaches the existing DAGAppMaster Pod to the new HiveServer2 Pod.

Delete Deployment for DAGAppMaster.

```sh
# terminal-command
kubectl delete deployment -n hivemr3 mr3master-1559-0
deployment.extensions "mr3master-1559-0" deleted
```

Deleting DAGAppMaster Pod automatically deletes all ContainerWorker Pods as well.

Delete StatefulSet for Metastore.

```sh
# terminal-command
kubectl -n hivemr3 delete statefulset hivemr3-metastore
statefulset.apps "hivemr3-metastore" deleted
```

After a while, no Pods should be running in the namespace `hivemr3`.
To delete all remaining resources, execute the following command:

```sh
# terminal-command
kubectl -n hivemr3 delete configmap --all; kubectl -n hivemr3 delete svc --all; kubectl -n hivemr3 delete secret --all; kubectl -n hivemr3 delete serviceaccount --all;  kubectl -n hivemr3 delete role --all; kubectl -n hivemr3 delete rolebinding --all; kubectl delete clusterrole node-reader; kubectl delete clusterrolebinding hive-clusterrole-binding; kubectl -n hivemr3 delete persistentvolumeclaims workdir-pvc; kubectl delete persistentvolumes workdir-pv
```

