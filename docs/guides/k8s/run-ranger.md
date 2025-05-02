---
title: Configuring Ranger
sidebar_position: 20
---

This page provides details for using Ranger for authorization in Hive on MR3.
In our example, we assume a MySQL database for Ranger.

:::tip
We recommend the user try the quick start guide for running Hive on MR3 on Kubernetes
[with Ranger](/docs/quick/k8s/run-k8s/ranger).
:::

## Configuring Ranger Pod

The following files configure Kubernetes objects for Ranger.

```sh
├── env.sh
└── yaml
    ├── ranger-service.yaml
    └── ranger.yaml
```

### `env.sh`

The user should set the following environment variable in `env.sh`.

```sh
# terminal-command
vi env.sh

CREATE_RANGER_SECRET=true
```

* `CREATE_RANGER_SECRET` specifies whether or not to create a Secret from keytab files in the directory `ranger-key`.
It should be set to true whether Kerberos is used for authentication or not 
(because of `ranger-key/install.properties`).

### `ranger-service.yaml`

This manifest defines a Service for exposing Ranger to the outside of the Kubernetes cluster.
The user should specify an IP address with a valid host name and three port numbers for Ranger
so that both the administrator from the outside and HiveServer2 from the inside can connect to it
using the host name.
Usually there is no need to change the three `targetPort` fields which specify port numbers internal to the Ranger Pod.

```yaml
# terminal-command
vi yaml/ranger-service.yaml

  ports:
  - name: ranger-admin-http
    protocol: TCP
    port: 6080
    targetPort: 6080
  - name: ranger-admin-https
    protocol: TCP
    port: 6182
    targetPort: 6182
  - name: solr
    protocol: TCP
    port: 6083
    targetPort: 6083
  externalIPs:
  - 10.1.91.41
```

In our example, we use 10.1.91.41:6080 as the HTTP address 
and 10.1.91.41:6182 as the HTTPS address of Ranger.
Another address 10.1.91.41:6083 is reserved for the internal communication between Ranger and Solr.

### `ranger.yaml`

This manifest defines a Pod for running Ranger.
Internally the Pod runs two containers in parallel: one for Ranger and another for Solr.
The user should update the `spec.hostAliases` field and the `spec.containers` section.

* The `spec.hostAliases` field lists aliases for hosts that may not be found in the default DNS.
Usually it suffices to include three hosts:
1) the host running MySQL for Ranger outside the Kubernetes cluster;
2) the host running HiveServer2 inside the Kubernetes cluster;
3) the host running Ranger inside the Kubernetes cluster.
In our example,
`red0` is the host running MySQL for Ranger and
`indigo20` is the host name assigned to HiveServer2 and Ranger.

```yaml
# terminal-command
vi yaml/ranger.yaml

  hostAliases:
  - ip: "10.1.91.4"
    hostnames:
    - "red0"
  - ip: "10.1.91.41"
    hostnames:
    - "indigo20"
```

* The `image` field in the `spec.containers` section specifies the Docker image for Ranger.
* The `resources.requests` and `resources.limits` specify the resources to to be allocated to
the Ranger container and the Solr container.
* The `ports.containerPort` fields should match the port numbers specified in the `targetPort` fields in `ranger-service.yaml`. 

```yaml
# terminal-command
vi yaml/ranger.yaml

spec:
  containers:
  - image: mr3project/ranger:2.6.0
    name: solr
    resources:
      requests:
        cpu: 1
        memory: 4Gi
      limits:
        cpu: 1
        memory: 4Gi
    ports:
    - containerPort: 6083
      protocol: TCP

  - image: mr3project/ranger:2.6.0
    name: ranger
    resources:
      requests:
        cpu: 1
        memory: 4Gi
      limits:
        cpu: 1
        memory: 4Gi
    ports:
    - containerPort: 6080
      protocol: TCP
    - containerPort: 6182
      protocol: TCP
```

## Configuring Ranger

The two directories `ranger-conf` and `ranger-key` contain configuration files for Ranger.

```sh
├── ranger-key
│   ├── install.properties
│   └── solr.in.sh
└── ranger-conf
    ├── core-site.xml
    ├── solr-core.properties
    ├── solr-elevate.xml
    ├── solr-log4j2.xml
    ├── solr-managed-schema
    ├── solr-security.json
    ├── solr-solrconfig.xml
    ├── solr-solr.xml
    ├── ranger-log4j.properties
    ├── ranger-admin-site.xml.append
    └── krb5.conf
```

:::warning
Because of lack of documentation on Ranger,
**the user is strongly advised to run Ranger initially
with minimal changes to the configuration files included in the MR3 release**.
After getting Ranger up and running,
the user can incrementally adjust the configuration to suit particular needs.
Otherwise the user might have to fix the configuration by reading the source code of Ranger. 
:::

We assume that SSL is not enabled.
(When running Ranger without Kerberos, SSL should not be enabled.)
Set `SOLR_SSL_ENABLED` to false in `ranger-key/solr.in.sh`.

```sh
# terminal-command
vi ranger-key/solr.in.sh

SOLR_SSL_ENABLED=false
```

### Kerberos keytab files (optional)

When using Kerberos authentication,
we recommend the user to create three Kerberos keytab files with the following names.
In our example, we assume that `indigo20` is the host name assigned to the Service for Ranger service and that `RED` is the Kerberos realm.
The user should copy the keytab files in the directory `ranger-key`.

* **`rangeradmin.keytab`** with admin service principal `rangeradmin/indigo20@RED`.
**The instance (e.g., `indigo20`) must match the host name for Ranger.**
* **`spnego.service.keytab`** with SPNEGO service principal `HTTP/indigo20@RED`.
**The service name must be `HTTP` and the instance (e.g., `indigo20`) must match the host name for Ranger.**
* **`rangerlookup.keytab`** with lookup principal `rangerlookup@RED`.
An ordinary principal (without an instance) is okay to use.

### `install.properties`

* `DB_FLAVOR` and `SQL_CONNECTOR_JAR` should match the database connector jar file. 
  ```sh
  # terminal-command
  vi ranger-key/install.properties

  DB_FLAVOR=MYSQL
  SQL_CONNECTOR_JAR=/opt/mr3-run/lib/mysql-connector-java-8.0.28.jar

  # for PostgreSQL: 
  # DB_FLAVOR=POSTGRES
  # SQL_CONNECTOR_JAR=/opt/mr3-run/lib/postgresql-42.3.2.jar

  # for MS SQL: 
  # DB_FLAVOR=MSSQL
  # SQL_CONNECTOR_JAR=/opt/mr3-run/lib/mssql-jdbc-10.2.0.jre8.jar
  ```

  When using a MySQL server,
  Ranger automatically downloads a MySQL connector from
  `https://cdn.mysql.com/Downloads/Connector-J/mysql-connector-java-8.0.28.tar.gz`
  and `SQL_CONNECTOR_JAR` can be set as shown above.

  If a custom database connector should be used,
  the user can copy a connector jar file to a subdirectory of the PersistentVolume and set `SQL_CONNECTOR_JAR` to point to the file 
  (e.g., `SQL_CONNECTOR_JAR=/opt/mr3-run/ranger/work-dir/lib/mysql-connector-java-8.0.12.jar`).
  In this way, Ranger can use the custom database connector provided by the user.

* `db_root_user` and `db_root_password` should be set to the ID and password of the root user of MySQL for Ranger.
  ```sh
  # terminal-command
  vi ranger-key/install.properties

  db_root_user=root
  db_root_password=passwd
  ```

* `db_host` should be set to the IP address or the host name of MySQL for Ranger.
  ```sh
  # terminal-command
  vi ranger-key/install.properties

  db_host=indigo0
  ```

* `db_password` specifies a password for the user `rangeradmin`.
  ```sh
  # terminal-command
  vi ranger-key/install.properties

  db_password=password
  ```

* `rangerAdmin_password` specifies the initial password for the user admin on the Ranger Admin UI.
  ```sh
  # terminal-command
  vi ranger-key/install.properties

  rangerAdmin_password=rangeradmin1
  ```

* `RANGER_ADMIN_LOG_DIR` specifies the directory for logging.
  By default, Ranger uses a local directory mounted with an emptyDir volume.
  ```sh
  # terminal-command
  vi ranger-key/install.properties

  RANGER_ADMIN_LOG_DIR=/opt/mr3-run/ranger/work-local-dir/log/ranger-admin
  ```

* Set the variable `audit_solr_urls` to the address for the configuration key `ranger.audit.solr.urls`.
  Remove (do not just set to empty) two variables related to authentication for auditing:
  `audit_solr_user` and `audit_solr_password`.
  ```sh
  # terminal-command
  vi ranger-key/install.properties

  audit_solr_urls=http://indigo20:6083/solr/ranger_audits
  # audit_solr_user
  # audit_solr_password
  ```

* `policymgr_external_url` should be set to the Ranger admin URL.
  `policymgr_http_enabled` should be set to true.
  ```sh
  # terminal-command
  vi ranger-key/install.properties

  policymgr_external_url=http://indigo20:6080
  policymgr_http_enabled=true
  ```

* When using Kerberos authentication, set the following variables to Kerberos principals.
  ```sh
  # terminal-command
  vi ranger-key/install.properties

  admin_principal=rangeradmin/indigo20@RED
  spnego_principal=HTTP/indigo20@RED
  lookup_principal=rangerlookup@RED
  ```

### `solr.in.sh`

When using Kerberos authentication,
the environment variable `SOLR_AUTHENTICATION_OPTS` should use 
the host running Ranger, the SPNEGO service principal, and its service keytab.

```sh
# terminal-command
vi ranger-key/solr.in.sh

SOLR_AUTH_TYPE="kerberos"
SOLR_AUTHENTICATION_OPTS="\
-Djava.security.krb5.conf=/opt/mr3-run/ranger/conf/krb5.conf \
-Dsolr.kerberos.cookie.domain=indigo20 \
-Dsolr.kerberos.principal=HTTP/indigo20@RED \
-Dsolr.kerberos.keytab=/opt/mr3-run/ranger/key/spnego.service.keytab"
```

If Kerberos is not used, set as follows.
```sh
# terminal-command
vi ranger-key/solr.in.sh

SOLR_AUTH_TYPE="basic"
SOLR_AUTHENTICATION_OPTS="-Dbasicauth=solr:solrRocks"
```

### `core-site.xml`

Set the configuration key `hadoop.security.authentication` to `kerberos` to enable Kerberos authentication.

```xml
# terminal-command
vi ranger-conf/core-site.xml

  <property>
    <name>hadoop.security.authentication</name>
    <value>kerberos</value>
  </property>
```

Set it to `simple` to disable Kerberos authentication.

```xml
# terminal-command
vi ranger-conf/core-site.xml

  <property>
    <name>hadoop.security.authentication</name>
    <value>simple</value>
  </property>
```

### `solr-security.json`

This file sets the configuration for authentication and authorization in Solr. 
When using Kerberos authentication,
the `user-role` section should specify the service principal for HiveServer2 and the admin service principal for Ranger.

```json
# terminal-command
vi ranger-conf/solr-security.json

  "authentication": {
    "class": "org.apache.solr.security.KerberosPlugin"
  },
  "authorization": {
    ...
    "user-role": {
      "hive/indigo20@RED": "updater",
      "rangeradmin/indigo20@RED": "reader",
    }
  }
```

If Kerberos is not used, set as follows.

```xml
# terminal-command
vi ranger-conf/solr-security.json

{
  "authentication": {
    "blockUnknown": false,
    "class": "solr.BasicAuthPlugin",
    "credentials":{
      "solr":"IV0EHq1OnNrj6gvRCwvFwTrZ1+z1oBbnQdiVC3otuq0= Ndd7LKvVBAaZIF0QAVi1ekCfAJXr1GGfLtRUXhgrF8c="
    }
  },
  "authorization": {
    "class": "solr.RuleBasedAuthorizationPlugin"
  }
}
```

Since `authentication`/`blockUnknown` is set to false,
Solr accepts audit requests without credentials. 
(Ranger does not use the credentials which correspond to user `solr` and password `solrRocks`.)

### `ranger-admin-site.xml.append`

When using Kerberos authentication,
set the configuration key `xasecure.audit.jaas.Client.option.principal`
to admin service principal.

```xml
# terminal-command
vi ranger-conf/ranger-admin-site.xml.append

  <property>
    <name>xasecure.audit.jaas.Client.option.principal</name>
    <value>rangeradmin/indigo20@RED</value>
  </property>
```

If Kerberos is not used, clear the contents except the last line.

```xml
# terminal-command
vi ranger-conf/ranger-admin-site.xml.append

</configuration>
```

### `krb5.conf`

When using Kerberos authentication,
this file should contains the information for Kerberos configuration.
Usually it suffices to use a copy of `conf/krb5.conf`.

## Reconfiguring HiveServer2

In order to use Ranger, HiveServer2 should be reconfigured so as to communicate with Ranger.

### `yaml/hive.yaml`

The `spec.hostAliases` field should include the host running Ranger inside the Kubernetes cluster.

### `conf/hive-site.xml`

The following configuration keys should be set.

```xml
# terminal-command
vi conf/hive-site.xml

<property>
  <name>hive.security.authenticator.manager</name>
  <value>org.apache.hadoop.hive.ql.security.SessionStateUserAuthenticator</value>
</property>

<property>
  <name>hive.security.authorization.manager</name>
  <value>org.apache.ranger.authorization.hive.authorizer.RangerHiveAuthorizerFactory</value>
</property>
```

### `conf/ranger-hive-audit.xml`

The configuration key `xasecure.audit.destination.solr.urls` should use the host name assigned to Ranger.

```xml
# terminal-command
vi conf/ranger-hive-audit.xml

  <property>
    <name>xasecure.audit.destination.solr.urls</name>
    <value>http://indigo20:6083/solr/ranger_audits</value>
  </property>
```

### `conf/ranger-hive-security.xml`

The configuration key `ranger.plugin.hive.policy.rest.url` should use the host name assigned to Ranger.
Note that the port number should match the field `port`, not `targetPort`,
in `yaml/ranger-service.yaml`
because HiveServer2 connects via the Service that exposes Ranger to the outside of the Kubernetes cluster.

```xml
# terminal-command
vi conf/ranger-hive-security.xml

  <property>
    <name>ranger.plugin.hive.policy.rest.url</name>
    <value>http://indigo20:6080</value>
  </property>
```

The configuration key `ranger.plugin.hive.service.name`
should use the Ranger service for HiveServer2.

```xml
# terminal-command
vi conf/ranger-hive-security.xml

  <property>
    <name>ranger.plugin.hive.service.name</name>
    <value>INDIGO_hive</value>
  </property>
```

## Creating a Ranger service

After starting Ranger, connect to the Ranger webpage and create a Ranger service specified in `kubernetes/conf/ranger-hive-security.xml`.
Then fill the JDBC URL (e.g., `jdbc:hive2://indigo20:9852/;principal=hive/indigo20@RED;`)
and set `policy.download.auth.users` to the user `hive`, or the owner of HiveServer2.
In this way, Ranger can inspect metadata (such as databases, tables, users) managed by HiveServer2 while HiveServer2 can retrieve its Ranger service profile.

![/k8s/ranger.configure](/k8s/ranger.configure-fs8.png)

