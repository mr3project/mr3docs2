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

Copy all keytab files in the directories `key` and `timeline-key`.

```sh 
# terminal-command
ls key/*.keytab
key/hive.keytab  key/hive-orange1.keytab

# terminal-command
ls timeline-key/*.keytab
key/hive.keytab  key/hive-orange1.keytab
```

For Ranger,
create three Kerberos keytab files **with exactly the following names**
and copy them in the directory `ranger-key`.

* **`rangeradmin.keytab`** with admin service principal `rangeradmin/orange1@PL`
* **`spnego.service.keytab`** with SPNEGO service principal `HTTP/orange1@PL`
* **`rangerlookup.keytab`** with lookup principal `rangerlookup@PL`

```sh 
# terminal-command
ls ranger-key/*.keytab
ranger-key/rangeradmin.keytab  ranger-key/rangerlookup.keytab  ranger-key/spnego.service.keytab
```

## `env.sh`

Update `env.sh` as follows.

```sh 
# terminal-command
vi env.sh

CREATE_KEYTAB_SECRET=true
CREATE_RANGER_SECRET=true
CREATE_TIMELINE_SECRET=true
 
METASTORE_SECURE_MODE=true
HIVE_METASTORE_KERBEROS_PRINCIPAL=hive/orange1@PL
HIVE_METASTORE_KERBEROS_KEYTAB=$KEYTAB_MOUNT_DIR/hive-orange1.keytab
 
HIVE_SERVER2_AUTHENTICATION=KERBEROS
HIVE_SERVER2_KERBEROS_PRINCIPAL=hive/orange1@PL
HIVE_SERVER2_KERBEROS_KEYTAB=$KEYTAB_MOUNT_DIR/hive-orange1.keytab
```

* `CREATE_KEYTAB_SECRET` specifies whether or not to create a Secret from files in the directory `key`
and should be set to true.
Similarly `CREATE_RANGER_SECRET` for creating a Secret from files in the directory `ranger-key`,
and `CREATE_TIMELINE_SECRET` for creating a Secret from files in the directory `timeline-key`.
* Since Metastore uses Kerberos authentication, set `METASTORE_SECURE_MODE` to true.
`HIVE_METASTORE_KERBEROS_PRINCIPAL` and `HIVE_METASTORE_KERBEROS_KEYTAB` specify the service principal and the service keytab file, respectively. 
* Since HiveServer2 uses Kerberos authentication,
set `HIVE_SERVER2_AUTHENTICATION` to `KERBEROS`.
`HIVE_SERVER2_KERBEROS_PRINCIPAL` and `HIVE_SERVER2_KERBEROS_KEYTAB` specify the service principal and the service keytab file, respectively. 

To access HDFS, set the following variables.

```sh 
# terminal-command
vi env.sh

USER_PRINCIPAL=hive@PL
USER_KEYTAB=$KEYTAB_MOUNT_DIR/hive.keytab
KEYTAB_MOUNT_FILE=hive.keytab

TOKEN_RENEWAL_HDFS_ENABLED=true
```

* `USER_PRINCIPAL` specifies the principal to use when accessing HDFS.
* `USER_KEYTAB` and `KEYTAB_MOUNT_FILE` specify the name of the keytab file.
* `TOKEN_RENEWAL_HDFS_ENABLED` should be set to true in order to automatically renew HDFS tokens.

## Configuring Kerberos authentication

Follow the instructions in [Configuring Kerberos Authentication](../common/configure-kerberos).

