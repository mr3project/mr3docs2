---
title: Configuring for SSL Encryption
sidebar_position: 3
---

This page explains how to set configurations for SSL (Secure Sockets Layer) encryption.
We update the following files under the directory `kubernetes`.

```yaml
├── conf
│   ├── core-site.xml
│   ├── yarn-site.xml
│   ├── hive-site.xml
│   ├── ranger-hive-audit.xml
│   └── ranger-hive-security.xml
├── ranger-key
│   ├── install.properties
│   └── solr.in.sh
└── timeline-conf
    ├── configs.env
    ├── core-site.xml
    └── yarn-site.xml
```

## `conf/core-site.xml`

```xml
# terminal-command
vi conf/core-site.xml

<property>
  <name>hadoop.security.credential.provider.path</name>
  <value>localjceks://file/opt/mr3-run/key/hivemr3-ssl-certificate.jceks</value>
</property>
```

* The configuration key `hadoop.security.credential.provider.path` should be set
to the path to KeyStore `hivemr3-ssl-certificate.jceks` inside Pods.

## `conf/core-site.xml` (for S3 with SSL enabled)

```xml
# terminal-command
vi conf/core-site.xml

<property>
  <name>fs.s3a.connection.ssl.enabled</name>
  <value>true</value>
</property>

<property>
  <name>fs.s3a.endpoint</name>
  <value>https://orange0:9000</value>
</property>
```

* In order to access S3 with SSL enabled,
the configuration key `fs.s3a.connection.ssl.enabled` should be set to true.
* For accessing custom S3-compatible storage, the address for the storage server should be revised.

## `conf/hive-site.xml`

```xml
# terminal-command
vi conf/hive-site.xml

<property>
  <name>javax.jdo.option.ConnectionPassword</name>
  <value>_</value>
</property>
 
<property>
  <name>hive.server2.use.SSL</name>
  <value>true</value>
</property>
```

* The configuration key `javax.jdo.option.ConnectionPassword` can be set to `_` to hide the password for the database server for Metastore.

## `conf/ranger-hive-audit.xml`

```xml
# terminal-command
vi conf/ranger-hive-audit.xml
 
  <property>
    <name>xasecure.audit.destination.solr.urls</name>
    <value>https://orange1:6083/solr/ranger_audits</value>
  </property>
```

* The configuration key `xasecure.audit.destination.solr.urls` should specify the HTTPS address for Solr.

## `conf/ranger-hive-security.xml`

```xml
# terminal-command
vi conf/ranger-hive-security.xml

  <property>
    <name>ranger.plugin.hive.policy.rest.url</name>
    <value>https://orange1:6182</value>
  </property>
```

* The configuration key `ranger.plugin.hive.policy.rest.url` should specify the HTTPS address for Ranger.

## `ranger-key/install.properties`

```xml
# terminal-command
vi ranger-key/install.properties

javax_net_ssl_keyStorePassword=MySslPassword123
javax_net_ssl_trustStorePassword=MySslPassword123
 
audit_solr_urls=https://orange1:6083/solr/ranger_audits
policymgr_external_url=https://orange1:6182
policymgr_http_enabled=false
```

* `javax_net_ssl_keyStorePassword` and `javax_net_ssl_trustStorePassword`
should be set to the password for KeyStores and TrustStores.
* `audit_solr_urls` should be set to the HTTPS address for Solr,
and `policymgr_external_url` should be set to the HTTPS address for Ranger.

## `ranger-key/solr.in.sh`

```sh
# terminal-command
vi ranger-key/solr.in.sh

SOLR_SSL_ENABLED=true
 
SOLR_SSL_KEY_STORE_PASSWORD=MySslPassword123
SOLR_SSL_TRUST_STORE_PASSWORD=MySslPassword123
```

* Setting `SOLR_SSL_ENABLED` to true enables SSL for Solr.
* `SOLR_SSL_KEY_STORE_PASSWORD` and `SOLR_SSL_TRUST_STORE_PASSWORD`
should be set to the password for KeyStores and TrustStores.

:::info
Using SSL for MR3-UI is optional
and can be disabled independently of the configuration of Hive on MR3.
In order not to use SSL for MR3-UI,
do not update the files shown below.
:::

## `conf/yarn-site.xml`

```xml
# terminal-command
vi conf/yarn-site.xml

<property>
  <name>yarn.http.policy</name>
  <value>HTTPS_ONLY</value>
</property>
```

* The configuration key `yarn.http.policy` should be set to `HTTPS_ONLY`
because MR3 DAGAppMaster contacts the Timeline Server using HTTPS.

## `timeline-conf/configs.env`

```sh
# terminal-command
vi timeline-conf/configs.env

ENV = {
  hosts: {
    timeline: "https://orange1:9190/"
  },
};
```

* The `timeline` field should use HTTPS.

## `timeline-conf/core-site.xml`

```sh
# terminal-command
vi timeline-conf/core-site.xml

<property>
  <name>hadoop.security.credential.provider.path</name>
  <value>localjceks://file/opt/mr3-run/ats/key/hivemr3-ssl-certificate.jceks</value>
</property>
```

* The configuration key `hadoop.security.credential.provider.path` should be set
to the path to KeyStore `hivemr3-ssl-certificate.jceks` inside the Timeline Server Pod.

## `timeline-conf/yarn-site.xml`

```sh
# terminal-command
vi timeline-conf/yarn-site.xml

<property>
  <name>yarn.http.policy</name>
  <value>HTTPS_ONLY</value>
</property>
```

* The configuration key `yarn.http.policy` should be set to `HTTPS_ONLY`
because the Timeline Server uses HTTPS.

## Configuring Ranger

In the Ranger service, fill the JDBC URL field with:

* `jdbc:hive2://orange1:9852/;principal=hive/orange1@PL;ssl=true;sslTrustStore=/opt/mr3-run/ranger/key/hivemr3-ssl-certificate.jks;`

## Running queries

For sending queries to HiveServer2,
the user should use the following JDBC URL:

* `jdbc:hive2://orange1:9852/;principal=hive/orange1@PL;ssl=true;sslTrustStore=/path/to/beeline-ssl.jks;trustStorePassword=beelinepassword;`

