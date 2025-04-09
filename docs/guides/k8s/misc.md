---
title: "Miscellaneous"
sidebar_position: 100
---

## Specifying ImagePullSecrets

By default, Hive on MR3 does not use ImagePullSecrets when downloading Docker images.
The user can also use an existing ImagePullSecret in two steps.

First add a new field `spec.template.spec.imagePullSecrets.name` in `hive.yaml`:

```yaml
# terminal-command
vi yaml/hive.yaml

spec:
  template:
    spec:
      imagePullSecrets:
      - name: myregistrykey
```

Alternatively the user may add a new field `imagePullSecrets` in `hive-service-account.yaml`.

Then specify the same secret in the configuration key `mr3.k8s.pod.image.pull.secrets` in `conf/mr3-site.xml`.

```xml
# terminal-command
vi conf/mr3-site.xml

<property>
  <name>mr3.k8s.pod.image.pull.secrets</name>
  <value>myregistrykey</value>
</property>
```

(Alternatively the user may add a new field `imagePullSecrets` in `master-service-account.yaml` and `worker-service-account.yaml`.)

Similarly the user should update other YAML files (such as `metastore.yaml`) in order to use an existing ImagePullSecret.

## Liveness and readiness probes

The liveness and readiness probes of HiveServer2 performs TPC checks on the port for the default mode.

```yaml
# terminal-command
vi yaml/hive.yaml

        readinessProbe:
          tcpSocket:
            port: 9852
        livenessProbe:
          tcpSocket:
            port: 9852
```

The user can also use HTTP checks, but only if SSL is disabled.

```yaml
# terminal-command
vi yaml/hive.yaml

        readinessProbe:
          httpGet:
            path: /cliservice
            port: 10001
        livenessProbe:
          httpGet:
            path: /cliservice
            port: 10001
```

## Setting the time for waiting when recovering from a DAGAppMaster failure

If a DAGAppMaster Pod fails and the user submits a new query,
HiveServer2 tries to connect to the non-existent DAGAppMaster at least twice and up to three times: 

1) to acknowledge the completion of previous queries, if any;
2) to get an estimate number of Tasks for the new query;
3) to get the current status of DAGAppMaster. 

In each step,
HiveServer2 makes as many attempts as specified by the configuration key
`ipc.client.connect.max.retries.on.timeouts` in `conf/core-site.xml`,
where each attempt takes 20 seconds.
By default, `ipc.client.connect.max.retries.on.timeouts` is set to 3,
so HiveServer2 spends up to 3 * 20 seconds * 3 times = 180 seconds
trying to recover from a DAGAppMaster failure.

