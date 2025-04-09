---
title: With Kerberos
sidebar_position: 2
---

This page explains additional steps for using Kerberos authentication in Hive/Spark on MR3.

## basicsEnv: basics.T

In our example,
the host alias for HiveServer2 is set to `orange1`
which serves as the instance in a Kerberos keytab for Hive.

```typescript
// terminal-command
vi run.ts

const basicsEnv: basics.T = {

  hiveserver2IpHostname: "orange1",
```

We provide the details of the Kerberos server: 1) Kerberos realm which is `PL` in our example;
2) IP address of the Kerberos admin server;
3) IP address of the KDC (Key Distribution Center).

```typescript
// terminal-command
vi run.ts

const basicsEnv: basics.T = {

  kerberos: {                                                                           
    realm: "PL",                                                                        
    adminServer: "1.1.1.1",                                                             
    kdc: "1.1.1.1"                                                                      
  },                                  
```

## hiveEnv: hive.T

`authentication` is set to `KERBEROS` to use Kerberos for authentication.

```typescript
// terminal-command
vi run.ts

const hiveEnv: hive.T = {

  authentication: "KERBEROS",                                                           
```

## secretEnv: secret.T

With the host alias set to `orange1` and the Kerberos realm set to `PL`,
the user should provide several keytab files.
The user may choose any names for keytab files.
In our example,
we choose the name of a keytab file according to its corresponding principal.

Hive requires service principals for 1) public HiveServer2 and 2) internal HiveServer2 (which is not exposed to the outside of the Kubernetes cluster).

:::caution
The service name of the principal must be `hive` which is the value of `docker.user`.
:::

The service principal for public HiveServer2 is uniquely determined by the host alias for HiveServer2 and the Kerberos realm.

* **`hive/orange1@PL`** in `hive-orange1.keytab`

The service principal for internal HiveServer2 is determined by the Kerberos realm alone.

* **`hive/hiveserver2-internal.hivemr3.svc.cluster.local@PL`**
in `hive-hiveserver2-internal.hivemr3.svc.cluster.local.keytab`

Ranger requires two service principals and a user principal.
All the principals are uniquely determined by the Kerberos realm.

* **`HTTP/ranger.hivemr3.svc.cluster.local@PL`**
in `HTTP-ranger.hivemr3.svc.cluster.local.keytab`
(Spnego service principal)
* **`rangeradmin/ranger.hivemr3.svc.cluster.local@PL`**
in `rangeradmin-ranger.hivemr3.svc.cluster.local.keytab`
(admin service principal)
* **`rangerlookup@PL`** in `rangerlookup.keytab` (lookup principal)

Spark requires a user principal.
The user may choose any user name in the principal (not necessarily `spark`).

* **`spark@PL`** in `spark.keytab`

Optionally the user may use a user principal for accessing HDFS
from Hive on MR3.
In our example, we use `hive@PL`, but
the user may choose any user name in the principal.

* **`hive@PL`** in `hive.keytab`

Then set `kerberosSecret` and `spark` fields as follows.

```typescript
// terminal-command
vi run.ts

const secretEnv: secret.T = {

  kerberosSecret: {
    server: {
      keytab: "hive-orange1.keytab",
      principal: "hive/orange1@PL",
      data: fs.readFileSync("hive-orange1.keytab").toString("base64"),
      keytabInternal: "hive-hiveserver2-internal.hivemr3.svc.cluster.local.keytab",
      principalInternal: "hive/hiveserver2-internal.hivemr3.svc.cluster.local@PL",
      dataInternal: fs.readFileSync("hive-hiveserver2-internal.hivemr3.svc.cluster.local.keytab").toString("base64")
    },
    user: {
      keytab: "hive.keytab",
      principal: "hive@PL",
      data: fs.readFileSync("hive.keytab").toString("base64")
    },
    ranger: {
      spnego: {
        keytab: "HTTP-ranger.hivemr3.svc.cluster.local.keytab",
        principal: "HTTP/ranger.hivemr3.svc.cluster.local@PL",
        data: fs.readFileSync("HTTP-ranger.hivemr3.svc.cluster.local.keytab").toString("base64")
      },
      admin: {
        keytab: "rangeradmin-ranger.hivemr3.svc.cluster.local.keytab",
        principal: "rangeradmin/ranger.hivemr3.svc.cluster.local@PL",
        data: fs.readFileSync("rangeradmin-ranger.hivemr3.svc.cluster.local.keytab").toString("base64")
      },
      lookup: {
        keytab: "rangerlookup.keytab",
        principal: "rangerlookup@PL",
        data: fs.readFileSync("rangerlookup.keytab").toString("base64")
      }
    }
  },
  spark: {
    keytab: "spark.keytab",
    principal: "spark@PL",
    data: fs.readFileSync("spark.keytab").toString("base64")
  },
```

## Configuring Ranger

In the Ranger service, fill the JDBC URL field with:

* `jdbc:hive2://hiveserver2.hivemr3.svc.cluster.local:9852/;principal=hive/orange1@PL;`

## Configuring Superset

When registering a database source,
the Hive URI should be:

* `hive://hiveserver2-internal.hivemr3.svc.cluster.local:9852/default?auth=KERBEROS&kerberos_service_name=hive`

## Running queries

For sending queries to public HiveServer2,
the user should obtain a valid Kerberos ticket
and use JDBC URL:

* `jdbc:hive2://orange1:9852/;principal=hive/orange1@PL;`

## Running Spark on MR3

Inside a Spark driver Pod,
the user should obtain a Kerberos ticket from `spark.keytab`
(mounted in the directory `/opt/mr3-run/key`)
before running Spark shell or submitting Spark jobs.
```sh
$ kubectl exec -n hivemr3 -it spark1 -- /bin/bash
spark@spark1:/opt/mr3-run/spark$ kinit -kt ../key/spark.keytab spark@PL
spark@spark1:/opt/mr3-run/spark$ ./run-spark-shell.sh 
```

