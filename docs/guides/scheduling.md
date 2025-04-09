---
title: "Scheduling"
sidebar_position: 12
---

This page provides a guide on setting up a scheduling policy for Hive on MR3.
See [DAG/Task Scheduling](../features/mr3/dag-scheduling) for an introduction.

To meet the needs of a particular environment,
the user may need to adjust the following configuration keys (all in `mr3-site.xml`).

* `mr3.dag.queue.scheme` for assigning DAGs to Task queues
* `mr3.dag.priority.scheme` for assign DAG priorities
* `mr3.vertex.priority.scheme` for updating Vertex priorities
* `mr3.taskattempt.queue.scheme` for choosing a scheme for scheduling Tasks

For capacity scheduling,
two other configuration keys `mr3.dag.queue.capacity.specs` and `mr3.dag.queue.name` are used.

:::info
The user can instead use `hive.mr3.dag.queue.capacity.specs` and `hive.mr3.dag.queue.name`
in `hive-site.xml`,
which are mapped to `mr3.dag.queue.capacity.specs` and `mr3.dag.queue.name`, respectively. 
:::

## Common settings

For `mr3.vertex.priority.scheme`,
the default value `postorder` is usually the best choice.
Setting it to `normalize` can be useful
for allocating a roughly (but not perfectly) fair share of cluster resources to each query.

For `mr3.taskattempt.queue.scheme`,
the default value `indexed` is usually the best choice.

When LLAP I/O is enabled,
setting it to `strict` is recommended,
especially in public cloud environments where reading input data can be slow.

## For batch-only environments

Since throughput is typically the primary concern for batch workloads,
set `mr3.dag.queue.scheme` to `common` and `mr3.dag.priority.scheme` to `fifo`.

## For interactive-only environments

If each query should be allocated a strictly fair share of cluster resources,
set `mr3.dag.queue.scheme` to `individual`.
In this case, `mr3.dag.priority.scheme` can be ignored.

If not, set `mr3.dag.queue.scheme` to `common` and follow these recommendations: 

* Set `mr3.dag.priority.scheme` to `concurrent` to minimize turnaround time.
* If every user submits queries of similar characteristics,
  `mr3.dag.priority.scheme` can be set to `fifo` to maximize throughput.

## For mixed environments

It is best to enable capacity scheduling,
with `mr3.dag.queue.scheme` set to `capacity`,
where batch queries are routed to a Task queue with the lowest priority. 
See [DAG/Task Scheduling](../features/mr3/dag-scheduling)
for examples of setting `mr3.dag.queue.capacity.specs` (or `hive.mr3.dag.queue.capacity.specs`)
to configure capacity scheduling.

With capacity scheduling,
the user can set the configuration key `hive.mr3.dag.queue.name` to designate the Task queue
for each individual query.

In a cooperative environment where every user is allowed to use any Task queue,
a single instance of HiveServer2 is sufficient.

In a more restrictve environment where each Task queue is associated with a certain level of privilege,
multiple instances of HiveServer2 are required.
The administrator should create a separate instance of HiveServer2 for each Task queue,
each configured with a fixed value for `hive.mr3.dag.queue.name`.
To enforce access control,
ordinary users should not be allowed to override the value of `hive.mr3.dag.queue.name`.
This can be easily achieved by including `hive.mr3.dag.queue.name`
in the value of the configuration key `hive.conf.restricted.list`.

:::info
Alternatively
the user can implement a custom Hive hook that inspects the value for `hive.mr3.dag.queue.name`.
:::

For `mr3.dag.priority.scheme`, follow the guideline for interactive-only environments.

