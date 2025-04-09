---
title: Recovery on Hadoop
sidebar_position: 7
---

Hive on MR3 on Hadoop is designed to recover from catastrophic failures such as Yarn Application failures and DAGAppMaster failures. 
In conjunction with the fault tolerance property of MR3 which deals with ContainerWorker failures,
the recovery mechanism enables Hive on MR3 to continue its operation in the event of almost all types of failures.
Below we describe the behavior of Hive on MR3 when 1) a Yarn Application is killed; 2) a DAGAppMaster is killed.

## When a Yarn Application is killed

HiveServer2 is always associated with one or more Yarn Applications.
In shared session mode, all Beeline connections share a common Yarn Application
whereas in individual session mode, each Beeline connection creates its own Yarn Application.
In either case, Hive on MR3 responds to Yarn Application failures as follows:

* Beeline immediately receives `FAILED` for an active query.
* Beeline stays connected to HiveServer2.
* HiveServer2 starts a new Yarn Application **when a new query is submitted.**
* In the worst case, Beeline may fail to submit a new query if the new Yarn Application is killed right away. Still it stays connected to HiveServer2.

Thus only the end user experiences a single query failure for a brief period of time.

When a Yarn Application is killed, its DAGAppMaster is also killed automatically.
Depending on its mode, the DAGAppMaster may be running as a Yarn container (in Yarn mode with `mr3.master.mode=yarn`),
as a process on the same node where HiveServer2 is running (in LocalProcess mode with `mr3.master.mode=local-process`), 
or as a thread inside HiveServer2 (in LocalThread mode `mr3.master.mode=local-thread`).

## When a DAGAppMaster is killed

When a DAGAppMaster is killed, the behavior of Hive on MR3 depends on the DAGAppMaster mode.
In Yarn mode (`mr3.master.mode=yarn`), the following sequence takes place:

* Yarn tries to start a new DAGAppMaster.
* For an active query, Beeline keeps receiving `RUNNING` with no progress (i.e., zero percent in the progress bar) until the new DAGAppMaster starts. 
* Eventually the query **restarts,** and Beeline also resumes normally.
* If Yarn fails to start a new DAGAppMaster, Yarn Application is killed. 
* In the worst case, if Beeline submits a new query while a new DAGAppMaster is starting, it fails to submit the query. 

Thus the DAGAppMaster failure can be detected by the end user as a temporary halt of the query execution while the new DAGAppMaster starts.

In LocalProcess mode (`mr3.master.mode=local-process`), 
the outcome is different because MR3 does not support DAGAppMaster recovery in LocalProcess mode:

* Beeline receives `FAILED` immediately for an active query.
* A new DAGAppMaster does **NOT** start automatically.
* Yarn Application keeps running, and all orphaned containers also keep running. 
* Beeline stays connected to HiveServer2.
* When a new query is submitted, the previous Yarn Application fails (thus killing all the orphaned containers) and a new Yarn Application starts.

Thus the end user can continue to send queries via the same Beeline connection.

In LocalThread mode (`mr3.master.mode=local-thread`), no DAGAppMaster can be killed because it is running inside HiveServer2 as a thread.

