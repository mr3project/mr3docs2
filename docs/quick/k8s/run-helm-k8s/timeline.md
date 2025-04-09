---
title: With MR3-UI and Grafana
sidebar_position: 2
---

This page explains additional steps for running MR3-UI and Grafana along with Hive on MR3.

:::caution
If `install.sh` was not executed while installing Hive on MR3,
manually create symbolic links to the two directories `kubernetes/timeline-conf` and `kubernetes/timeline-key`.

```sh
# terminal-command
ln -s ../../kubernetes/timeline-conf/ timeline/conf
# terminal-command
ln -s ../../kubernetes/timeline-key/ timeline/key
```
:::

The file `timeline/values.yaml` defines the default values for the Helm chart.
Typically the user creates another YAML file to override some of these default values.
In our example, we create a new YAML file `timeline/values-timeline.yaml`.

To run MR3-UI and Grafana, we need to check or update the following files.

```yaml
├── hive/conf
│   ├── mr3-site.xml
│   └── yarn-site.xml
└── timeline/conf
    ├── configs.env
    └── prometheus.yml
```

## Setting environment variables

To run MR3-UI and Grafana, we should fix the values for two environment variables
`MR3_APPLICATION_ID_TIMESTAMP` and `ATS_SECRET_KEY`.

* Set `MR3_APPLICATION_ID_TIMESTAMP` to a positive integer
whose last four digits determine the name of the Service for exposing MR3 DAGAppMaster.
It should be fixed in advance
so that we can configure Prometheus which contacts MR3 DAGAppMaster to collect data (in `timeline/conf/prometheus.yml`).
* Set `ATS_SECRET_KEY` to a random string
which is used as a secret key for accessing the Timeline Server.
By setting `ATS_SECRET_KEY`,
we ensure that both the Timeline Server and MR3 DAGAppMaster share the same secret key.
Then MR3 DAGAppMaster can deliver history logs to the Timeline Server.

When using Helm,
we specify values for the two environment variables in `values-hive.yaml` and `values-timeline.yaml`,
as shown in the example below.

* The field `amConfig.timestamp` in `hive/values-hive.yaml` sets `MR3_APPLICATION_ID_TIMESTAMP`.
* The fields `amConfig.atsSecretKey` in `hive/values-hive.yaml` and `timeline.secretKey` in `timeline/values-timeline.yaml`
set `ATS_SECRET_KEY` and should use the same value.

```yaml
# terminal-command
vi hive/values-hive.yaml

amConfig:
  timestamp: 9999
  atsSecretKey: 22f767f8-7c56-421d-ac36-f2cf2392c1ba
```

```yaml
# terminal-command
vi timeline/values-timeline.yaml

timeline:
  secretKey: 22f767f8-7c56-421d-ac36-f2cf2392c1ba
```

## Basic settings

Open `timeline/values-timeline.yaml` and set the following fields. 

```yaml
# terminal-command
vi values-timeline.yaml

docker:
  image: mr3project/mr3ui:1.5

timeline:
  externalIp: 192.168.10.1

hostAliases:
- ip: "192.168.10.1"
  hostnames:
  - "orange1"
```

* `docker.image` specifies the full name of the Docker image including a tag.
We use the pre-built Docker image `mr3project/mr3ui:1.5`.
* `timeline.externalIp` specifies the host for the Service for exposing MR3-UI and Grafana to the outside of the Kubernetes cluster.
The user should specify an IP address with a valid host name.
* `hostAliases` lists aliases for hosts that may not be found in the default DNS.
It should include the host assigned to the Service for exposing MR3-UI and Grafana.

## PersistentVolume for MR3-UI and Grafana

We need a PersistentVolume for storing data for MR3-UI and Prometheus.
The user should update `timeline/values-timeline.yaml` to use a desired type of PersistentVolume.
In our example, we create a PersistentVolume using NFS.
The PersistentVolume should be writable to the user with UID 1000.

Open `timeline/values-timeline.yaml` and set the following fields. 

```yaml
# terminal-command
vi timeline/values-timeline.yaml

workDir:
  isNfs: true
  nfs:
    server: "192.168.10.1"
    path: "/home/nfs/hivemr3"
  volumeSize: 10Gi
  volumeClaimSize: 10Gi
  storageClassName: ""
  volumeStr:
```

* `workDir/isNfs` specifies whether the PersistentVolume uses NFS or not.
* `workDir/nfs/server` and `workDir/nfs/path` specify the address of the NFS server and the path exported by the NFS server (when `workDir/isNfs` is set to true).
* `workDir/volumeSize` and `workDir/volumeClaimSize` specify the size of the PersistentVolume and the PersistentVolumeClaim.
* `workDir/storageClassName` specifies the StorageClass of the PersistentVolume.
* `workDir/volumeStr` specifies the PersistentVolume to use when `workDir/isNfs` is set to false. For example, `volumeStr: "hostPath:\n  path: /work/nfs/mr3-run-work-dir"` creates a hostPath PersistentVolume.

## `hive/conf/mr3-site.xml`

The following configuration keys should be set to true
in order for MR3 DAGAppMaster to send data to the Timeline Server and Prometheus.

```xml
# terminal-command
vi hive/conf/mr3-site.xml

<property>
  <name>mr3.app.history.logging.enabled</name>
  <value>true</value>
</property>

<property>
  <name>mr3.dag.history.logging.enabled</name>
  <value>true</value>
</property>

<property>
  <name>mr3.prometheus.enable.metrics</name>
  <value>true</value>
</property>
```

## `hive/conf/yarn-site.xml`

To use a Timeline Server,
the configuration key `yarn.timeline-service.enabled` should be set to true.

```xml
# terminal-command
vi hive/conf/yarn-site.xml

<property>
  <name>yarn.timeline-service.enabled</name>
  <value>true</value>
</property>
```

## `timeline/conf/configs.env`

This file configures MR3-UI to specify the address of the Timeline Server.
Since MR3-UI pages are the output of a JavaScript application running on the client side,
the `timeline` field should be a valid address **outside the Kubernetes cluster.**
Set it to use the host assigned to the Service for exposing MR3-UI and Grafana.

```sh
# terminal-command
vi timeline/conf/configs.env

ENV = {
  hosts: {
    timeline: "http://orange1:9188/"
  },
};
```

## `timeline/conf/prometheus.yml`

This file configures the Prometheus server.
The field `static_configs/targets` should specify the address of MR3 DAGAppMaster,
so use the last four digits of `MR3_APPLICATION_ID_TIMESTAMP`
(e.g., `9999` in `service-master-9999-0`).

```yaml
# terminal-command
vi timeline/conf/prometheus.yml

    static_configs:
      - targets: ["service-master-9999-0.hivemr3.svc.cluster.local:9890", "service-master-9999-0.hivemr3.svc.cluster.local:9890"]
```

## Running MR3-UI and Grafana

Assuming that 
a new YAML file `timeline/values-timeline.yaml` overrides the default values in `timeline/values.yaml`, 
the user can run MR3-UI and Grafana with namespace `hivemr3` as follows.

```sh
# terminal-command
helm install --namespace hivemr3 timeline -f timeline/values-timeline.yaml
```

Then the user can execute Metastore and HiveServer2.

## Accessing MR3-UI and Grafana

In our example,
the host assigned to the Service for MR3-UI and Grafana is `orange1`,
so we access MR3-UI and Grafana at the following URLs.

* MR3-UI: `http://orange1:8080`
* Grafana: `http://orange1:3000`

MR3-UI shows details of DAGs executed by MR3 for Hive.

![typescript-mr3ui-fs8](/quickstart/typescript-mr3ui-fs8.png)

For Grafana,
the password for the user `admin` is initialized to `admin`,
and can be changed after the first login.
The user can watch MR3 for Hive on the dashboard `MR3 for Hive`.

![typescript-grafana-dashboards-fs8](/quickstart/typescript-grafana-dashboards-fs8.png)

