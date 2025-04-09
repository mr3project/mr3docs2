---
title: "Miscellaneous"
sidebar_position: 10
---

## Using custom configuration settings

A script in the MR3 release may accept additional configuration settings as command-line options according to the following syntax:
```sh
 --hiveconf <key>=<value>       Add a configuration key/value; may be repeated at the end
```
The user can append as many instances of `--hiveconf` as necessary to the command. 
A configuration value specified with `--hiveconf` takes the highest precedence and overrides any existing value in `hive-site.xml`, `mr3-site.xml`, and `tez-site.xml` (not just in `hive-site.xml`).
Hence the user can change the behavior of Hive on MR3 without modifying preset configuration files at all.
(Note that the user can use `--hiveconf` to configure not only Hive but also MR3 and Tez.)
Alternatively the user can directly modify preset configuration files to make the change permanent.

The user may create `hivemetastore-site.xml` and `hiveserver2-site.xml` in a configuration directory
as configuration files for Metastore and HiveServer2, respectively.
Hive automatically reads these files when reading `hive-site.xml`.
The order of precedence of the configuration files is as follows (lower to higher):

* `hive-site.xml` &rarr; `hivemetastore-site.xml` &rarr; `hiveserver2-site.xml` &rarr; `--hiveconf` command-line options 

## Watch `/tmp` when using LocalThread or LocalProcess mode 

An MR3Client creates staging directories under `/tmp/<user name>/` on HDFS by default.
If, however, a DAGAppMaster runs in LocalThread or LocalProcess mode while ContainerWorkers run in Local mode, 
it creates staging directories under `/tmp/<user name>/` **on the local file system.**
If `/tmp/` happens to be full at the time of creating staging directories, Yarn erroneously concludes that HDFS is full, and then transitions to safe mode in which all actions are blocked.
Hence the user should watch `/tmp/` on the local file system when using LocalThread or LocalProcess mode for DAGAppMasters.

A DAGAppMaster running in LocalThread or LocalProcess mode creates its working directory and logging directory under `/tmp/<user name>/` on the local file system.
The user can specify with key `mr3.am.delete.local.working-dir` in `mr3-site.xml` whether or not to delete the working directory when the DAGAppMaster terminates. 
The logging directory, however, is not automatically deleted when the DAGAppMaster terminates.
Hence the user is responsible for cleaning these directories in order to prevent Yarn from transitioning to safe mode.

## Impersonation

In order to support impersonation in HiveServer2, Yarn should be configured to allow the user starting Metastore and HiveServer2 to impersonate.
For example, in order to allow user `hive` to impersonate, 
the administrator should add two configuration settings to `core-site.xml` and restart Yarn.

```xml
# terminal-command
vi /etc/hadoop/conf/core-site.xml

<property>
  <name>hadoop.proxyuser.hive.groups</name>
  <value>hive,foo,bar</value>
</property>

<property>
  <name>hadoop.proxyuser.hive.hosts</name>
  <value>red0</value>
</property> 
```

In this example, `hive` in `hadoop.proxyuser.hive.groups` and `hadoop.proxyuser.hive.hosts` denotes the user starting Metastore and HiveServer2.
Thus `hadoop.proxyuser.hive.groups` is the key for specifying the list of groups whose members can be impersonated by user `hive`, and 
`hadoop.proxyuser.hive.hosts` is the key for specifying the list of hosts where user `hive` can impersonate. 

## Uploading MR3 jar files with doAs enabled

To run HiveServer2 with doAs enabled (by setting `hive.server2.enable.doAs` to true in `hive-site.xml`),
the user (typically the administrator user) should make the MR3 jar files readable to all end users after uploading to HDFS.
This is because every job runs under an end user who actually submits it.
If the MR3 jar files are not readable to the end user, the job immediately fails because no files can be registered as local resources.

