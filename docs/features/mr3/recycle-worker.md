--- 
title: Worker Scheduling
sidebar_position: 65
---

## Sharing and recycling ContainerWorkers among multiple Clients

MR3 allows **multiple clients** to share ContainerWorkers by creating a common ContainerGroup.
All MR3 ContainerWorkers belonging to the same ContainerGroup have common characteristics
and may execute any TaskAttempt originating from any DAG submitted **by any client that owns the ContainerGroup.**
Since clients may submit DAGs of varying complexity at irregular intervals,
using a common ContainerGroup can achieve higher resource utilization
than creating a different ContainerGroup for each individual client.
Note that a ContainerGroup can be owned by multiple clients.
This is feasible because MR3 merges ContainerGroups of the same name that possess the same set of properties.

In order to further increase resource utilization,
MR3 allows ContainerWorkers to be **recycled among different ContainerGroups.**
Two ContainerGroups are compatible if they provide an identical runtime environment with respect to compute resources.
Hence we can safely migrate a ContainerWorker between compatible ContainerGroups
simply after reinitializing it.
Note that the resource manager such as Yarn or Kubernetes is unaware of (and not interested in) the change in the ownership of the MR3 ContainerWorker.
Internally MR3 maintains ContainerKinds to keep track of sets of compatible ContainerGroups.
For every new ContainerGroup,
MR3 either adds it to an existing ContainerKind or creates a new ContainerKind after checking the compatibility.

The mechanism of recycling ContainerWorkers is particularly useful for Spark on MR3.
In fact, the main motivation for developing Spark on MR3 is to be able to recycle compute resources among Spark applications.

## WorkerScheduler of MR3

WorkerScheduler of MR3 is responsible for managing the migration of ContainerWorkers between ContainerGroups in the same ContainerKind.
It provides two policies,
FIFO scheduling and fair scheduling,
which specify when to stop ContainerWorkers and where to migrate ContainerWorkers.
Once migrated to another ContainerGroup, a stopped ContainerWorker can reinitialize itself and resume the execution of TaskAttempts.

* Under FIFO scheduling,
a ContainerWorker stops only voluntarily when it has no more TaskAttempts to execute and no more intermediate data to transmit.
Then WorkerScheduler migrates the stopped ContainerWorker to the oldest ContainerGroup in need of new ContainerWorkers.
Thus we may think of FIFO scheduling as assigning the highest priority to the oldest ContainerGroup.

 * Under fair scheduling,
WorkerScheduler tries to maintain the same number of ContainerWorkers for all the ContainerGroups.
At a regular interval, it updates the number of ContainerWorkers belonging to each ContainerGroup.
Then a ContainerGroup is requested to stop some of its ContainerWorkers if it has more ContainerWorkers than average,
whereas a ContainerGroup with fewer ContainerWorkers than average is allowed to take stopped ContainerWorkers.
Since a ContainerWorker may keep intermediate data to transmit, it does not stop immediately upon request.
Rather it stops gracefully by waiting until the completion of all running DAGs.

By default, MR3 does not recycle ContainerWorkers.
In order to use FIFO scheduling and fair scheduling,
set the configuration key `mr3.container.scheduler.scheme` to `fifo` and `fair`, respectively.
Under fair scheduling,
the configuration key `mr3.check.memory.usage.event.interval.secs` specifies the interval (in seconds)
at which the number of ContainerWorkers belonging to each ContainerGroup is updated.

