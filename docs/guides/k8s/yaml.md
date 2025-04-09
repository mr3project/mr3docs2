---
title: "Setting YAML files"
sidebar_position: 5
---

Below we provide details about YAML files in the `yaml` directory.

These files should be updated to reflect the settings in `env.sh`
and the specific configuration of the Kubernetes cluster.
Since YAML files do not read environment variables, all necessary updates must be made manually.

## Common to all Pods

### `namespace.yaml`

This manifest defines a namespace for all Kubernetes objects. 
The `name` field should match the namespace specified in `MR3_NAMESPACE` in `kubernetes/env.sh`.

```yaml
# terminal-command
vi yaml/namespace.yaml

  name: hivemr3
```

Similarly the `namespace` field in the other YAML files should match the same namespace.

### `hive-service-account.yaml`

This manifest defines a ServiceAccount. 
The name of the ServiceAccount object (`hive-service-account`) is read in `run-hive.sh`,
so there is no need to update this file.

### `cluster-role.yaml`

This manifest defines a ClusterRole. 
The name of the ClusterRole resource (`node-reader`) is read in `run-hive.sh`,
so there is no need to update this file.

### `metastore-role.yaml`

This manifest defines a Role for a Metastore Pod.
The name of the Role resource (metastore-role) is read in `run-metastore.sh`,
so there is no need to update this file.

### `hive-role.yaml`

This manifest defines a Role for HiveServer2 Pods.
The name of the Role resource (`hive-role`) is read in `run-hive.sh`,
so there is no need to update this file.

### `workdir-pv.yaml`

This manifest defines a PersistentVolume for copying the result of running a query from ContainerWorkers to HiveServer2.
The user should update it in order to use a desired type of PersistentVolume.

### `workdir-pvc.yaml`

This manifest defines a PersistentVolumeClaim which references the PersistentVolume created by `workdir-pv.yaml`.
**The user should specify the size of the storage.**

```yaml
# terminal-command
vi yaml/workdir-pvc.yaml

      storage: 10Gi
```

## Configuring Metastore

### `metastore-service.yaml`

This manifest defines a governing Service required for the StatefulSet for Metastore.
The user should use the same port number specified by the environment variable `HIVE_METASTORE_PORT` in `env.sh`.

```yaml
# terminal-command
vi yaml/metastore-service.yaml

  ports:
  - name: tcp
    port: 9850
```

### `metastore.yaml`

This manifest defines a Pod for running Metastore. 
The user should update several sections in this file according to Kubernetes cluster settings.

In the `spec.template.spec.containers` section:

* The `image` field should match the Docker image specified by `DOCKER_HIVE_IMG` in `env.sh`. 
* The `resources.requests` and `resources.limits` specify the resources to to be allocated to a Metastore Pod.
* The `ports.containerPort` field should match the port number specified in `metastore-service.yaml`.

```yaml
# terminal-command
vi yaml/metastore.yaml

spec:
  template:
    spec:
      containers:
      - image: mr3project/hive:4.0.0.mr3.2.0
        resources:
          requests:
            cpu: 2
            memory: 16Gi
          limits:
            cpu: 2
            memory: 16Gi
        ports:
        - containerPort: 9850
          protocol: TCP
```

In the `spec.template.spec.volumes` section:

* The `configMap.name` field under `conf-k8s-volume` should match the name specified by `CONF_DIR_CONFIGMAP` in `env.sh`.
* The `secret.secretName` field under `key-k8s-volume` should match the name specified by `KEYTAB_SECRET` in `env.sh`.

```yaml
# terminal-command
vi yaml/metastore.yaml

spec:
  template:
    spec:
      volumes:
      - name: conf-k8s-volume
        configMap:
          name: hivemr3-conf-configmap
      - name: key-k8s-volume
        secret:
          secretName: hivemr3-keytab-secret
```

In the `spec.template.spec.hostAliases` section:

* `HIVE_DATABASE_HOST` in `env.sh` specifies the host where the database for Metastore is running.
If it uses a host unknown to the default DNS,
the user should add its alias. 
The following example adds host names `red0` and `indigo20` that are unknown to the default DNS.

```yaml
# terminal-command
vi yaml/metastore.yaml

spec:
  template:
    spec:
      hostAliases:
      - ip: "10.1.91.4"
        hostnames:
        - "red0"
      - ip: "10.1.91.41"
        hostnames:
        - "indigo20"
```

## Configuring HiveServer2

### `hiveserver2-service.yaml`

This manifest defines a Service for exposing HiveServer2 to the outside of the Kubernetes cluster.
The user should specify a public IP address with a valid host name and a port number
(with name `thrift`) for HiveServer2
so that clients can connect to it from the outside of the Kubernetes cluster.
Another port number with name `http` should be specified if HTTP transport is enabled
(by setting the configuration key `hive.server2.transport.mode` to `all` or `http` in `conf/hive-site.xml`).
The host name is necessary in order for Ranger to securely communicate with HiveServer2.

```yaml
# terminal-command
vi yaml/hiveserver2-service.yaml

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
  - 10.1.91.41
```

In our example, we use 10.1.91.41:9852 as the full address of HiveServer2.
The user should make sure that the IP address exists with a valid host name and is not already taken.

### `hive.yaml`

This manifest defines a Pod for running HiveServer2 (by creating a Deployment).
The user should update several sections in this file according to Kubernetes cluster settings.

In the `spec.template.spec.containers` section:

* The `image` field should match the Docker image specified by `DOCKER_HIVE_IMG` in `env.sh`. 
* The `args` field specifies the DAGAppMaster mode: `--localthread` for LocalThread mode, `--localprocess` for LocalProcess mode, and `--kubernetes` for Kubernetes mode.
* The `resources.requests` and `resources.limits` fields specify the resources to to be allocated to a HiveServer2 Pod.
* The three fields `ports.containerPort`, `readinessProbe.tcpSocket.port`, and `livenessProbe.tcpSocket.port`
should match the port number specified in `hiveserver2-service.yaml`.

```yaml
$ vi yaml/hive.yaml

spec:
  template:
    spec:
      containers:
      - image: mr3project/hive:4.0.0.mr3.2.0
        args: ["start", "--kubernetes"]
        resources:
          requests:
            cpu: 4
            memory: 32Gi
          limits:
            cpu: 4
            memory: 32Gi
        ports:
        - containerPort: 9852
        readinessProbe: 
          tcpSocket: 
            port: 9852 
        livenessProbe: 
          tcpSocket: 
            port: 9852 
``` 

In the `spec.template.spec.volumes` section:

* The `configMap.name` field under `conf-k8s-volume` should match the name specified by `CONF_DIR_CONFIGMAP` in `env.sh`.
* The `secret.secretName` field under `key-k8s-volume` should match the name specified by `KEYTAB_SECRET` in `env.sh`.

```yaml
# terminal-command
vi yaml/hive.yaml

spec:
  template:
    spec:
      volumes:
      - name: conf-k8s-volume
        configMap:
          name: hivemr3-conf-configmap
      - name: key-k8s-volume
        secret:
          secretName: hivemr3-keytab-secret
```

The `spec.template.spec.hostAliases` field can list aliases for hosts that may not be found in the default DNS. 
For example, the host running Metastore may be unknown to the default DNS,
in which case the user can add an alias for it.

