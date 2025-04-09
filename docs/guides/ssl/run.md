---
title: Running with SSL
sidebar_position: 10
---

## Running Ranger

`run-ranger.sh` collects the existing certificate files and the password from `config-run.sh`
in order to create three new files in the directory `ranger-key`:

* hivemr3-ssl-certificate.jks
* hivemr3-ssl-certificate.jceks
* .hivemr3-ssl-certificate.jceks.crc

These files are automatically mounted in the directory `/opt/mr3-run/ranger/key/` inside the Ranger Pod.
In this way, Ranger can communicate with HiveServer2 and the MySQL database securely and also run its own HTTPS server. 

After starting Ranger, connect to the Ranger webpage and 
update the JDBC URL (e.g., `jdbc:hive2://indigo20:9852/;principal=hive/indigo20@RED;ssl=true;sslTrustStore=/opt/mr3-run/ranger/key/hivemr3-ssl-certificate.jks;`).

## Running Timeline Server

The user can execute the script `run-timeline.sh` to start Timeline Server.
Similarly to running Ranger,
the script collects the existing certificate files and the password from `config-run.sh`
in order to create three new files in the directory `timeline-key`:

* hivemr3-ssl-certificate.jks
* hivemr3-ssl-certificate.jceks
* .hivemr3-ssl-certificate.jceks.crc

These files are automatically mounted in the directory `/opt/mr3-run/ats/key/` insider the Timeline Server Pod.

## Running Metastore and HiveServer2 

The user can execute the scripts `run-metastore.sh` and `run-hive.sh`
to start Metastore and HiveServer2.
Similarly to running Ranger and Timeline Server, the scripts collect the existing certificate files and the password from `kubernetes/config-run.sh`,
and mount new KeyStore files in the directory `/opt/mr3-run/hive/key/` inside the Pod.

## Running Beeline

Since HiveServer2 runs with SSL enabled, Beeline should use its own KeyStore file that contains the self-signed certificate. 
The administrator can create a new public KeyStore file `beeline-ssl.jks` for Beeline using the file `mr3-ssl.pem` created previously.
In the following example, we use `beelinepasswd1` for the password for the public KeyStore file.

```sh
# terminal-command
keytool -genkeypair -alias beeline-ssl-key -keyalg RSA -dname "CN=beeline-ssl" -keypass beelinepasswd1 -validity 999 -keystore beeline-ssl.jks -storepass beelinepasswd1
# terminal-command
keytool -importcert -alias trusted-cert-hivemr3 -file mr3-ssl.pem -noprompt -keystore beeline-ssl.jks -storepass beelinepasswd1
```

Then the administrator distributes the public KeyStore file `beeline-ssl.jks` to ordinary users.
The JDBC connection string of a client program should include, e.g.,
`ssl=true;sslTrustStore=/home/hive/mr3/kubernetes/beeline-ssl.jks;trustStorePassword=beelinepasswd1`.
In the case of using Beeline to connect to HiveServer2,
specifying the password `beelinepasswd1` is unnecessary.

## Refreshing the certificate in HiveServer2

In order to invalidate an old certificate and use a new certificate,
the administrator should restart HiveServer2.
A new public KeyStore file should also be distributed to ordinary users.

The validity of the certificate does not affect the connection to HiveServer2.
Hence the administrator does not have to refresh the certificate even after its expiry.

