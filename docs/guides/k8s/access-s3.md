---
title: Accessing S3
sidebar_position: 8
---

The user can access Amazon S3 (Simple Storage Service) from the outside of Amazon AWS
by providing AWS credentials. 
For the security purpose, we specify AWS credentials in environment variables in `env.sh`
and do not specify them in a configuration file such as `conf/core-site.xml`.
As `env.sh` may contain AWS credentials,
we mount it as a Secret, not a ConfigMap, inside Metastore and HiveServer2 Pods.

## Configuring access to S3 

In order to access S3, the user should take three steps.
First set the configuration key `fs.s3a.aws.credentials.provider` in `conf/core-site.xml`. 

```xml
# terminal-command
vi conf/core-site.xml

<property>
  <name>fs.s3a.aws.credentials.provider</name>
  <value>com.amazonaws.auth.EnvironmentVariableCredentialsProvider</value>
</property>
```

The class `EnvironmentVariableCredentialsProvider` attempts to read AWS credentials
from two environment variables `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

Next set two environment variables `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `env.sh`.

```sh
# terminal-command
vi env.sh

export AWS_ACCESS_KEY_ID=_your_aws_access_key_id_
export AWS_SECRET_ACCESS_KEY=_your_aws_secret_secret_key_
```

Since `env.sh` is mounted as a Secret inside Metastore and HiveServer2 Pods,
it is safe to write AWS access key ID and secret access key in `env.sh`.

Finally append `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` 
to the values of the configuration keys `mr3.am.launch.env` and `mr3.container.launch.env` in `conf/mr3-site.xml`.
Note that for the security purpose, **the user should NOT write AWS access key ID and secret access key.**
Just appending the two strings suffices 
because MR3 automatically sets the two environment variables by reading from the system environment.

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

If the user creates a Kubernetes cluster inside Amazon AWS (e.g., by using EC2 instances),
using the class `InstanceProfileCredentialsProvider` for the configuration key `fs.s3a.aws.credentials.provider` may be enough.

```xml
# terminal-command
vi conf/mr3-site.xml

<property>
  <name>fs.s3a.aws.credentials.provider</name>
  <value>com.amazonaws.auth.InstanceProfileCredentialsProvider</value>
</property>
```
In this case, there is no need to specify AWS credentials in `kubernetes/env.sh`.

## Accessing S3-compatible storage

If the user wants to access custom S3-compatible storage, 
additional configuration keys should be set in `conf/core-site.xml`.
In particular, the configuration key `fs.s3a.endpoint` should be set to point to the storage server.
Here is an example of setting configuration keys for accessing a custom S3-compatible storage.

```xml
# terminal-command
vi conf/core-site.xml

<property>
  <name>fs.s3a.endpoint</name>
  <value>http://my.s3.server.address:9000</value>
</property>

<property>
  <name>fs.s3a.impl</name>
  <value>org.apache.hadoop.fs.s3a.S3AFileSystem</value>
</property>

<property>
  <name>fs.s3a.path.style.access</name>
  <value>true</value>
</property>
```

## Using LLAP I/O with S3

To use LLAP I/O when accessing S3,
set the configuration key `hive.llap.io.use.fileid.path` to false
in `conf/hive-site.xml`.

```xml
# terminal-command
vi conf/hive-site.xml

<property>
  <name>hive.llap.io.use.fileid.path</name>
  <value>false</value>
</property>
```

