---
title: Creating certificates and secrets for SSL
sidebar_position: 2
---

Using SSL encryption requires several certificates and secrets (TrustStores and KeyStores).
While it is feasible to create them manually,
the user can use the script `generate-ssl.sh` included in the MR3 release.

The script has the following requirements.

* Java (which should match the Java version used by Hive on MR3)
* Hadoop binary distribution for executing `hadoop credentials`
* Java keytool
* openssl

The environment variables `JAVA_HOME` and `HADOOP_HOME` should be set before executing the script.

```sh
# terminal-command
echo $JAVA_HOME
/usr/lib/jdk17/
# terminal-command
echo $HADOOP_HOME
/home/hive/hadoop-3.3.6
# terminal-command
which keytool
/usr/bin/keytool
# terminal-command
which openssl
/usr/bin/openssl
```

At minimum, the user should set the following variables in the script `generate-ssl.sh`
located at the root directory of the MR3 release.

```sh
# terminal-command
vi generate-ssl.sh

NAMESPACE=hivemr3
HOST=orange1
VALID_DAYS=365
BEELINE_KEYSTORE_PASSWORD=beelinepassword
```

* `NAMESPACE`: namespace of the Kubernetes cluster
* `HOST`: host name assigned to the public IP address for the HiveServer2.
  For TypeScript code, use `hiveserver2IpHostname` in `basicsEnv`.
* `VALID_DAYS`: period (in days) in which KeyStore and TrustStore files remain valid
* `BEELINE_KEYSTORE_PASSWORD`: password for the Beeline KeyStore (`beeline-ssl.jks`) to be distributed to end users

The following optional variables are set in our example.

```sh
# terminal-command
vi generate-ssl.sh

PASSWORD=MySslPassword123
METASTORE_DATABASE_PASSWORD=passwd
S3_CERTIFICATE=s3-public.cert
COMMON_NAME=orange1
```

* `PASSWORD`: password for KeyStores and TrustStores.
If not set, the script uses a random string for the password.
* `METASTORE_DATABASE_PASSWORD`: password for the MySQL server for Metastore 
* `S3_CERTIFICATE`: certificate for connecting to S3-compatible storage
* `COMMON_NAME`: instance in the Kerberos service principal for HiveServer2.
  For TypeScript code, use `hiveserver2IpHostname` in `basicsEnv`.
  This is required for using Python clients when connecting to HiveServer2.

The following variables should be set if the connection to the Metastore database is secure.
In our example, the connection is not secure.

```sh
# terminal-command
vi generate-ssl.sh

METASTORE_DATABASE_HOST=
METASTORE_MYSQL_CERTIFICATE=
```

* `METASTORE_DATABASE_HOST`: host name for the database server
* `METASTORE_MYSQL_CERTIFICATE`: certificate for connecting to the database server

The following variables should be set if the connection to the database server for Ranger is secure.
In our example, the connection is not secure.

```sh
# terminal-command
$ vi generate-ssl.sh

RANGER_DATABASE_HOST=
RANGER_MYSQL_CERTIFICATE=
```

* `RANGER_DATABASE_HOST`: host name for the database server
* `RANGER_MYSQL_CERTIFICATE`: certificate for connecting to the database server

Executing the script generates several files.
The user may use empty strings for input.

```sh
# terminal-command
ls s3-public.cert
s3-public.cert
# terminal-command
./generate-ssl.sh
...
Country Name (2 letter code) [AU]:
State or Province Name (full name) [Some-State]:
Locality Name (eg, city) []:
Organization Name (eg, company) [Internet Widgits Pty Ltd]:
Organizational Unit Name (eg, section) []:
Common Name (e.g. server FQDN or YOUR name) []:
Email Address []:
...
Trust this certificate? [no]:  yes
...
Trust this certificate? [no]:  yes
...
Country Name (2 letter code) [AU]:
State or Province Name (full name) [Some-State]:
Locality Name (eg, city) []:
Organization Name (eg, company) [Internet Widgits Pty Ltd]:
Organizational Unit Name (eg, section) []:
Common Name (e.g. server FQDN or YOUR name) []:
Email Address []:
```

The user can find the following output files. 

* `hivemr3-ssl-certificate.jceks` and `hivemr3-ssl-certificate.jks`
are KeyStore and TrustStore for Hive on MR3.
* `mr3-keystore.jks` and `mr3-truststore.jks` are KeyStore and TrustStore for secure shuffle.
* `beeline-ssl.jks` is KeyStore to be distributed to end users running Beeline
to connect to HiveServer2.
Its password is specified in `BEELINE_KEYSTORE_PASSWORD` in the script.
* `mr3-ssl.pem` can be used to update the certificate of the Metastore and Ranger databases.

