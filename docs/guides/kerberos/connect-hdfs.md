---
title: Accessing HDFS
sidebar_position: 30
---

This page explains how to access HDFS from Hive on MR3 running on Kubernetes
with Kerberos authentication.

We assume that the current working directory is `kubernetes`.

Note that even when accessing HDFS,
the configuration key `fs.defaultFS` should be set to `file:///` in `conf/core-site.xml`,
not an HDFS address like `hdfs://red0:8020`.
This is because from the viewpoint of HiveServer2 running in a Kubernetes cluster, the default file system is the local file system.
In fact, HiveServer2 is not even aware that it is reading from HDFS.

## Accessing non-secure HDFS

In order to allow Hive on MR3 to read from non-secure HDFS,
set the configuration key `ipc.client.fallback-to-simple-auth-allowed` to true
in `conf/core-site.xml`.

```xml
# terminal-command
vi conf/core-site.xml

<property>
  <name>ipc.client.fallback-to-simple-auth-allowed</name>
  <value>true</value>
</property>
```

:::caution
If the non-secure HDFS is the only data source while Kerberos authentication is used,
the configuration key `dfs.encryption.key.provider.uri` (or `hadoop.security.key.provider.path`)
must not be set in `conf/core-site.xml`.
:::

## Accessing encrypted HDFS

### `conf/core-site.xml`

In `conf/core-site.xml`,
the user specifies the service principal for the HDFS NameNode
and the address of KMS.

```xml
# terminal-command
vi conf/core-site.xml

<property>
  <name>dfs.namenode.kerberos.principal</name>
  <value>hdfs/red0@RED</value>
</property>

<property>
  <name>dfs.encryption.key.provider.uri</name>
  <value>kms://http@red0:9292/kms</value>
</property>
```

* If the configuration key `dfs.namenode.kerberos.principal` is not specified,
Metastore may generate `java.lang.IllegalArgumentException`, e.g.:
  ```sh
  org.apache.hadoop.hive.ql.metadata.HiveException: MetaException(message:Got exception: java.io.IOException DestHost:destPort blue0:8020 , LocalHost:localPort hivemr3-metastore-0.metastore.hivemr3.svc.cluster.local/10.44.0.1:0. Failed on local exception: java.io.IOException: Couldn't set up IO streams: java.lang.IllegalArgumentException: Failed to specify server's Kerberos principal name)
  ```
* Set the configuration key `dfs.encryption.key.provider.uri`
as Hive on MR3 should obtain credentials to access encrypted HDFS.

### `conf/yarn-site.xml`

In `conf/yarn-site.xml`, the user specifies the service principal of the Yarn ResourceManager.

```xml
# terminal-command
vi conf/yarn-site.xml

<property>
  <name>yarn.resourcemanager.principal</name>
  <value>rm/red0@RED</value>
</property>
```

### `conf/hive-site.xml`

When accessing encrypted HDFS,
the configuration key `hive.mr3.dag.additional.credentials.source` in `hive-site.xml`
should be set to a path on HDFS.
Usually it suffices to use the HDFS directory storing the warehouse, e.g.:

```xml
# terminal-command
vi conf/hive-site.xml

<property>
  <name>hive.mr3.dag.additional.credentials.source</name>
  <value>hdfs://hdfs.server:8020/hive/warehouse/</value>
</property>
```

If `hive.mr3.dag.additional.credentials.source` is not set,
executing a query with no input files
(e.g., creating a fresh table or inserting values to an existing table)
generates no HDFS tokens and may fail, e.g.:
```
org.apache.hadoop.security.AccessControlException: Client cannot authenticate via:[TOKEN, KERBEROS]`
```

