---
title: With MR3-UI and Grafana
sidebar_position: 2
---

This page explains additional steps for running MR3-UI and Grafana along with Hive on MR3.

## Setting environment variables

To run MR3-UI and Grafana, we should set two environment variables
`MR3_APPLICATION_ID_TIMESTAMP` and `ATS_SECRET_KEY`
**before executing HiveServer2.**

* Set `MR3_APPLICATION_ID_TIMESTAMP` to a positive integer
whose last four digits determine the name of the Service for exposing MR3 DAGAppMaster.
It should be fixed in advance
so that we can configure Prometheus which contacts MR3 DAGAppMaster to collect data (in `timeline-conf/prometheus.yml`).
* Set `ATS_SECRET_KEY` to a random string
which is used as a secret key for accessing the Timeline Server.
By setting `ATS_SECRET_KEY`,
we ensure that both the Timeline Server and MR3 DAGAppMaster share the same secret key.
Then MR3 DAGAppMaster can deliver history logs to the Timeline Server.

Here are examples of setting
`MR3_APPLICATION_ID_TIMESTAMP` and `ATS_SECRET_KEY`.

```sh
# set manually
# terminal-command
export MR3_APPLICATION_ID_TIMESTAMP=9999
# terminal-command
export ATS_SECRET_KEY=22f767f8-7c56-421d-ac36-f2cf2392c1ba

# generate random values
# terminal-command
export MR3_APPLICATION_ID_TIMESTAMP=$RANDOM
# terminal-command
export ATS_SECRET_KEY=$(cat /proc/sys/kernel/random/uuid)

# get the last four digits of MR3_APPLICATION_ID_TIMESTAMP
# terminal-command
printf "%04d\n" ${MR3_APPLICATION_ID_TIMESTAMP: -4}
4679
```

To run MR3-UI and Grafana, we need to check or update the following files.

```yaml
├── yaml
│   ├── timeline-service.yaml
│   └── timeline.yaml
├── conf
│   ├── mr3-site.xml
│   └── yarn-site.xml
└── timeline-conf
    ├── configs.env
    └── prometheus.yml
```

## `yaml/timeline-service.yaml`

This manifest defines a Service for exposing MR3-UI (a Jetty server) and Grafana,
as well as the Timeline Server, to the outside of the Kubernetes cluster.
The user should specify an IP address with a valid host name.

```yaml
# terminal-command
vi yaml/timeline-service.yaml

spec:
  externalIPs:
  - 192.168.10.1
```

## `yaml/timeline.yaml`

```yaml
# terminal-command
vi yaml/timeline.yaml

spec:
  template:
    spec:
      hostAliases:
      - ip: "192.168.10.1"
        hostnames:
        - "orange1"
      containers:
      - image: mr3project/mr3ui:1.5   # Timeline Server
      - image: mr3project/mr3ui:1.5   # MR3-UI
      - image: mr3project/mr3ui:1.5   # Prometheus
      - image: mr3project/mr3ui:1.5   # Grafana
```

* The `spec.hostAliases` field lists aliases for hosts that may not be found in the default DNS.
It should include the host assigned to the Service created in the previous step.
* The `image` field in the `spec.containers` section specifies the Docker image for MR3-UI and Grafana.

## PersistentVolumeClaim

MR3-UI and Grafana use the PersistentVolumeClaim `workdir-pvc` created for Hive on MR3.
The PersistentVolume should be **writable to the user with UID 1000.**

To use local directories inside the Docker containers instead
(e.g., if PersistentVolumeClaim is not created for Hive on MR3),
comment out the following lines.

```yaml
# terminal-command
vi yaml/timeline.yaml

# - name: timeline-work-dir-volume
#   mountPath: /opt/mr3-run/ats/work-dir/
#   mountPath: /opt/mr3-run/ats/prometheus/data/
#   mountPath: /opt/mr3-run/ats/grafana/data/

# - name: timeline-work-dir-volume
#   persistentVolumeClaim:
#     claimName: workdir-pvc
```

## `conf/mr3-site.xml`

The following configuration keys should be set to true
in order for MR3 DAGAppMaster to send data to the Timeline Server and Prometheus.

```xml
# terminal-command
vi conf/mr3-site.xml

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

## `conf/yarn-site.xml`

To use a Timeline Server,
the configuration key `yarn.timeline-service.enabled` should be set to true.

```xml
# terminal-command
vi conf/yarn-site.xml

<property>
  <name>yarn.timeline-service.enabled</name>
  <value>true</value>
</property>
```

## `timeline-conf/configs.env`

This file configures MR3-UI to specify the address of the Timeline Server.
Since MR3-UI pages are the output of a JavaScript application running on the client side,
the `timeline` field should be a valid address **outside the Kubernetes cluster.**
Set it to use the host assigned to the Service created with `yaml/timeline-service.yaml`.

```sh
# terminal-command
vi timeline-conf/configs.env

ENV = {
  hosts: {
    timeline: "http://orange1:9188/"
  },
};
```

## `timeline-conf/prometheus.yml`

This file configures the Prometheus server.
The field `static_configs/targets` should specify the address of MR3 DAGAppMaster,
so use the last four digits of `MR3_APPLICATION_ID_TIMESTAMP`
(e.g., `9999` in `service-master-9999-0`).

```yaml
# terminal-command
vi timeline-conf/prometheus.yml

    static_configs:
      - targets: ["service-master-9999-0.hivemr3.svc.cluster.local:9890", "service-master-9999-0.hivemr3.svc.cluster.local:9890"]
```

## Running MR3-UI and Grafana

In order to run MR3-UI and Grafana, execute the script `run-timeline.sh`.

```sh
# terminal-command
./run-metastore.sh 
# terminal-command
./run-hive.sh 

# terminal-command
./run-timeline.sh 
Error from server (AlreadyExists): namespaces "hivemr3" already exists
Error from server (AlreadyExists): secrets "env-secret" already exists
configmap/hivemr3-timeline-conf-configmap created
secret/hivemr3-timeline-secret created
ATS_SECRET_KEY=9b0b84d0-09f3-404a-bc23-019cfb50bf17
configmap/client-timeline-config created
statefulset.apps/hivemr3-timeline created
service/timeline created
```

The DAGAppMaster Pod may restart a few times 
if the MR3-UI/Grafana Pod does not start quickly (because no Timeline Server can be contacted).
The MR3-UI/Grafana Pod runs four containers.

```sh
# terminal-command
kubectl get pods -n hivemr3
NAME                                   READY   STATUS    RESTARTS   AGE
hivemr3-hiveserver2-7fbb4cb8c4-8hbfs   0/1     Running   0          2m56s
hivemr3-metastore-0                    1/1     Running   0          3m
hivemr3-timeline-0                     4/4     Running   0          56s
mr3master-6598-0-79bd5cc458-wckn7      1/1     Running   4          2m36s
```

## Accessing MR3-UI and Grafana

The ports assigned to MR3-UI (a Jetty server) and Grafana can be found in
`yaml/timeline-service.yaml`.

```yaml
# terminal-command
vi yaml/timeline-service.yaml

spec:
  ports:
  - name: mr3-ui-jetty
    protocol: TCP
    port: 8080
    targetPort: 8080
  - name: grafana
    port: 3000
    targetPort: 3000
```

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

