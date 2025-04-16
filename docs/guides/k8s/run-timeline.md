---
title: Configuring Timeline Server
sidebar_position: 25
---

A Timeline Server in a Kubernetes cluster enables DAGAppMaster to report the status of every DAG.
Then the user can check the progress of running DAGs and the history of completed DAGs
with MR3-UI.

:::tip
We recommend that the user try the quick start guide for running Hive on MR3 on Kubernetes
[with MR3-UI and Grafana](/docs/quick/k8s/run-k8s/timeline).
:::

## Configuring Timeline Server Pod

The following files configure Kubernetes objects for Timeline Server.

```ssh
├── env.sh
└── yaml
    ├── timeline-service.yaml
    ├── timeline.yaml
    ├── workdir-pv-timeline.yaml
    └── workdir-pvc-timeline.yaml
```

Timeline Server uses `workdir-pv-timeline.yaml` and `workdir-pvc-timeline.yaml` 
which can be configured similarly to `workdir-pv.yaml` and `workdir-pvc.yaml`.
The PersistentVolume should be writable to the user with UID 1000.

### `env.sh`

The user should set the following environment variable in `env.sh`.

```sh
# terminal-command
vi env.sh

CREATE_TIMELINE_SECRET=true
```

* `CREATE_TIMELINE_SECRET` specifies whether or not to create a Secret from keytab files in the directory `timeline-key`.
It should be set to true if Kerberos is used for authentication.

### `timeline-service.yaml`

This manifest defines a Service for exposing Timeline Server to the outside of the Kubernetes cluster.
The user should specify a public IP address with a valid host name and two port numbers for Timeline Server
so that both clients from the outside and DAGAppMaster from the inside can connect to it using the host name.

```yaml
# terminal-command
vi yaml/timeline-service.yaml

  ports:
  - name: timelineserver-http
    protocol: TCP
    port: 9188
    targetPort: 9188
  - name: timelineserver-https
    protocol: TCP
    port: 9190
    targetPort: 9190
  externalIPs:
  - 10.1.91.41
```

In our example, we use 10.1.91.41:9188 as the HTTP address
and 10.1.91.41:9190 as the HTTPS address of Timeline Server.

### `timeline.yaml`

This manifest defines a Pod for running Timeline Server.
Most of the sections in it work okay with default settings,
except for the `spec.containers` section which should be updated
according to Kubernetes cluster settings.

* The `image` field specifies the Docker image for Timeline Server.
* The `resources.requests` and `resources.limits` specify the resources to be allocated to a Timeline Server Pod.
* The `ports.containerPort` fields should match the port numbers specified in `timeline-service.yaml`.

```yaml
# terminal-command
vi yaml/timeline.yaml

spec:
  containers:
  - image: mr3project/mr3ui:1.5
    command:
    - /opt/mr3-run/ats/timeline-service.sh
    resources:
      requests:
        cpu: 0.25
        memory: 1024Mi
      limits:
        cpu: 0.25
        memory: 1024Mi
    ports:
    - containerPort: 9190
      protocol: TCP
    - containerPort: 9188
      protocol: TCP
```
 
## Configuring Timeline Server

The directory `timeline-conf` contains configuration files for Timeline Server.

### `yarn-site.xml` 

The user should update the following configurations if the port numbers specified in `timeline-service.yaml` are different 
from default values of 9188 and 9190.

* `yarn.timeline-service.webapp.address` for the HTTP address
* `yarn.timeline-service.webapp.https.address` for the HTTPS address

To use Kerberos authentication,
set the configuration key `yarn.timeline-service.http-authentication.type` to `kerberos`
and use a Kerberos keytab file as shown below.
**The service principal should use the host name for the Service for Timeline Server**
(e.g., `indigo20` in `HTTP/indigo20@RED` which corresponds to `externalIPs` in `timeline-service.yaml`).

```xml
# terminal-command
vi timeline-conf/yarn-site.xml

<property>
  <name>yarn.timeline-service.http-authentication.type</name>
  <value>kerberos</value>
</property>

<property>
  <name>yarn.timeline-service.http-authentication.kerberos.principal</name>
  <value>HTTP/indigo20@RED</value>
</property>

<property>
  <name>yarn.timeline-service.http-authentication.kerberos.keytab</name>
  <value>/opt/mr3-run/ats/key/spnego.service.keytab</value>
</property>
```

If Kerberos authentication is not used,
set the configuration key `yarn.timeline-service.http-authentication.type` to `simple`.

### `krb5.conf`

When using Kerberos authentication,
this file should contains the information for Kerberos configuration.
Usually it suffices to use a copy of `conf/krb5.conf`.

