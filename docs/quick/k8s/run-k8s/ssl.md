---
title: With SSL Encryption
sidebar_position: 4
---

This page explains additional steps for 
using SSL (Secure Sockets Layer) encryption in Hive on MR3.
For simplicity,
secure connection to database servers for Metastore and Ranger is not enabled.
See [SSL Encryption](../../../guides/ssl/) for details.

## Certificates and secrets

Create certificates and secrets by following the instructions in
[Creating certificates and secrets for SSL](../common/create-ssl).

Copy `hivemr3-ssl-certificate.jceks` and `hivemr3-ssl-certificate.jks`
in the directories `key`,`ranger-key`, and `timeline-key`.

```sh
# terminal-command
ls key/*{jceks,jks}
key/hivemr3-ssl-certificate.jceks  key/hivemr3-ssl-certificate.jks

# terminal-command
ls ranger-key/*{jceks,jks}
ranger-key/hivemr3-ssl-certificate.jceks  ranger-key/hivemr3-ssl-certificate.jks

# terminal-command
ls timeline-key/*{jceks,jks}
timeline-key/hivemr3-ssl-certificate.jceks timeline-key/hivemr3-ssl-certificate.jks
```

## `env.sh`

Update `env.sh` as follows.

```sh
# terminal-command
vi env.sh

CREATE_KEYTAB_SECRET=true
CREATE_WORKER_SECRET=true

HIVE_SERVER2_SSL_TRUSTSTOREPASS=MySslPassword123
export HADOOP_CREDSTORE_PASSWORD=MySslPassword123
``` 

* `CREATE_KEYTAB_SECRET` specifies whether or not to create a Secret from files in the directory `key`
and should be set to true.
* `CREATE_WORKER_SECRET` specifies whether or not to create a Secret for MR3 ContainerWorkers.
* `HIVE_SERVER2_SSL_TRUSTSTOREPASS` and `HADOOP_CREDSTORE_PASSWORD` should be set to the password for KeyStores and TrustStores (specified when creating certificates and secrets).

`HADOOP_CREDSTORE_PASSWORD` should be appended to the values of the configuration keys `mr3.am.launch.env` and `mr3.container.launch.env`
in `conf/mr3-site.xml`.

```xml
# terminal-command
vi conf/mr3-site.xml

<name>mr3.am.launch.env</name>
  <value>LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/opt/mr3-run/hadoop/apache-hadoop/lib/native,HADOOP_CREDSTORE_PASSWORD,AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY,AWS_REGION</value>
</property>

<property>
  <name>mr3.container.launch.env</name>
  <value>LD_LIBRARY_PATH=/opt/mr3-run/hadoop/apache-hadoop/lib/native,HADOOP_CREDSTORE_PASSWORD,AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY,AWS_REGION</value>
</property>
```

## Configuring for SSL Encryption

Follow the instructions in [Configuring for SSL Encryption](../common/configure-ssl).

