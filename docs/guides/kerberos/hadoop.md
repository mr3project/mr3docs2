---
title: "On Hadoop"
sidebar_position: 10
---

The quick start guide for running Hive on MR3 [on Secure Hadoop](../../quick/hadoop/run-hadoop-kerberos)
includes instructions for using Kerberos authentication on Hadoop.
This page provides additional details for reference.

On secure Hadoop, the configuration key `hadoop.security.authentication`
is set to `kerberos` in `core-site.xml` of Yarn.

```xml
# terminal-command
vi /etc/hadoop/conf/core-site.xml

<property>
  <name>hadoop.security.authentication</name>
  <value>kerberos</value>
</property>
```

## Keytab files

To run Hive on MR3 in a secure Hadoop cluster with Kerberos enabled,
the user should have permission to obtain Kerberos tickets and create keytab files.
The following commands are commonly used:

```sh
# terminal-command
kinit <your principal>      # for getting a new Kerberos ticket
# terminal-command
ktutil                      # for creating a keytab file
```

In order to run Metastore and HiveServer2,
the user (or the administrator) should have access to a service keytab file.
Typically the service keytab file is associated with service name `hive`.
The format of the principal in the service keytab file should be `service/instance@REALM`.

For example, the principal in a service keytab file can be `hive/node0@MR3.COM`
where `hive` is the service name, `node0` is the host where Metastore or HiveServer2 runs,
and `MR3.COM` is the realm which is usually the domain name of the host.

In comparison,
the format of the user principal in an ordinary keytab file is `user@REALM`
without an instance field.

## Configuring Hive on MR3

In order to use Kerberos authentication,
`hadoop/env.sh`
should be updated before starting Metastore and HiveServer2.

```sh
# terminal-command
vi hadoop/env.sh

SECURE_MODE=true

HIVE_METASTORE_KERBEROS_PRINCIPAL=hive/_HOST@HADOOP
HIVE_METASTORE_KERBEROS_KEYTAB=/etc/security/keytabs/hive.service.keytab

HIVE_SERVER2_AUTHENTICATION=NONE
HIVE_SERVER2_KERBEROS_PRINCIPAL=hive/_HOST@HADOOP
HIVE_SERVER2_KERBEROS_KEYTAB=/home/hive/hive.keytab

USER_PRINCIPAL=hive@HADOOP
USER_KEYTAB=/home/hive/hive.keytab

TOKEN_RENEWAL_HDFS_ENABLED=true
```

* `SECURE_MODE` specifies whether the cluster is secure with Kerberos or not.
* `HIVE_METASTORE_KERBEROS_PRINCIPAL` and `HIVE_METASTORE_KERBEROS_KEYTAB` specify the principal and keytab file for Metastore,
and correspond to the configuration keys `hive.metastore.kerberos.principal` and `hive.metastore.kerberos.keytab.file` in `hive-site.xml`.
* `HIVE_SERVER2_AUTHENTICATION` specifies the authentication option for HiveServer2: NONE, NOSASL, KERBEROS, LDAP, PAM, and CUSTOM.
It corresponds to the configuration key `hive.server2.authentication` in `hive-site.xml`.
* `HIVE_SERVER2_KERBEROS_PRINCIPAL` and `HIVE_SERVER2_KERBEROS_KEYTAB` specify the principal and keytab file for HiveServer2,
and correspond to the configuration keys `hive.server2.authentication.kerberos.principal` and `hive.server2.authentication.kerberos.keytab` in `hive-site.xml`. 
* `USER_PRINCIPAL` and `USER_KEYTAB` specify the principal and keytab file for the user connecting to HiveServer2.
* `TOKEN_RENEWAL_HDFS_ENABLED` should be set to true in order to automatically renew HDFS tokens.

