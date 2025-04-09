---
title: With Kerberos
sidebar_position: 3
---

This page explains additional steps for using Kerberos authentication in Hive on MR3.

## Kerberos keytabs

In our example,
we assume that `orange1` is the host name assigned to the Services for HiveServer2, Ranger, and MR3-UI/Grafana,
and that `PL` is the Kerberos realm.

Create a Kerberos keytab file for service principal `hive/orange1@PL`.
In our example, we create a keytab file `hive-orange1.keytab`.

:::caution
The service name of the principal must be `hive` which is the value of `DOCKER_USER` in `env.sh`.
:::

Create another keytab file with a user principal. 
In our example, we can create a keytab file `hive.keytab` for principal `hive@PL`.

Copy all keytab files in the directories `hive/key` and `timeline/key`.

```sh 
# terminal-command
ls hive/key/*.keytab
hive/key/hive.keytab  hive/key/hive-orange1.keytab

# terminal-command
ls timeline/key/*.keytab
timeline/key/hive.keytab  timeline/key/hive-orange1.keytab
```

For Ranger,
create three Kerberos keytab files **with exactly the following names**
and copy them in the directory `ranger/key`.

* **`rangeradmin.keytab`** with admin service principal `rangeradmin/orange1@PL`
* **`spnego.service.keytab`** with SPNEGO service principal `HTTP/orange1@PL`
* **`rangerlookup.keytab`** with lookup principal `rangerlookup@PL`

```sh 
# terminal-command
ls ranger/key/*.keytab
ranger/key/rangeradmin.keytab  ranger/key/rangerlookup.keytab  ranger/key/spnego.service.keytab
```

## `hive/values-hive.yaml`

Update `hive/values-hive.yaml` as follows:

```yaml
# terminal-command
vi values-hive.yaml

metastore:
  secureMode: true
  kerberosPrincipal: hive/orange1@PL
  kerberosKeytab: "hive-orange1.keytab"

hive:
  createSecret: true
  authentication: KERBEROS
  kerberosPrincipal: hive/orange1@PL
  kerberosKeytab: "hive-orange1.keytab"
```

* Since Metastore uses Kerberos authentication, set `metastore/secureMode` to true.
`metastore/kerberosPrincipal` and `metastore/kerberosKeytab` specify the service principal and the service keytab file, respectively. 
* `hive/createSecret` specifies whether or not to create a Secret from files in the directory `key`
and should be set to true.
* Since HiveServer2 uses Kerberos authentication,
set `hive/authentication` to `KERBEROS`.
`hive/kerberosPrincipal` and `hive/kerberosKeytab` specify the service principal and the service keytab file, respectively. 

To access HDFS, set the following variables.

```yaml
# terminal-command
vi hive/values-hive.yaml

hdfs:
  userPrincipal: hive@PL
  userKeytab: "hive.keytab"
  tokenRenewalEnabled: true
```

* `hdfs/userPrincipal` specifies the principal to use when accessing HDFS.
* `hdfs/userKeytab` specifies the name of the keytab file.
* `hdfs/tokenRenewalEnabled` should be set to true in order to automatically renew HDFS tokens.

## `ranger/values-ranger.yaml` and `timeline/values-timeline.yaml`

Update `ranger/values-ranger.yaml` and `timeline/values-timeline.yaml`
to create Secrets from files in the directories `ranger-key` and `timeline-key`.

```yaml
# terminal-command
vi ranger/values-ranger.yaml

ranger:
  createSecret: true
```

```yaml
# terminal-command
vi timeline/values-timeline.yaml

timeline:
  createSecret: true
```

## Configuring Kerberos authentication

Follow the instructions in [Configuring Kerberos Authentication](../common/configure-kerberos).

