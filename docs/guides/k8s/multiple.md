---
title: "Running Multiple HiveServer2 Instances"
sidebar_position: 30
---

## Overview

Hive on MR3 allows multiple HiveServer2 instances to share a common MR3 DAGAppMaster.
As an application, 
we can build a Kubernetes cluster which runs **multiple HiveServer2 instances each with its own Metastore instance.**

All HiveServer2 instances share common services such as Ranger and Timeline Server,
and send their queries to the same DAGAppMaster managing a common pool of ContainerWorker Pods.
It is also easy to add a new HiveServer2 instance for another Metastore instance and to remove an existing HiveServer2 instance without affecting other HiveServer instances.
In this way, we can simulate a serverless environment which achieves resource pooling and rapid elasticity through 
sharing ContainerWorker Pods and adding/removing HiveServer2 instances.

## Adding a new HiveServer2 instance

In order to run multiple HiveServer2 instances sharing a common MR3 DAGAppMaster,
the user should keep the value of `MR3_SHARED_SESSION_ID` generated by the the first HiveServer2 instance.

```sh
# terminal-command
$ ./run-hive.sh
...
MR3_SHARED_SESSION_ID=59eb6c06-655e-48ad-b881-28516fd8d13c
```

To add a new HiveServer2 instance, the user should check the following list.

* In `yaml/metastore.yaml` and `yaml/metastore-service.yaml`,
use a new name for StatefulSet, Service, and labels:
  ```yaml
  # terminal-command
  vi yaml/metastore.yaml

  metadata:
    name: hivemr3-metastore2
  spec:
    serviceName: metastore2
    selector:
      matchLabels:
        hivemr3_app: metastore2
    template:
      metadata:
        name: hivemr3-metastore2
  ```
  ```yaml
  # terminal-command
  vi yaml/metastore-service.yaml

  metadata:
    name: metastore2
  spec:
    selector: 
      hivemr3_app: metastore2
  ```

* In `env.sh`, change `HIVE_DATABASE_HOST` to specify the address of the MySQL database for the new HiveServer2 instance.
Update `HIVE_METASTORE_HOST` to use the new Service and label.
  ```sh
  # terminal-command
  vi env.sh

  HIVE_DATABASE_HOST=indigo1
  HIVE_METASTORE_HOST=hivemr3-metastore2-0.metastore2.hivemr3.svc.cluster.local
  ```

* In `yaml/hive.yaml` and `yaml/hiveserver2-service.yaml`, use a new name for Deployment, Service, and labels:
  ```yaml
  # terminal-command
  vi yaml/hive.yaml

  metadata:
    name: hivemr3-hiveserver2-2
  spec:
    selector:
      hivemr3_app: hiveserver2-2
    template:
      metadata:
        labels:
          hivemr3_app: hiveserver2-2
  ```
  ```yaml
  # terminal-command
  vi yaml/hiveserver2-service.yaml

  metadata:
    name: hiveserver2-2
  spec:
    selector:
      hivemr3_app: hiveserver2-2
  ```

* In `yaml/hiveserver2-service.yaml`, use a new port for HiveServer2. 
  ```yaml
  # terminal-command
  vi yaml/hiveserver2-service.yaml

      port: 9853
  ```

* Update `env.sh`, `run-metastore.sh`, `run-hive.sh`, `yaml/metastore.yaml`, and `yaml/hive.yaml` 
to use a new name for ConfigMap:
  ```sh
  # terminal-command
  vi env.sh

  CONF_DIR_CONFIGMAP=hivemr3-conf-configmap-2
  ```
  ```sh
  # terminal-command
  vi run-metastore.sh

  kubectl create -n $MR3_NAMESPACE secret generic env-secret-2 --from-file=$BASE_DIR/env.sh
  ```
  ```sh
  # terminal-command
  vi run-hive.sh

  kubectl create -n $MR3_NAMESPACE secret generic env-secret-2 --from-file=$BASE_DIR/env.sh
  ```
  ```yaml
  # terminal-command
  vi yaml/metastore.yaml

  spec:
    template:
      spec:
        volumes:
        - name: env-k8s-volume
          secret:
            secretName: env-secret-2
        - name: conf-k8s-volume
          configMap:
            name: hivemr3-conf-configmap-2
  ```
  ```yaml
  # terminal-command
  vi yaml/hive.yaml

  spec:
    template:
      spec:
        volumes:
        - name: env-k8s-volume
          secret:
            secretName: env-secret-2
        - name: conf-k8s-volume
          configMap:
            name: hivemr3-conf-configmap-2
  ```

* If necessary, update `conf/ranger-hive-security.xml` to use a different Hive service for Ranger.
  ```xml
  # terminal-command
  vi conf/ranger-hive-security.xml

    <property>
      <name>ranger.plugin.hive.service.name</name>
      <value>INDIGO_hive2</value>
    </property>
  ```

Now the user can execute the script `run-hive.sh` to start a new HiveServer2 instance.
Set `MR3_SHARED_SESSION_ID` to the value generated by the first HiveServer2 instance.

```sh
# terminal-command
export MR3_SHARED_SESSION_ID=59eb6c06-655e-48ad-b881-28516fd8d13c
# terminal-command
./run-hive.sh
```

