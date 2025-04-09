--- 
title: Speculative Execution
sidebar_position: 75
---

## Stragglers in distributed computing

MR3 implements a mechanism of speculative execution in order to mitigate the effect of stragglers,
i.e., Tasks that run much longer than sibling Tasks originating from the same Vertex.
The problem of stragglers is universal in distributed computing
and a perfect solution is unlikely to emerge because of its very nature.
A mature distributed system, however, should address the problem in one way or another because of the detrimental effects of stragglers:

* The occurrence of even a single straggler can increase the execution time of the DAG considerably, thus spoiling the user experience.
* While stragglers are running, the entire system may almost come to a halt, thus wasting hardware resources for a long time.

As such, MR3 addresses the problem of stragglers with a mechanism of speculative execution.

## Triggering speculative execution

MR3 triggers speculative execution when it detects Tasks that run much longer (without completion) than their sibling Tasks.
To be specific, it starts to watch TaskAttempts for speculative execution
and decides to create new TaskAttempts as follows:

* For every Vertex, MR3 counts the number of completed Tasks and measures their execution time.
* When the number of completed Tasks reaches the percentage specified by the configuration key `mr3.am.task.concurrent.run.threshold.percent`,
MR3 computes **their average execution time** and
starts to watch remaining TaskAttempts for speculative execution.
For example, if `mr3.am.task.concurrent.run.threshold.percent` is set to 95 and a Vertex has 100 Tasks,
MR3 records the average execution time of the first 95 completed Tasks and 
starts to watch TaskAttempts of the remaining 5 Tasks. 
* In order to avoid creating TaskAttempts for speculative execution too early,
the average execution time is adjusted
so that it is no less than the time specified by the configuration key `mr3.am.task.concurrent.run.min.threshold.ms` (in milliseconds).
For example, with `mr3.am.task.concurrent.run.min.threshold.ms` set to 10000,
the average execution time is adjusted to 10 seconds if it is less than 10 seconds.
* If either the number of Tasks or the percentage specified by the configuration key `mr3.am.task.concurrent.run.threshold.percent` is too small, MR3 may watch all TaskAttempts for speculative execution.
For example, if a Vertex has a single Task and `mr3.am.task.concurrent.run.threshold.percent` is set to 95,
MR3 watches the sole Task of the Vertex for speculative execution
(because 1 * 95 / 100 rounds to zero).
In such a case,
the average execution time is set by the configuration key `mr3.am.task.concurrent.run.min.threshold.ms`
because no Task runs before starting speculative execution.
* If a TaskAttempt runs longer than a threshold derived from 1) the average execution time obtained in the previous step
and 2) the multiplier specified by the configuration key `mr3.am.task.concurrent.run.multiplier`,
MR3 creates a new TaskAttempt for the same Task **without killing the existing TaskAttempt.**
For example, if the average execution time is 10 seconds and `mr3.am.task.concurrent.run.multiplier` is set to 2.0, the threshold is 10 * 2.0 = 20 seconds.
Now we see two concurrent TaskAttempts running for the same Task.
* If the new TaskAttempt also runs longer than the threshold, MR3 creates a third TaskAttempt for the same Task.
In this way, MR3 may create a sequence of TaskAttempts for the same Task at a regular interval.
* The number of TaskAttempts for the same Task is limited by the configuration key `mr3.am.task.max.failed.attempts`.
For example, with `mr3.am.task.max.failed.attempts` set to 5, a Task can create up to 5 independent TaskAttempts.
* A Task completes as soon as any of its TaskAttempts completes. All other TaskAttempts are killed immediately. 

MR3 updates the duration of every TaskAttempt with the granularity specified by the configuration key `mr3.task.am.heartbeat.duration.interval.ms`.
Specifically it updates the duration of a TaskAttempt when its heartbeats arrive from the ContainerWorker.
The use of heartbeats is necessary because heartbeats are the only evidence that TaskAttempts are actually running in ContainerWorkers.
(If a TaskAttempt does not respond with heartbeats for too long, it is automatically killed with a timeout.)
Hence the user should not set `mr3.task.am.heartbeat.duration.interval.ms` to too large a value.

When creating the new TaskAttempt, MR3 may preempt an existing TaskAttempt of a descendant Vertex in order to avoid deadlock.
The user can disable speculative execution by setting the configuration key `mr3.am.task.concurrent.run.threshold.percent` to 100,
which is the default value.

## Example

As an example, the following two diagrams show the progress of a Vertex with 10 Tasks.
We assume that the first 10 TaskAttempts start at the same time, and use the following settings:

* `mr3.am.task.concurrent.run.threshold.percent` is set to 90.
* `mr3.am.task.concurrent.run.min.threshold.ms` is set to 10000 (equivalent to 10 seconds).
* `mr3.am.task.concurrent.run.multiplier` is set to 2.0.
* `mr3.am.task.max.failed.attempts` is set to 3.

In the first case, we use the configuration key `mr3.am.task.concurrent.run.min.threshold.ms`.

![speculative.execution](/mr3/speculative.execution.short-fs8.png)

* The first 9 Tasks succeed in less than 10 seconds. Hence their average execution time is adjusted to 10 seconds.
* The threshold for speculative execution is set to 10 * 2.0 = 20 seconds.
* The first TaskAttempt of Task 10 does not complete in 20 seconds,
so MR3 judges it to be a straggler and creates the second TaskAttempt of Task 10 at 20 seconds from the beginning.
* The second TaskAttempt of Task 10 does not complete in 20 seconds, either, so MR3 creates the third TaskAttempt of Task 10 at 40 seconds from the beginning.
Note that the total number of TaskAttempts for Task 10 does not exceed the limit specified by the configuration key `mr3.am.task.max.failed.attempts`.
* The third TaskAttempt completes in 10 seconds (at 50 seconds from the start), and MR3 kills the first and second TaskAttempts.

In the second case, we do not use the configuration key `mr3.am.task.concurrent.run.min.threshold.ms`.

![speculative.execution](/mr3/speculative.execution.average-fs8.png)

* The first 9 Tasks succeed in 100 seconds on average, which is larger than 10 seconds.
* The threshold for speculative execution is set to 100 * 2.0 = 200 seconds.
* The first TaskAttempt of Task 10 does not complete in 200 seconds,
so MR3 judges it to be a straggler and creates the second TaskAttempt of Task 10 at 200 seconds from the beginning.
* The second TaskAttempt of Task 10 does not complete in 200 seconds, either, so MR3 creates the third TaskAttempt of Task 10 at 400 seconds from the beginning.
* The third TaskAttempt completes in 100 seconds (at 500 seconds from the start), and MR3 kills the first and second TaskAttempts.

In conjunction with the use of multiple shuffle handlers in a single ContainerWorker,
speculative execution enables MR3 to eliminate fetch delays which are the most common source of stragglers.
For more details, see [Eliminating Fetch Delays](./fetchdelay). 


