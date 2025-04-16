---
title: With SSL Encryption
sidebar_position: 4
---

This page explains additional steps for 
using SSL (Secure Sockets Layer) encryption in Hive on MR3.
For simplicity,
secure connection to database servers for Metastore and Ranger is not enabled.
See [SSL Encryption](/docs/guides/ssl/) for details.

## Certificates and secrets

Create certificates and secrets by following the instructions in
[Creating certificates and secrets for SSL](../common/create-ssl).

Copy `hivemr3-ssl-certificate.jceks` and `hivemr3-ssl-certificate.jks`
in the directories `hive/key`,`ranger/key`, and `timeline/key`.

```sh
# terminal-command
ls hive/key/*{jceks,jks}
hive/key/hivemr3-ssl-certificate.jceks  hive/key/hivemr3-ssl-certificate.jks

# terminal-command
ls ranger/key/*{jceks,jks}
ranger/key/hivemr3-ssl-certificate.jceks  ranger/key/hivemr3-ssl-certificate.jks

# terminal-command
ls timeline/key/*{jceks,jks}
timeline/key/hivemr3-ssl-certificate.jceks timeline/key/hivemr3-ssl-certificate.jks
```

## `hive/values-hive.yaml`, `ranger/values-ranger.yaml`, and `timeline/values-timeline.yaml`

Update `hive/values-hive.yaml`, `ranger/values-ranger.yaml`, and `timeline/values-timeline.yaml`
to create Secrets from files in the directories `hive/key`, `ranger/key`, and `timeline/key`.

```yaml
# terminal-command
vi hive/values-hive.yaml

hive:
  createSecret: true
```

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

## `hive/env-secret.sh`

Update `hive/env-secret.sh` as follows.

```sh
# terminal-command
vi hive/env-secret.sh

HIVE_SERVER2_SSL_TRUSTSTOREPASS=MySslPassword123
export HADOOP_CREDSTORE_PASSWORD=MySslPassword123
``` 
* `HIVE_SERVER2_SSL_TRUSTSTOREPASS` and `HADOOP_CREDSTORE_PASSWORD` should be set to the password for KeyStores and TrustStores (specified when creating certificates and secrets).

`HADOOP_CREDSTORE_PASSWORD` should be appended to the values of the configuration keys `mr3.am.launch.env` and `mr3.container.launch.env`
in `hive/conf/mr3-site.xml`.

```xml
# terminal-command
vi hive/conf/mr3-site.xml

<name>mr3.am.launch.env</name>
  <value>LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/opt/mr3-run/hadoop/apache-hadoop/lib/native,HADOOP_CREDSTORE_PASSWORD,AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY,AWS_REGION</value>
</property>

<property>
  <name>mr3.container.launch.env</name>
  <value>LD_LIBRARY_PATH=/opt/mr3-run/hadoop/apache-hadoop/lib/native,HADOOP_CREDSTORE_PASSWORD,AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY,AWS_REGION</value>
</property>
```

## `timeline/env.sh`

Update `timeline/env.sh` as follows.

```sh
# terminal-command
vi timeline/env.sh

export HADOOP_CREDSTORE_PASSWORD=MySslPassword123
```

* `HADOOP_CREDSTORE_PASSWORD` should be set to the password for KeyStores and TrustStores (specified when creating certificates and secrets).

## Configuring for SSL Encryption

Follow the instructions in [Configuring for SSL Encryption](../common/configure-ssl).

