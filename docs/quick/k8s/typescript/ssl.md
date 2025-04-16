---
title: With SSL Encryption
sidebar_position: 3
---

This page explains additional steps for 
using SSL (Secure Sockets Layer) encryption in Hive on MR3.
For simplicity,
secure connection to database servers for Metastore and Ranger is not enabled.
See [SSL Encryption](/docs/guides/ssl/) for details.

## basicsEnv: basics.T

We use secure connection to S3-compatible storage with HTTPS.

```typescript
// terminal-command
vi run.ts

const basicsEnv: basics.T = {

  s3aEndpoint: "https://orange0:9000",
  s3aEnableSsl: true,
```

The user should have a certificate for connecting to the storage.

## metastoreEnv: metastore.T

We store the password of the MySQL server for Metastore
in a KeyStore file to be created later.
Internally the configuration key `javax.jdo.option.ConnectionPassword` in `hive-site.xml` is set to `_`.

```typescript
// terminal-command
vi run.ts

const metastoreEnv: metastore.T = {

  userName: "root",
  password: "_",
```

## hiveEnv: hive.T

We enable secure connection to public HiveServer2.

```typescript
// terminal-command
vi run.ts

const hiveEnv: hive.T = {

  enableSsl: true,                                                                      
```

Setting `enableSsl` to true
does not enable secure connection to internal HiveServer2, Metastore, and Ranger,
which all run only inside the Kubernetes cluster.
To enable secure connection to these components as well
(which is usually unnecessary, e.g., because all these components run on the same node),
the user should update the source code.

```typescript
// terminal-command
vi server/api/hive.ts

export interface T {
...
  enableSslInternal: true;
```

```typescript
// terminal-command
vi server/validate/hive.ts

export function initial(): T {
...
    enableSslInternal: false
```

:::warning
With the default Docker image for Superset,
connecting securely to internal HiveServer2 does not work.
:::

## workerEnv: worker.T

We enable secure shuffle in MR3 using SSL mode.
Then all the ContainerWorker Pods for Hive (but not for Spark) communicate securely.

```typescript
// terminal-command
vi run.ts

  enableShuffleSsl: true
```

Enabling secure shuffle is usually unnecessary
because ContainerWorker Pods are not reachable from the outside of the Kubernetes cluster.
Beside it incurs a noticeable performance overhead.

## secretEnv: secret.T

Create certificates and secrets by following the instructions in
[Creating certificates and secrets for SSL](../common/create-ssl).

We set `ssl` and `shuffleSsl` fields
using the output files of `generate-ssl.sh` and the password set in `PASSWORD`.

```typescript
// terminal-command
vi run.ts

const secretEnv: secret.T = {

  ssl: {
    keystore: "hivemr3-ssl-certificate.jceks",
    truststore: "hivemr3-ssl-certificate.jks",
    password: "MySslPassword123",
    keystoreData: fs.readFileSync("hivemr3-ssl-certificate.jceks").toString("base64"),
    truststoreData: fs.readFileSync("hivemr3-ssl-certificate.jks").toString("base64")
  },
  shuffleSsl: {
    keystore: "mr3-keystore.jks",
    truststore: "mr3-truststore.jks",
    keystoreData: fs.readFileSync("mr3-keystore.jks").toString("base64"),
    truststoreData: fs.readFileSync("mr3-truststore.jks").toString("base64")
  },
```

## Configuring Ranger

In the Ranger service, fill the JDBC URL field with:

* `jdbc:hive2://hiveserver2-internal.hivemr3.svc.cluster.local:9852/;principal=hive/hiveserver2-internal.hivemr3.svc.cluster.local@PL;`

Note that we use internal HiveServer2 which does not use secure connection by default.

## Running queries

For sending queries to public HiveServer2,
the user should use JDBC URL:

* `jdbc:hive2://orange1:9852/;principal=hive/orange1@PL;ssl=true;sslTrustStore=/path/to/beeline-ssl.jks;trustStorePassword=beelinepassword;`

