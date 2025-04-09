---
title: "SSL Encryption"
sidebar_position: 30
---

The default settings in the MR3 release do not use SSL (Secure Sockets Layer)
for communication between the components of Hive on MR3. 
This section provides additional guides on operating Hive on MR3 with SSL enabled.

We make the following assumptions.

* Hive on MR3 runs on Kubernetes. 
This section, however, can be readily adapted for other environments.
* Both Metastore and Ranger use a MySQL database.
PostgreSQL and MS SQL can be configured in a similar way.

This section has the following requirements.

* Java (which should match the Java version used by Hive on MR3)
* Hadoop binary distribution for executing the command `hadoop credentials`
* Java keytool
* openssl

The environment variables `JAVA_HOME` and `HADOOP_HOME` should be set.

```sh
# terminal-command
echo $JAVA_HOME
/usr/lib/jdk17/
# terminal-command
echo $HADOOP_HOME
/home/hive/hadoop-3.3.6
# terminal-command
which keytool
/usr/bin/keytool
# terminal-command
which openssl
/usr/bin/openssl
```

Throughout this section, we assume that the current working directory is `kubernetes`
unless otherwise noted.

:::tip
We recommend that the user try Hive on MR3 on Kubernetes
[with SSL Encryption](../../quick/k8s/run-k8s/ssl).
:::

* [Enabling SSL](./enable-ssl)
* [Running with SSL](./run)
* [Accessing S3 with SSL](./s3)
* [Secure Shuffle with SSL](./use-shufflehandler)

