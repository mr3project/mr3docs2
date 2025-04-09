---
title: With Ranger
sidebar_position: 1
---

This page explains additional steps for using Ranger for authorization in Hive on MR3.
Using Ranger for authorization has the following prerequisite:

* A database server for Ranger is running. It may be the same database server for Metastore.

By default, we use the pre-built Docker image `mr3project/ranger:2.6.0`.

## hiveEnv: hive.T

In order to use Ranger for authorization,
`authorization` should be set to `RangerHiveAuthorizerFactory`

```typescript
// terminal-command
vi run.ts

const hiveEnv: hive.T = {

  authorization: "RangerHiveAuthorizerFactory",
```

## rangerEnv: ranger.T

We allocate 2 CPU cores and 6GB of memory to the Ranger Pod.

```typescript
// terminal-command
vi run.ts

const rangerEnv: ranger.T = {

  resources: {
    cpu: 2,
    memoryInMb: 6 * 1024
  },
```

In our example, we use a Ranger service `ORANGE_hive`.

```typescript
// terminal-command
vi run.ts

const rangerEnv: ranger.T = {

  service: "ORANGE_hive",
```

We use a MySQL server for Ranger whose address is 192.168.10.100.
`dbRootUser` and `dbRootPassword`
specify the user name and password of the MySQL server for Ranger.

```typescript
// terminal-command
vi run.ts

const rangerEnv: ranger.T = {

  dbFlavor: "MYSQL",
  dbRootUser: "root",
  dbRootPassword: "passwd",
  dbHost: "192.168.10.100",
```

`dbPassword` specifies a password for the user `rangeradmin`
which is use only internally by Ranger.
`adminPassword` specifies the initial password for the user `admin` on the Ranger Admin UI.

```typescript
// terminal-command
vi run.ts

const rangerEnv: ranger.T = {

  dbPassword: "password",
  adminPassword: "rangeradmin1",
```

When using a MySQL server,
Ranger automatically downloads a MySQL connector
from `https://cdn.mysql.com/Downloads/Connector-J/mysql-connector-java-8.0.28.tar.gz`.
The user should check the compatibility between the server and the connector.
For example,
a MySQL server created with a Docker image `5.7.37-0ubuntu0.18.04.1`
is not fully compatible.

## `server/ranger-resources/ranger-admin-site.xml.append`

If Kerberos is not used,
clear the contents except the last line:

```sh
// terminal-command
vi server/ranger-resources/ranger-admin-site.xml.append

 </configuration>
```

## Creating a Ranger service

After running Hive on MR3,
the user can check if Ranger has started properly.

```sh
// terminal-command
kubectl logs -n hivemr3 ranger-0 ranger
...
Installation of Ranger PolicyManager Web Application is completed.
Starting Apache Ranger Admin Service
Apache Ranger Admin Service with pid 1621 has started.
```

Before executing queries,
the user should create a new Ranger service `ORANGE_hive`
(if it has not available yet).
The user can access Ranger Admin UI at the following URL:

* Ranger Admin UI: `http://orange1:8080/ranger/login.jsp`

Login to Ranger Admin UI with user `admin` and password `rangeradmin1`.
Create a Ranger service `ORANGE_hive`.

![typescript-ranger-create-fs8](/quickstart/typescript-ranger-create-fs8.png)

In `Config Properties`,
fill the JDBC URL field with:

* `jdbc:hive2://hiveserver2.hivemr3.svc.cluster.local:9852/;`

`policy.download.auth.users` should be set to the user `hive`, or the owner of HiveServer2.
Then Ranger can inspect metadata (such as databases, tables, users) managed by HiveServer2
while HiveServer2 can retrieve its Ranger service profile.

![typescript-ranger-set-fs8](/quickstart/typescript-ranger-set-fs8.png)

While creating the Ranger service, 
the `Test Connection` button fails because HiveServer2 is unaware of it.
After creating the Ranger service, the button should work.

After creating the Ranger service,
HiveServer2 successfully downloads the policy for `ORANGE_hive`.
```sh
// terminal-command
kubectl logs -n hivemr3 hiveserver2-595f4c56c4-hhmvf | grep ORANGE_hive
...
2025-03-22T07:35:19,411  INFO [PolicyRefresher(serviceName=ORANGE_hive)-24] policyengine.RangerPolicyRepository: This policy engine contains 8 policy evaluators
```

As the last step before executing queries,
new users should be added to the Ranger policy.
For example, we add a new user `superset` to allow Superset to submit queries. 

![typescript-ranger-add-superset-fs8](/quickstart/typescript-ranger-add-superset-fs8.png)

