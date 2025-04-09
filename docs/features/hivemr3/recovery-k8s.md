---
title: Recovery on Kubernetes
sidebar_position: 8
---

Hive on MR3 on Kubernetes quickly recovers from DAGAppMaster failures
by virtue of its use of Deployment for creating DAGAppMaster Pods.
When a DAGAppMaster Pod is killed or its liveness probe reports a failure,
Kubernetes automatically creates a new DAGAppMaster Pod in replacement of the old Pod.
(In earlier versions, MR3 itself is responsible for detecting the failure of the DAGAppMaster Pod
and requesting a new DAGAppMaster Pod, thus making the recovery process rather slow.) 
Below we describe the behavior of Hive on MR3 on Kubernetes when 1) a DAGAppMaster Pod is killed; 2) a Beeline connection is killed.

## When a DAGAppMaster Pod is killed

When a DAGAppMaster Pod is killed, the following sequence takes place:

* Kubernetes immediately creates a new DAGAppMaster Pod.
* For an active query, Beeline keeps receiving `RUNNING` with no further progress
until the new DAGAppMaster Pod goes live.
* Eventually the query **restarts,** and Beeline also continues to run normally.

Internally the new DAGAppMaster Pod recovers all DAGs created by active queries.
Thus the user does not have to submit the same query again.

## When a Beeline connection is killed

If a Beeline connection is killed (e.g., with command `kill -9`),
Hive on MR3 removes its corresponding session from HiveServer2 and kills any running DAG inside the DAGAppMaster.

