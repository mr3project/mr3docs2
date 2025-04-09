---
title: Configuring Kerberos Authentication
sidebar_position: 1
---

This page explains how to set configurations for Kerberos authentication.
We update the following files under the directory `kubernetes`.

```yaml
├── conf
│   ├── core-site.xml
│   └── krb5.conf
├── ranger-key
│   ├── install.properties
│   └── solr.in.sh
├── ranger-conf
│   ├── core-site.xml
│   ├── krb5.conf
│   ├── ranger-admin-site.xml.append
│   └── solr-security.json
└── timeline-conf
    ├── krb5.conf
    └── yarn-site.xml
```

## `conf/core-site.xml` and `ranger-conf/core-site.xml`

In order to use Kerberos authentication,
set the configuration key `hadoop.security.authentication` to `kerberos`. 

```xml
# terminal-command
vi conf/core-site.xml ranger-conf/core-site.xml

<property>
  <name>hadoop.security.authentication</name>
  <value>kerberos</value>
</property>
```

If non-secure HDFS is used,
set the configuration key `ipc.client.fallback-to-simple-auth-allowed` to true.

```xml
# terminal-command
vi conf/core-site.xml ranger-conf/core-site.xml

<property>
  <name>ipc.client.fallback-to-simple-auth-allowed</name>
  <value>true</value>
</property>
```

## `conf/krb5.conf`, `ranger-conf/krb5.conf`, `timeline-conf/krb5.conf`

To use Kerberos, the user should update `krb5.conf`
which contains the details of the Kerberos server such as 1) Kerberos realm; 2) IP address of the Kerberos admin server; 3) IP address of the KDC (Key Distribution Center).

```sh
# terminal-command
vi conf/krb5.conf ranger-conf/krb5.conf timeline-conf/krb5.conf

[libdefaults]
  dns_lookup_realm = false
  ticket_lifetime = 24h
  forwardable = true
  rdns = false
  default_realm = RED
  default_ccache_name = /tmp/krb5cc_%{uid}

[realms]
  RED = {
    admin_server = red0
    kdc = red0
  }
```

Usually it suffices to reuse `/etc/krb5.conf` if the node is already set up to use Kerberos.

## `ranger-key/install.properties`

Set the following variables to Kerberos principals for Ranger.

```sh
# terminal-command
vi ranger-key/install.properties

spnego_principal=HTTP/orange1@PL
admin_principal=rangeradmin/orange1@PL
lookup_principal=rangerlookup@PL
```

## `ranger-key/solr.in.sh`

The environment variable `SOLR_AUTHENTICATION_OPTS` should use 
the host running Ranger, the SPNEGO service principal, and its service keytab.

```sh
# terminal-command
vi kubernetes/ranger-key/solr.in.sh

SOLR_AUTH_TYPE="kerberos"
SOLR_AUTHENTICATION_OPTS="\
-Djava.security.krb5.conf=/opt/mr3-run/ranger/conf/krb5.conf \
-Dsolr.kerberos.cookie.domain=orange1 \
-Dsolr.kerberos.principal=HTTP/orange1@PL \
-Dsolr.kerberos.keytab=/opt/mr3-run/ranger/key/spnego.service.keytab"
```

## `ranger-conf/ranger-admin-site.xml.append`

Set the configuration key `xasecure.audit.jaas.Client.option.principal`
to the admin service principal for Ranger.

```xml
# terminal-command
vi ranger-conf/ranger-admin-site.xml.append

  <property>
    <name>xasecure.audit.jaas.Client.option.principal</name>
    <value>rangeradmin/orange1@PL</value>
  </property>
```

## `ranger-conf/solr-security.json`

This file sets the configuration for authentication and authorization in Solr used by Ranger. 
The `user-role` section should specify the service principal for HiveServer2 and the admin service principal for Ranger.

```json
# terminal-command
vi ranger-conf/solr-security.json

{
  "authentication": {
    "class": "org.apache.solr.security.KerberosPlugin"
  },
  "authorization": {
    "class": "solr.RuleBasedAuthorizationPlugin",
    "permissions": [
      {
        "name": "update",
        "role": "updater"
      },
      {
        "name": "read",
        "role": "reader"
      },
      {
        "name": "*",
        "role": "admin"
      }
    ],
    "user-role": {
      "hive/orange1@PL": "updater",
      "rangeradmin/orange1@PL": "reader",
    }
  }
}
```

## `timeline-conf/yarn-site.xml`

Set the configuration key `yarn.timeline-service.http-authentication.type` to `kerberos`.
Use a Kerberos keytab file to configure authentication as shown below.

```xml
# terminal-command
vi timeline-conf/yarn-site.xml

<property>
  <name>yarn.timeline-service.http-authentication.type</name>
  <value>kerberos</value>
</property>

<property>
  <name>yarn.timeline-service.http-authentication.kerberos.principal</name>
  <value>hive/orange1@PL</value>
</property>

<property>
  <name>yarn.timeline-service.http-authentication.kerberos.keytab</name>
  <value>/opt/mr3-run/ats/key/hive-orange1.keytab</value>
</property>
```

:::info
Using Kerberos authentication for MR3-UI is optional
and can be disabled independently of the configuration of Hive on MR3.
In order not to use Kerberos authentication for MR3-UI,
set the configuration key `yarn.timeline-service.http-authentication.type` to `simple`.
:::

## Configuring Ranger

In the Ranger service, fill the JDBC URL field with:

* `jdbc:hive2://orange1:9852/;principal=hive/orange1@PL;`

## Running queries

For sending queries to HiveServer2,
the user should obtain a valid Kerberos ticket and use the following JDBC URL:

* `jdbc:hive2://orange1:9852/;principal=hive/orange1@PL;`

Beeline uses the Kerberos ticket provided by the user in order to authenticate itself to HiveServer2.
Hence the Kerberos ticket should be valid at the time of executing Beeline.

## Accessing MR3-UI

To access MR3-UI,
the web browser should be configured to establish a secure connection with the Timeline Server
by passing a valid Kerberos ticket.

