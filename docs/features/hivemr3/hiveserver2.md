---
title: HiveServer2 Modes
sidebar_position: 1
---

In Hive on MR3, HiveServer2 runs in either **shared session mode** or **individual session mode**.

## HiveServer2 in shared session mode

In shared session mode, HiveServer2 maintains a single session (by creating an MR3Session object)
to be shared by all Beeline connections.
This session creates a DAGAppMaster to serve all Hive queries submitted through Beeline connections, and 
DAGs generated from such Hive queries can send their TaskAttempts to any ContainerWorker. 
As a result, all Beeline connections share the entire pool of ContainerWorkers through a common DAGAppMaster. 

![shared.session](/hadoop/shared.session-fs8.png)

## HiveServer2 in individual session mode

In individual session mode, each Beeline connection creates its own session (by creating a new MR3Session object) not to be shared with any other Beeline connection.
Each DAGAppMaster maintains its own pool of ContainerWorkers which are not visible to other sessions.
As a result, there is no sharing of ContainerWorkers between Beeline connections,
and in general, shared session mode achieves a better utilization of computing resources because ContainerWorkers can serve any TaskAttempt from any DAG. 

![individual.session](/hadoop/individual.session-fs8.png)

Shared session mode is enabled if `hive.server2.mr3.share.session` is set to true in `hive-site.xml`.
To use individual session mode, `hive.server2.mr3.share.session` should be set to false
and the environment variable `MR3_APPLICATION_ID_TIMESTAMP` should not be set in HiveServer2 Pod.

