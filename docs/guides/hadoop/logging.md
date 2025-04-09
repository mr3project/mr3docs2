---
title: "Logging"
sidebar_position: 1
---

## Output directory of Metastore

Executing `hive/metastore-service.sh` creates an output directory for Metastore
(e.g., `hive-2025-03-14-00-20-47-89f10360`)
under the directory `hive/metastore-service-result`.

```txt
hive-2025-03-14-00-20-47-89f10360
├── conf
...
│   ├── env.sh
...
│   ├── hive-site.xml
...
├── hive-logs
│   └── hive.log
└── out-metastore.txt
```

* `conf` is the directory containing all configuration files that are effective at the time of starting Metastore.
* `hive-logs/hive.log` is the log file of Metastore.
* `out-metastore.txt` contains the output of `hive/metastore-service.sh`.

## Output directory of HiveServer2

Executing `hive/hiveserver2-service.sh` creates an output directory for HiveServer2
(e.g., `hive-2025-03-14-00-35-08-b34a5b8f`)
under the directory `hive/hiveserver2-service-result`.

```txt
hive-2025-03-14-00-35-08-b34a5b8f
├── conf
...
│   ├── env.sh
...
│   ├── hive-site.xml
...
├── env
└── hive-logs
    ├── hive.log
    └── out-hiveserver2.txt
```

* `conf` is the directory containing all configuration files that are effective at the time of starting HiveServer2. 
* `env` lists all environment variables that are effective at the time of starting HiveServer2.
* `hive-logs/hive.log` is the log file of HiveServer2.
* `hive-logs/out-hiveserver2.txt` contains the output of `hive/hiveserver2-service.sh`.

For HiveServer2 starting with `--amprocess` option,
MR3 DAGAppMaster creates its own output directory with the same name as the application ID 
(e.g., `application_1739072579773_0335`)
under the HiveServer2 output directory.
It contains the log file of MR3 DAGAppMaster, stderr output, and stdout output.

```yaml
hive-2025-03-14-00-35-08-b34a5b8f
└── application_1739072579773_0335
    ├── run.log
    ├── stderr
    └── stdout
```

## Changing the logging configuration 

For Metastore and HiveServer2,
Hive on MR3 uses a logging configuration file `hive-log4j2.properties`
located in the configuration directory.
The user can directly change the logging level in `hive-log4j2.properties`, e.g.:

```sh
# terminal-command
vi conf/tpcds/hive-log4j2.properties

property.hive.log.level = ERROR
```

For DAGAppMaster and ContainerWorker of MR3, 
Hive on MR3 uses a logging configuration file `mr3-container-log4j2.properties`
included in the MR3 jar file.
The user can indirectly change the logging level
by setting the environment variable `LOG_LEVEL` in `env.sh`, e.g.:

```sh
# terminal-command
vi env.sh

LOG_LEVEL=ERROR
```

## Using custom logging configuration for MR3

The user can use a custom logging configuration file for DAGAppMaster and ContainerWorker of MR3 in two steps.

First, update command-line options for DAGAppMaster and ContainerWorker.
In `mr3-site.xml`,
`mr3.am.launch.cmd-opts` specifies command-line options for DAGAppMaster, and
`mr3.container.launch.cmd-opts` specifies command-line options for ContainerWorker.
Hence the user should append a new command-line option `-Dlog4j.configurationFile=`*&lt;name of the custom logging configuration file&gt;* to the values for these keys, e.g.:


```xml
# terminal-command
vi conf/tpcds/mr3-site.xml

<property>
  <name>mr3.am.launch.cmd-opts</name>
  <value>... -Dlog4j.configurationFile=custom-log4j.properties</value>
</property>

<property>
  <name>mr3.container.launch.cmd-opts</name>
  <value>... -Dlog4j.configurationFile=custom-log4j.properties</value>
</property>
```

Second, register the custom logging configuration file as a local resource so that it appears in the classpath.
Here is an example of registering `custom-log4j.properties` as a local resource.

* copy the file to `/tmp/custom-log4j.properties` on HDFS
* append the path to the value of `mr3.aux.uris` in `mr3-site.xml`

```xml 
# terminal-command
vi conf/tpcds/mr3-site.xml

<property>
  <name>mr3.aux.uris</name>
  <value>${auxuris},/tmp/custom-log4j.properties</value>
</property>
```

The custom logging configuration file may use `${sys:mr3.root.logger}` and `${sys:yarn.app.container.log.dir}`. 
At runtime, 
`${sys:mr3.root.logger}` expands to the value of `LOG_LEVEL` in `env.sh`
and `${sys:yarn.app.container.log.dir}` expands to a logging directory determined by Yarn.

