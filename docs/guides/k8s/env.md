---
title: "Setting env.sh"
sidebar_position: 5
---

Below we provide details about the environment variables in `env.sh`.

## Common to all Pods

```sh
# terminal-command
vi env.sh

MR3_NAMESPACE=hivemr3
MR3_SERVICE_ACCOUNT=hive-service-account
CONF_DIR_CONFIGMAP=hivemr3-conf-configmap

MASTER_SERVICE_ACCOUNT=master-service-account
WORKER_SERVICE_ACCOUNT=worker-service-account

CREATE_KEYTAB_SECRET=true   
KEYTAB_SECRET=hivemr3-keytab-secret
CREATE_WORKER_SECRET=true
WORKER_SECRET=hivemr3-worker-secret
```

### General

* `MR3_NAMESPACE` specifies the namespace for all Kubernetes objects.
* `MR3_SERVICE_ACCOUNT` specifies the ServiceAccount for Hive on MR3.
* `CONF_DIR_CONFIGMAP` specifies the name of the ConfigMap to be built from files in the directory `kubernetes/conf`.

### ServiceAccount

* `MASTER_SERVICE_ACCOUNT` specifies the ServiceAccount for MR3 DAGAppMaster.
* `WORKER_SERVICE_ACCOUNT` specifies the ServiceAccount for MR3 ContainerWorkers.

### Secret

* `CREATE_KEYTAB_SECRET` specifies whether or not to create a Secret from files in the directory `kubernetes/key`.
It should be set to true if Kerberos is used for authentication.
* `KEYTAB_SECRET` specifies the name of the Secret to be built when `CREATE_KEYTAB_SECRET` is set to true.
* `CREATE_WORKER_SECRET` specifies whether or not to create a Secret for MR3 ContainerWorkers.
* `WORKER_SECRET` specifies the name of the Secret to be built when `CREATE_WORKER_SECRET` is set to true.

## For Metastore

```sh
# terminal-command
vi env.sh

HIVE_DATABASE_HOST=red0
HIVE_METASTORE_HOST=hivemr3-metastore-0.metastore.hivemr3.svc.cluster.local
HIVE_METASTORE_PORT=9850
HIVE_DATABASE_NAME=hivemr3

HIVE_WAREHOUSE_DIR=/opt/mr3-run/work-dir/warehouse/

METASTORE_SECURE_MODE=true
HIVE_METASTORE_KERBEROS_PRINCIPAL=hive/indigo20@RED
HIVE_METASTORE_KERBEROS_KEYTAB=$KEYTAB_MOUNT_DIR/hive.service.keytab
```

### General

* `HIVE_DATABASE_HOST` specifies the host where the database server for Metastore is running.
* `HIVE_METASTORE_HOST` and `HIVE_METASTORE_PORT` specify the address of Metastore itself.
  As we want to create a Metastore Pod, set `HIVE_METASTORE_HOST` to `hivemr3-metastore-0.metastore.hivemr3.svc.cluster.local`.
  Here `hivemr3-metastore-0` is the unique name of the Pod that will be running Metastore,
  and `hivemr3` is the namespace.
  In order to use an existing Metastore running as an external component (without creating a new Metastore Pod), set `HIVE_METASTORE_HOST` to its host (e.g., `red0`).
* `HIVE_DATABASE_NAME` specifies the database name for Metastore in the MySQL server.

### Warehouse

* `HIVE_WAREHOUSE_DIR` specifies the path to the Hive warehouse.
Since MR3 is agnostic to the type of data sources,
it is important to specify the full path to the warehouse, **including the file system.**
If no file system is given, MR3 assumes the local file system
because the configuration key `fs.defaultFS` is set to `file:///` in `conf/core-site.xml`.

Since the date warehouse is shared by all the components of Hive on MR3, 
its path should be globally valid in every Pod.
For example, `HIVE_WAREHOUSE_DIR=hdfs://red0:8020/tmp/hive` is okay because it points to a globally valid location (directory `/tmp/hive` on HDFS running on `red0`).
If not, the user may not be able to create new databases or tables.
For example, if we set `HIVE_WAREHOUSE_DIR` to `/foo/bar` where Metastore has no write permission inside its Pod, the user cannot create new databases or tables.
If Metastore happens to have write permission on `/foo/bar`,
the user can create new databases and tables.

Below are a few examples of the path.
For running Hive on MR3 in a Kubernetes cluster,
the user should use either `hdfs` or `s3a` for the file system.

* `/opt/mr3-run/work-dir/warehouse/`:
  A local directory inside the HiveServer2 Pod is used for the Hive warehouse.
  Since the local directory is not visible to the outside,
  this works only if all the components (HiveServer2, DAGAppMaster, and ContainerWorkers) run in the same Pod.
* `hdfs://red0:8020/user/hive/warehouse`:
  An HDFS directory with NameNode on `red0` is used for the Hive warehouse.
* `s3a://mr3-bucket/warehouse`:
  An S3 bucket is used for the Hive warehouse.

:::info
When initializing schema,
Metastore reads the environment variable `HIVE_WAREHOUSE_DIR` in `env.sh` and stores the path to the data warehouse in the MySQL database.
Once the path to the data warehouse is registered in Metastore, the user can update it only by directly accessing the MySQL database.
Hence setting `HIVE_WAREHOUSE_DIR` to a new path and restarting HiveServer2 has no effect. 
:::

### Security

* If Metastore uses Kerberos authentication and runs in a secure mode, `METASTORE_SECURE_MODE` should be set to true.
If HiveServer2 uses Kerberos authentication, `METASTORE_SECURE_MODE` should also be set to true. 
* `HIVE_METASTORE_KERBEROS_PRINCIPAL` specifies the service principal, and 
`HIVE_METASTORE_KERBEROS_KEYTAB` specifies the name of the service keytab file which should be copied to the directory `kubernetes/key` by the user.

If `HIVE_DATABASE_HOST` and `HIVE_METASTORE_HOST` use hosts unknown to the default DNS,
the user should add their aliases in the field `spec.template.spec.hostAliases` of
`yaml/metastore.yaml` and `yaml/hive.yaml`.
The following example adds host names `red0` and `indigo20` that are unknown to the default DNS.

```yaml
# terminal-command
vi yaml/hive.yaml

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

## For HiveServer2

```sh
# terminal-command
vi env.sh

HIVE_SERVER2_HOST=$HOSTNAME
HIVE_SERVER2_PORT=9852
HIVE_SERVER2_HTTP_PORT=10001
HIVE_SERVER2_HEAPSIZE=32768

HIVE_SERVER2_AUTHENTICATION=KERBEROS
HIVE_SERVER2_KERBEROS_PRINCIPAL=hive/indigo20@RED
HIVE_SERVER2_KERBEROS_KEYTAB=$KEYTAB_MOUNT_DIR/hive.service.keytab

TOKEN_RENEWAL_HIVE_ENABLED=false
```

### General

* `HIVE_SERVER2_PORT` and `HIVE_SERVER2_HTTP_PORT` should match the port numbers specified in `yaml/hiveserver2-service.yaml`.
* `HIVE_SERVER2_HEAPSIZE` specifies the heap size (in MB) for HiveServer2.
If DAGAppMaster runs in LocalThread mode, 
the heap size should be no larger than the memory allocated to the Pod for running HiveServer2 (specified in `hive.yaml`).
If DAGAppMaster runs in LocalProcess mode,
the sum with the heap size of DAGAppMaster (specified by `mr3.am.resource.memory.mb` in `conf/mr3-site.xml`)
should be no larger than the memory allocated to the Pod.

### Security

* If HiveServer2 uses Kerberos authentication
with `HIVE_SERVER2_AUTHENTICATION` set to `KERBEROS`,
`HIVE_SERVER2_KERBEROS_PRINCIPAL` and `HIVE_SERVER2_KERBEROS_KEYTAB`
should specify the service principal and the service keytab file
(for `hive.server2.authentication.kerberos.principal` and `hive.server2.authentication.kerberos.keytab` in `hive-site.xml`), respectively. 
Note that the service name of this principal may be different from the service name in `HIVE_METASTORE_KERBEROS_PRINCIPAL`,
and the service keytab file may be different from the file in `HIVE_METASTORE_KERBEROS_KEYTAB`.
* `TOKEN_RENEWAL_HIVE_ENABLED` should be set to true in order to automatically renew Hive tokens.

