---
title: "High Availability"
sidebar_position: 2
---

## Enabling high availability for HiveServer2

In order to enable [high availability for HiveServer2](../../features/hivemr3/high-availability),
the user should take the following two steps:

* set the environment variable `MR3_SHARED_SESSION_ID` in `env.sh`
* configure high availability by updating `hive-site.xml`

First, set `MR3_SHARED_SESSION_ID`
to a unique string before starting HiveServer2 instances, e.g.:

```sh
# terminal-command
vi env.sh

export MR3_SHARED_SESSION_ID=d7b52f74-7349-405c-88a2-d0d1cbb5a918
```

The environment variable
(whose value internally serves as the MR3 session ID in HiveServer2)
can be set to any string, 
but **should remain the same across all HiveServer2 instances**
so that they share the same staging directory on HDFS.

Next, configure HiveServer2 by updating `hive-site.xml`.
The following table shows configuration keys relevant to high availability of HiveServer2.
In particular, setting `hive.server2.active.passive.ha.enable` to true enables high availability and allows all HiveServer2 instances to share a common MR3 DAGAppMaster.
Note that high availability requires service discovery
(specified by `hive.server2.support.dynamic.service.discovery`)
so that all HiveServer2 instances can be registered to ZooKeeper.

|**Name**|**Default value**|Example to enable high availability|
|--------|:----------------|:----------|
|hive.server2.active.passive.ha.enable|false|true
|hive.server2.support.dynamic.service.discovery|false|true|
|hive.mr3.zookeeper.appid.namespace|mr3AppId|(default value)|
|hive.server2.active.passive.ha.registry.namespace|hs2ActivePassiveHA|(default value)|
|hive.server2.zookeeper.namespace|hiveserver2|hiveserver2-mr3|
|hive.zookeeper.quorum||blue0:2181|
|hive.zookeeper.client.port|2181|2181|

Since high availability of HiveServer2 uses service discovery, 
a Beeline connection selects a HiveServer2 instance randomly. 
In order to take advantage of service discovery,
the user should specify the ZooKeeper server and a namespace when running Beeline.
For example,
with a ZooKeeper server running at `blue0:2181` and a namespace `hiveserver2-mr3`,
the user can set the environment variable `HIVE_SERVER2_JDBC_OPTS` in `env.sh` as follows.

```sh
# terminal-command
vi env.sh

HIVE_SERVER2_JDBC_OPTS="ssl=false;serviceDiscoveryMode=zooKeeper;zooKeeperNamespace=hiveserver2-mr3"
```

## Running multiple HiveServer2 instances on the same node

If multiple HiveServer2 instances are to be run on the same node, 
the user should assign different ports
by setting the environment variable `HIVE_SERVER2_PORT` in `env.sh`
to a unique value **for each HiveServer2 instance.**
In addition, the following two configuration keys should be set in `hive-site.xml`.

* set `hive.server2.webui.port` to 0 so that no conflict arises
* set `hive.server2.logging.operation.log.location` appropriately, e.g., `/tmp/hive/operation_logs/${hive.server2.port}`

## Using ZooKeeper

If HiveServer2 establishes connections to ZooKeeper at its launch,
the user should make sure that the Curator module (`org.apache.curator`) used in HiveServer2 should be compatible with the ZooKeeper service.
If not, the user should manually run ZooKeeper of an appropriate version and set the configuration key `hive.zookeeper.quorum` in `hive-site.xml`.

