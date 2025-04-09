---
title: Secure Shuffle with SSL
sidebar_position: 30
---

This page explains how to use the MR3 shuffle handler with SSL enabled.
For introduction, see [MR3 Shuffle Handler](../../features/mr3/shufflehandler).

In comparison with Hadoop/MapReduce shuffle service,
enabling secure shuffle in MR3 is much simpler
because the incorporation of [TEZ-4096](https://issues.apache.org/jira/browse/TEZ-4096)
allows MR3 to include all SSL-related configurations in `mr3-site.xml` and `tez-site.xml`.
That is, the user does not need separate configuration files such as `ssl-server-mr3.xml` and `ssl-client-mr3.xml`.

Enabling secure shuffle takes three steps:

1. create JKS files: a KeyStore file and a TrustStore file 
2. update `mr3-site.xml`
3. update `tez-site.xml`

## Step 1. Create JKS files

Before creating JKS files,
the user should choose CN (Common Name) for the nodes in the cluster.
On Hadoop, the user can choose CN according to the domain (e.g., `*` or `*.foo.com`).
On Kubernetes, however, it must be `*.service-worker.hivemr3.svc.cluster.local`
because all ContainerWorker Pods belong to a headless Service `service-worker` in the namespace `hivemr3`.

After choosing CN, the user should create JKS files.
Below we illustrate the creation of a KeyStore file `mr3-keystore.jks` and a TrustStore file `mr3-truststore.jks`
with passwords `key_password`, `keystore_password`, and `truststore_password`. 

```sh
# create a KeyStore
# terminal-command
keytool -genkey -alias mr3-shuffle -keyalg RSA -keysize 2048 -dname "CN=*" -keypass key_password -keystore mr3-keystore.jks -storepass keystore_password -validity 3650

# extract the CSR (Certificate Signing Request) from the KeyStore
# terminal-command
keytool -keystore mr3-keystore.jks -storepass keystore_password -alias mr3-shuffle -certreq -file mr3-shuffle.csr

# create a private key
# terminal-command
openssl genrsa -out mr3.key 2048

# generate a CA certificate from the private key
# terminal-command
openssl req -new -x509 -key mr3.key -out mr3.crt

# sign the certificate with the CA certificate
# terminal-command
openssl x509 -req -in mr3-shuffle.csr -CA mr3.crt -CAkey mr3.key -CAcreateserial -out mr3-shuffle.crt

# import the certificate into the KeyStore
# terminal-command
keytool -import -alias mr3-shuffle -file mr3-shuffle.crt -keystore mr3-shuffle.jks -storepass keystore_password

# create a TrustStore
# terminal-command
keytool -importcert -alias mr3-shuffle -file mr3-shuffle.crt -keystore mr3-truststore.jks -storepass truststore_password

#  check all the files
# terminal-command
ls mr3*
mr3.crt  mr3.key  mr3-keystore.jks  mr3-shuffle.crt  mr3-shuffle.csr  mr3-shuffle.jks  mr3.srl  mr3-truststore.jks
```

On Hadoop, copy `mr3-keystore.jks` and `mr3-truststore.jks` to a directory on HDFS (e.g., `/user/hive/lib/`).
On Kubernetes, copy `mr3-keystore.jks` and `mr3-truststore.jks` to the directory `kubernetes/key` in the MR3 release.
Change the permission if necessary.

## Step 2. Update `mr3-site.xml`

On Hadoop, extend the configuration key `mr3.aux.uris` in `mr3-site.xml`
to include the path on HDFS where `mr3-keystore.jks` and `mr3-truststore.jks` reside.

```xml
# terminal-command
vi hadoop/conf/tpcds/mr3-site.xml

<property>
  <name>mr3.aux.uris</name>
  <value>${auxuris},/user/hive/lib/mr3-keystore.jks,/user/hive/lib/mr3-truststore.jks</value>
</property>
```

On Kubernetes, set `CREATE_KEYTAB_SECRET` and `CREATE_WORKER_SECRET` to true in `kubernetes/env.sh`.

```sh
# terminal-command
vi kubernetes/env.sh

CREATE_KEYTAB_SECRET=true
CREATE_WORKER_SECRET=true
```

## Step 3. Update `tez-site.xml`

For updating `tez-site.xml`, the user should consider
whether the configuration key `hadoop.security.credential.provider.path` in `core-site.xml` is set to a JKS file or not.
If it is set, all passwords are retrieved from the JKS file,
so the user needs to set only the following configuration keys in `tez-site.xml`.

* `ssl.server.keystore.location` to `mr3-keystore.jks` on Hadoop and ` /opt/mr3-run/key/mr3-keystore.jks` on Kubernetes
* `ssl.server.truststore.location` to `mr3-truststore.jks` on Hadoop and `/opt/mr3-run/key/mr3-truststore.jks` on Kubernetes
* `ssl.client.truststore.location` to `mr3-truststore.jks` on Hadoop and `/opt/mr3-run/key/mr3-truststore.jks` on Kubernetes.

If it is not set, all passwords should be provided in text, 
so the user needs to set the following configuration keys as well.

* `ssl.server.keystore.password` to the KeyStore password
* `ssl.server.truststore.password` to the TrustStore password
* `ssl.client.truststore.password` to the TrustStore password

Finally the user should set the following configuration keys to enable secure shuffle.

```xml
# terminal-command
vi hadoop/conf/tpcds/tez-site.xml
# terminal-command
vi kubernetes/conf/tez-site.xml

<property>
  <name>tez.runtime.shuffle.ssl.enable</name>
  <value>true</value>
</property>

<property>
  <name>tez.runtime.shuffle.keep-alive.enabled</name>
  <value>true</value>
</property>
```

