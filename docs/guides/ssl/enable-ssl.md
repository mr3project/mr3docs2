---
title: Enabling SSL
sidebar_position: 1
---

## Overview

In order to fully support secure communication with SSL,
we need several SSL certificates.

* Self-signed SSL certificate for secure communication with internal components of Hive on MR3
(Metastore, HiveServer2, Ranger, Timeline Server).
* SSL certificate for the MySQL database for Metastore 
* SSL certificate for the MySQL database for Ranger 
* SSL certificate for Hadoop KMS (Key Management Server) when using encrypted (Kerberized) HDFS

For MySQL, the SSL certificate should be provided by the administrator.
If Metastore and Ranger share a common MySQL database, a single SSL certificate is enough.
For the case of using encrypted HDFS, 
the SSL certificates for KMS should be provided by the administrator.

:::info
KMS is required only when using encrypted HDFS.
When using S3 for storage, we do not need KMS.
:::

We will configure SSL in a Kubernetes cluster depicted in the following diagram.
Kerberos KDC (Key Distribution Center) is usually part of the Hadoop cluster,
but it can be located anywhere.

![hive.k8s.enable.ssl](/k8s/hive.k8s.enable.ssl-fs8.png)

In order to construct the Kubernetes cluster with SSL enabled, 
the user needs the following certificate files:

![ssl.certificates](/k8s/ssl.certificates-fs8.png)

In the end, the user will create several KeyStore files (for Beeline and all the components of Hive on MR3),
and configure MySQL for Ranger, MySQL for Metastore, and KMS as depicted in the following diagram:

![ssl.certificate.output](/k8s/ssl.certificate.output-fs8.png)

Here we assume that impersonation is not used, so we do not add the certificate for Metastore MySQL to the KeyStore file for KMS.

## Generating a self-signed certificate

The first step is to generate a self-signed certificate for SSL.

![/k8s/self.signed.ssl.all](/k8s/self.signed.ssl.all-fs8.png)

We use the script `generate-hivemr3-ssl.sh` to generate a self-signed certificate.
Before executing it, the use should update `config-run.sh`.

* Enable SSL by setting `ENABLE_SSL` and `ENABLE_SSL_RANGER` to true.
* Specify a **private key KeyStore file** (`mr3-ssl.jks`).
* Specify a **credential file** for the KeyStore (`mr3-ssl.jceks`).
* Specify the host names for HiveServer2 Service
(whose IP address is set in `yaml/hiveserver2-service.yaml`), 
Timeline Server Service (whose IP address is set in `yaml/timeline-service.yaml`),
Ranger Service (whose IP address is set in `yaml/ranger-service.yaml`),
Metastore Pod, KMS, and optionally MySQL database.

```sh
# terminal-command
vi config-run.sh

ENABLE_SSL=true
ENABLE_SSL_RANGER=true

MR3_SSL_KEYSTORE=/home/hive/mr3/kubernetes/mr3-ssl.jks
MR3_SSL_CREDENTIAL_PROVIDER=/home/hive/mr3/kubernetes/mr3-ssl.jceks
MR3_SSL_CREDENTIAL_PROVIDER_CHECKSUM=/home/hive/mr3/kubernetes/.mr3-ssl.jceks.crc

HIVE_SERVER2_HOST=indigo20
ATS_HOST=indigo20
RANGER_HOST=indigo20
HIVE_METASTORE_HOST=hivemr3-metastore-0.metastore.hivemr3.svc.cluster.local
KMS_HOST=red0
MYSQL_HOST=red0
```

Note that the host name for Metastore Pod contains the namespace (`hivemr3`) in the middle (not in its prefix).

:::caution
`MR3_SSL_KEYSTORE`, `MR3_SSL_CREDENTIAL_PROVIDER`, and `MR3_SSL_CREDENTIAL_PROVIDER_CHECKSUM`
must use full paths.
:::

Before executing the script `generate-hivemr3-ssl.sh`,
change the Common Name for a private key KeyStore file in the function `generate_keystore`
so that it matches the host name in the service principal specified by `HIVE_SERVER2_KERBEROS_PRINCIPAL` in `env.sh`.
For example,
if `HIVE_SERVER2_KERBEROS_PRINCIPAL` is set to `root/mr3@PL`,
the Common Name should be set to `mr3`.

```sh
# terminal-command
vi generate-hivemr3-ssl.sh

function generate_keystore {
    echo -e "\n# Generating a keystore ($MR3_SSL_KEYSTORE) #" >&2

    keytool -genkeypair -alias ssl-private-key -keyalg RSA -dname "CN=mr3" -keypass $PASSWORD -ext san=$SUBJECT_ALTERNATIVE_NAME -validity $VALID_DAYS -storetype jks -keystore $MR3_SSL_KEYSTORE -storepass $PASSWORD
```

This step is necessary in order to use a Python client for connecting to HiveServer2 that runs with SSL enabled.

Execute the script `generate-hivemr3-ssl.sh` to generate a private key KeyStore file and a credential file.

```sh
# terminal-command
$ ./generate-hivemr3-ssl.sh 
Generated keystore password: 4b41c3e6-7614-4d92-8a4b-d38b1a58831d
...

# Generating a keystore (/home/hive/mr3/kubernetes/mr3-ssl.jks) #
...

# Generating a credential file (/home/gla/mr3-run/kubernetes/mr3-ssl.jceks) #
...
```

Now the user can list three new files.

```sh 
# terminal-command
ls mr3-ssl.* .mr3-ssl.jceks.crc
.mr3-ssl.jceks.crc  mr3-ssl.jceks  mr3-ssl.jks
```

The script prints a password unique to the new KeyStore file (`4b41c3e6-7614-4d92-8a4b-d38b1a58831d` in the above example).
The user should set a few variables in the following files to this password.

* `config-run.sh` for generating TrustStore files
  ```sh
  # terminal-command
  vi config-run.sh

  MR3_SSL_KEYSTORE_PASSWORD=4b41c3e6-7614-4d92-8a4b-d38b1a58831d
  ```
* `env.sh` for HiveServer2
  ```sh
  # terminal-command
  vi env.sh

  HIVE_SERVER2_SSL_TRUSTSTOREPASS=4b41c3e6-7614-4d92-8a4b-d38b1a58831d
  export HADOOP_CREDSTORE_PASSWORD=4b41c3e6-7614-4d92-8a4b-d38b1a58831d
  ```
  In addition, append `HADOOP_CREDSTORE_PASSWORD` to the values of the configuration keys `mr3.am.launch.env` and `mr3.container.launch.env`
  in `conf/mr3-site.xml`.
  Note that for the security purpose, **the user should NOT write the password itself.**
  Just appending the string suffices because MR3 automatically sets the environment variable by reading from the system environment.
  ```xml
  # terminal-command
  vi conf/mr3-site.xml

  <property>
    <name>mr3.am.launch.env</name>
    <value>LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/opt/mr3-run/hadoop/apache-hadoop/lib/native,HADOOP_CREDSTORE_PASSWORD,AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY,AWS_REGION</value>
  </property>

  <property>
    <name>mr3.container.launch.env</name>
    <value>LD_LIBRARY_PATH=/opt/mr3-run/hadoop/apache-hadoop/lib/native,HADOOP_CREDSTORE_PASSWORD,AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY,AWS_REGION</value>
  </property>
  ```
* `ranger-key/install.properties` for Ranger
  ```sh
  # terminal-command
  vi ranger-key/install.properties

  javax_net_ssl_keyStorePassword=4b41c3e6-7614-4d92-8a4b-d38b1a58831d
  javax_net_ssl_trustStorePassword=4b41c3e6-7614-4d92-8a4b-d38b1a58831d
  ```
* `ranger-key/solr.in.sh` for Ranger
  ```sh
  # terminal-command
  vi ranger-key/solr.in.sh

  SOLR_SSL_KEY_STORE_PASSWORD=4b41c3e6-7614-4d92-8a4b-d38b1a58831d
  SOLR_SSL_TRUST_STORE_PASSWORD=4b41c3e6-7614-4d92-8a4b-d38b1a58831d
  ```

Finally use the private key KeyStore file `mr3-ssl.jks` and the password generated by `generate-hivemr3-ssl.sh`
to create a new certificate file `mr3-ssl.pem` which can be safely distributed to all the other components.

```sh
# terminal-command
keytool -export -keystore mr3-ssl.jks -alias ssl-private-key -file mr3-ssl.cert -storepass 4b41c3e6-7614-4d92-8a4b-d38b1a58831d
Certificate stored in file <mr3-ssl.cert>
...
# terminal-command
openssl x509 -inform der -in mr3-ssl.cert -out mr3-ssl.pem
```

## Ranger with SSL

![/k8s/ranger.ssl](/k8s/ranger.ssl-fs8.png)

:::info
Ranger does not support SSL with the default authentication.
:::

Running Ranger with SSL has the following prerequisites.

* A MySQL database with SSL. 
The MySQL database should be compatible with the MySQL connector jar file that 
is specified by `HIVE_MYSQL_DRIVER` in `env.sh`.
For the purpose of testing, the user can quickly create such a MySQL database (which automatically enables SSL) as follows:
  ```sh
  # terminal-command
  docker run -d --name mysql-server -p 3306:3306 -e MYSQL_ROOT_PASSWORD=passwd mysql:5.7
  ```
* The certificate file for connecting to the MySQL database.
Typically the certificate file is `/var/lib/mysql/ca.pem` or `/var/lib/mysql/ssl/ca.pem` on the node where MySQL is running.
* The user should be able to edit the certificate file for MySQL and restart MySQL.

### Certificates for SSL

The user should make a copy of the certificate file for connecting to the MySQL database for Ranger and set `MR3_RANGER_MYSQL_CERTIFICATE` in `config-run.sh` to point to the copy.

```sh
# terminal-command
vi config-run.sh

MR3_RANGER_MYSQL_CERTIFICATE=/home/hive/mr3/kubernetes/mr3-ranger-mysql.cert
```

![/k8s/mysql.certificate.ssl](/k8s/mysql.certificate.ssl-fs8.png)

Now Ranger is ready to connect to the MySQL database securely.

Then the user should extend the certificate file for MySQL (on the node where MySQL is running) so that MySQL can trust the self-signed certificate of Ranger.
Append the contents of `mr3-ssl.pem` to the certificate file for MySQL (on the node where MySQL is running).

```sh
# terminal-command
cat >> /var/lib/mysql/ca.pem
-----BEGIN CERTIFICATE-----
MIIC4DCCAcigAwIBAgIEApwQbTANBgkqhkiG9w0BAQsFADAWMRQwEgYDVQQDEwto
...
tO1G8uO6bz/AOExeN3nrxMpuTzw=
-----END CERTIFICATE-----
```

Usually appending the contents of `mr3-ssl.pem` is necessary only for two-way authentication, but depending on the version of MySQL, it may be necessary even for one-way authentication.

### Configurations for SSL

Configuring Ranger to use SSL requires the user to edit several files.
The new configurations are about: 1) enabling SSL; 2) specifying the password; 3) specifying HTTPS addresses.

In `ranger-key/install.properties`, enable SSL.
`db_ssl_auth_type` can be set to `1-way` in order to use one-way authentication. 
`audit_solr_urls` should be set to the HTTPS address for Solr,
and `policymgr_external_url` should be set to the HTTPS address for Ranger.

```sh
# terminal-command
vi ranger-key/install.properties

db_ssl_enabled=true
db_ssl_required=true
db_ssl_verifyServerCertificate=true
db_ssl_auth_type=2-way

audit_solr_urls=https://indigo20:6083/solr/ranger_audits

policymgr_external_url=https://indigo20:6182
policymgr_http_enabled=false
```

In `ranger-key/solr.in.sh`, enable SSL for Solr.

```sh
# terminal-command
vi ranger-key/solr.in.sh

SOLR_SSL_ENABLED=true

SOLR_SSL_KEY_STORE=/opt/mr3-run/ranger/key/hivemr3-ssl-certificate.jks
SOLR_SSL_TRUST_STORE=/opt/mr3-run/ranger/key/hivemr3-ssl-certificate.jks
SOLR_SSL_NEED_CLIENT_AUTH=false
SOLR_SSL_WANT_CLIENT_AUTH=false
SOLR_SSL_CHECK_PEER_NAME=true
SOLR_SSL_KEY_STORE_TYPE=JKS
SOLR_SSL_TRUST_STORE_TYPE=JKS
```

Since Ranger now uses SSL, HiveServer2 should also be reconfigured so as to communicate with Ranger securely.
In `conf/ranger-hive-security.xml`, specify the HTTPS address for Ranger.

```xml
# terminal-command
vi conf/ranger-hive-security.xml

<property>
  <name>ranger.plugin.hive.policy.rest.url</name>
  <value>https://indigo20:6182</value>
</property>
```

In `conf/ranger-hive-audit.xml`, specify the HTTPS address for Solr.

```xml
# terminal-command
vi kubernetes/conf/ranger-hive-audit.xml

<property>
  <name>xasecure.audit.destination.solr.urls</name>
  <value>https://indigo20:6083/solr/ranger_audits</value>
</property>
```

## Timeline Server with SSL

![timeline.server.ssl](/k8s/timeline.server.ssl-fs8.png)

As the user has already generated a self-signed certificate for SSL in the previous step, 
running Timeline Server with SSL has no particular prerequisite.
The user only needs to update a few configuration files before starting Timeline Server.

`timeline-conf/core-site.xml` should be configured to use the KeyStore file.

```xml
# terminal-command
vi timeline-conf/core-site.xml

<property>
  <name>hadoop.security.credential.provider.path</name>
  <value>localjceks://file/opt/mr3-run/ats/key/hivemr3-ssl-certificate.jceks</value>
</property>
```

Alternatively the user may set the password explicitly by updating `timeline-conf/ssl-server.xml`
(using the password generated by the script `generate-hivemr3-ssl.sh`).

```xml
# terminal-command
vi timeline-conf/ssl-server.xml

<property>
  <name>ssl.server.keystore.password</name>
  <value>4b41c3e6-7614-4d92-8a4b-d38b1a58831d</value>
</property>

<property>
  <name>ssl.server.keystore.keypassword</name>
  <value>4b41c3e6-7614-4d92-8a4b-d38b1a58831d</value>
</property>
```

In `timeline-conf/yarn-site.xml`,
allow only HTTPS and set the configuration key `yarn.timeline-service.webapp.https.address`
to use the HTTPS port specified in `kubernetes/yaml/ats-service.yaml`.
**Do not expand `${yarn.timeline-service.hostname}`.**

```xml
# terminal-command
vi timeline-conf/yarn-site.xml

<property>
  <name>yarn.http.policy</name>
  <value>HTTPS_ONLY</value>
</property>

<property>
  <name>yarn.timeline-service.webapp.https.address</name>
  <value>${yarn.timeline-service.hostname}:8190</value>
</property>
```

In order to use Timeline Server with SSL, the user should reconfigure MR3-UI and MR3 DAGAppMaster.

### Configuring MR3-UI

The user should update `config/configs.env` in the MR3-UI directory to specify the HTTPS address of the Timeline Server.

```sh
# terminal-command
vi timeline-conf/configs.env

hosts: {
  timeline: "https://indigo20:8190",
}
```

### Configuring MR3 DAGAppMaster

In `conf/yarn-site.xml`, allow only HTTPS and
set the configuration key `yarn.timeline-service.hostname` to the host name for the Timeline Server Service.

```xml
# terminal-command
vi conf/yarn-site.xml

<property>
  <name>yarn.http.policy</name>
  <value>HTTPS_ONLY</value>
</property>

<property>
  <name>yarn.timeline-service.hostname</name>
  <value>indigo20</value>
</property>
```

In `conf/mr3-site.xml`, add the address of the Timeline Server Service to the configuration key `mr3.k8s.host.aliases`.

```xml
# terminal-command
vi conf/mr3-site.xml

<property>
  <name>mr3.k8s.host.aliases</name>
  <value>indigo20=10.1.91.41</value>
</property>
```

The user should also check that the configuration key `mr3.am.launch.cmd-opts` includes `-Djavax.net.ssl.trustStore=/opt/mr3-run/key/hivemr3-ssl-certificate.jks` and `-Djavax.net.ssl.trustStoreType=jks` in its value.

In `yaml/hive.yaml`, the `spec.hostAliases` field should include the host running Timeline Server.

```yaml
# terminal-command
vi yaml/hive.yaml

spec:
  template:
    spec:
      hostAliases:
      - ip: "10.1.91.41"
        hostnames:
        - "indigo20"
```

## Metastore with SSL

![/k8s/metastore.ssl](/k8s/metastore.ssl-fs8.png)

In `conf/core-site.xml`, the KeyStore file holding private keys should be specified.

```xml
# terminal-command
vi conf/core-site.xml

<property>
  <name>hadoop.security.credential.provider.path</name>
  <value>localjceks://file/opt/mr3-run/key/hivemr3-ssl-certificate.jceks</value>
</property>
```

The user should make a copy of the certificate file for connecting to the MySQL database for Metastore 
and set `MR3_METASTORE_MYSQL_CERTIFICATE` in `config-run.sh` to point to the copy.

```sh
# terminal-command
vi config-run.sh

MR3_METASTORE_MYSQL_CERTIFICATE=/home/hive/mr3/kubernetes/mr3-metastore-mysql.cert
```

![/k8s/metastore.ssl.mysql](/k8s/metastore.ssl.mysql-fs8.png)

Similarly to Ranger, the user should extend the certificate file for MySQL so that MySQL can trust the self-signed certificate of Metastore.
Append the contents of `mr3-ssl.pem` created in the previous step to the certificate file for MySQL. 
This step is unnecessary if Ranger and Metastore share the same MySQL database.

In `conf/hive-site.xml`,
the user specifies the URL for connecting to the MySQL database (by appending `;useSSL=true&amp;verifyServerCertificate=true`) and enables SSL.
The KeyStore file with the self-signed certificate is already specified.

```xml
# terminal-command
vi conf/hive-site.xml

<property>
  <name>javax.jdo.option.ConnectionURL</name>
  <value>jdbc:mysql://${hive.database.host}/${hive.database.name}?createDatabaseIfNotExist=true&amp;useSSL=true&amp;verifyServerCertificate=true</value>
</property>

<property>
  <name>hive.metastore.use.SSL</name>
  <value>true</value>
</property>

<property>
  <name>hive.metastore.keystore.path</name>
  <value>/opt/mr3-run/key/hivemr3-ssl-certificate.jks</value>
</property>

<property>
  <name>hive.metastore.truststore.path</name>
  <value>/opt/mr3-run/key/hivemr3-ssl-certificate.jks</value>
</property>
```

Since we are building a Kubernetes cluster in which only Beeline (and JDBC clients) can make connections to HiveServer2 and no ordinary users can directly access the data source,
it is okay to disable security on the Metastore side and rely only on Ranger for HiveServer2.
The user can disable security on the Metastore side by unsetting the two configuration keys `hive.metastore.pre.event.listeners` and `metastore.pre.event.listeners` in `conf/hive-site.xml`.

```xml
# terminal-command
vi conf/hive-site.xml

<property>
  <name>hive.metastore.pre.event.listeners</name>
  <value></value>
</property>

<property>
  <name>metastore.pre.event.listeners</name>
  <value></value>
</property>
```

Then the configuration key `hive.security.metastore.authorization.manager` is automatically ignored.

Note that Thrift Metastore URI specified by `hive.metastore.uris` in `conf/hive-site.xml` is not exposed to the outside of the Kubernetes cluster 
because `HIVE_METASTORE_HOST` in `env.sh` uses the host name for the Metastore Pod.
If Thrift Metastore URI should be exposed to the outside for some reason (after introducing a Kubernetes Service), 
we should enable security on the Metastore side as well.

:::info
If Thrift Metastore URI is exposed to the outside,
the same Ranger instance can be used as an authorization manager for Metastore
by exploiting [HIVE-21753](https://issues.apache.org/jira/browse/HIVE-21753).
:::

The user can hide the password for connecting to MySQL by updating `kubernetes/mr3-ssl.jceks`.
Here is an example of updating `kubernetes/mr3-ssl.jceks` when the password is `passwd`. 

```sh
# terminal-command
hadoop credential create javax.jdo.option.ConnectionPassword -provider jceks://file//home/hive/mr3/kubernetes/mr3-ssl.jceks -value passwd
javax.jdo.option.ConnectionPassword has been successfully created.
org.apache.hadoop.security.alias.JavaKeyStoreProvider has been updated.
$ keytool -list -storetype jceks -storepass none -keystore kubernetes/mr3-ssl.jceks 
Keystore type: JCEKS
Keystore provider: SunJCE
...
```

Now the configuration key `javax.jdo.option.ConnectionPassword` in `conf/hive-site.xml`
can be set to `_`.

```xml
# terminal-command
vi conf/hive-site.xml

<property>
  <name>javax.jdo.option.ConnectionPassword</name>
  <value>_</value>
</property>
```

## HiveServer2 with SSL

![/k8s/hs2.ssl](/k8s/hs2.ssl-fs8.png)

In `conf/core-site.xml`, the KeyStore file holding private keys should be specified.

```xml
# terminal-command
vi conf/core-site.xml

<property>
  <name>hadoop.security.credential.provider.path</name>
  <value>localjceks://file/opt/mr3-run/key/hivemr3-ssl-certificate.jceks</value>
</property>
```

In `conf/hive-site.xml`, the user enables SSL.
The KeyStore file with the self-signed certificate is already specified.

```xml
# terminal-command
vi conf/hive-site.xml

<property>
  <name>hive.server2.use.SSL</name>
  <value>true</value>
</property>

<property>
  <name>hive.server2.keystore.path</name>
  <value>/opt/mr3-run/key/hivemr3-ssl-certificate.jks</value>
</property>

<property>
  <name>hive.server2.keystore.password</name>
  <value>_</value>
</property>
```

In order for HiveServer2 to communicate with KMS securely,
the user should make a copy of the certificate file for connecting to KMS 
and set `MR3_KMS_CERTIFICATE` in `config-run.sh` to point to the copy.

```sh
# terminal-command
vi config-run.sh

MR3_KMS_CERTIFICATE=/home/hive/mr3/kubernetes/mr3-kms.cert
```

In `yaml/hive.yaml`, the `spec.hostAliases` field should include the host running KMS.

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
```

In `conf/core-site.xml`, the user specifies the address of KMS with SSL.

```xml
# terminal-command
vi conf/core-site.xml

<property>
  <name>dfs.encryption.key.provider.uri</name>
  <value>kms://https@red0:9393/kms</value>
</property>
```

