---
title: Auto Parallelism
sidebar_position: 5
---

## Enabling auto parallelism

To enable [auto parallelism](/docs/features/hivemr3/auto-parallelism),
the user should set
`hive.tez.auto.reducer.parallelism` to true in `hive-site.xml`
and `tez.shuffle-vertex-manager.enable.auto-parallel` to true in `tez-site.xml`.
Enabling auto parallelism may cause individual queries to run slightly slower,
but usually improves the throughput for concurrent queries, especially when the cluster is under heavy load.

If `tez.shuffle-vertex-manager.enable.auto-parallel` is set to true,
the following configuration keys decide when to trigger auto parallelism and how to redistribute Tasks.
(The first two configuration keys are ignored for Vertexes with incoming edges of type `SIMPLE_EDGE`.)

* `tez.shuffle-vertex-manager.auto-parallel.min.num.tasks`
* `tez.shuffle-vertex-manager.auto-parallel.max.reduction.percentage`
* `tez.shuffle-vertex-manager.use-stats-auto-parallelism`
* `tez.shuffle.vertex.manager.auto.parallelism.min.percent`

Here is an example of configuring auto parallelism.

```xml
# terminal-command
vi conf/tez-site.xml

<property>
  <name>tez.shuffle-vertex-manager.enable.auto-parallel</name>
  <value>true</value>
</property>

<property>
  <name>tez.shuffle-vertex-manager.auto-parallel.min.num.tasks</name>
  <value>251</value>
</property>

<property>
  <name>tez.shuffle-vertex-manager.auto-parallel.max.reduction.percentage</name>
  <value>20</value>
</property>

<property>
  <name>tez.shuffle-vertex-manager.use-stats-auto-parallelism</name>
  <value>true</value>
</property>

<property>
  <name>tez.shuffle.vertex.manager.auto.parallelism.min.percent</name>
  <value>20</value>
</property>
```

* `tez.shuffle-vertex-manager.auto-parallel.min.num.tasks` = 251:
Vertexes with at least 251 Tasks are considered for auto parallelism.
* `tez.shuffle-vertex-manager.auto-parallel.max.reduction.percentage` = 20:
The number of Tasks can be reduced by up to 100 - 20 = 80 percent,
thereby leaving 20 percent of Tasks.
For example, a Vertex of 100 Tasks in the beginning may end up with 20 Tasks
when auto parallelism is used.
* `tez.shuffle-vertex-manager.use-stats-auto-parallelism` = true:
Vertexes analyze the statistics of output from upstream Tasks when applying auto parallelism.
* `tez.shuffle.vertex.manager.auto.parallelism.min.percent` = 10:
When the statistics of output from upstream Tasks is considered,
an input size of zero is normalized to 10 while the maximum input size is mapped to 100.

When sufficient resources are available,
disabling auto parallelism sometimes improves the response time of sequential queries.
In order to disable auto parallelism,
set `tez.shuffle-vertex-manager.auto-parallel.min.num.tasks` in `tez-site.xml` to 
a value larger than `hive.exec.reducers.max` in `hive-site.xml`.

:::tip
The default value of `tez.shuffle-vertex-manager.auto-parallel.max.reduction.percentage`
in the MR3 release is 50, which is a reasonable choice for executing sequential queries.
In a cluster where many queries are executed concurrently,
a smaller value (e.g., 20) is recommended, as it usually results in higher throughput.
:::

:::caution
Aggressive use of auto parallelism
(e.g., setting `tez.shuffle-vertex-manager.auto-parallel.max.reduction.percentage` to 5)
increases the likelihood of stragglers
because a single reducer can be assigned too much data to fetch from upstream mappers.
:::

## `hive.tez.llap.min.reducer.per.executor`

When auto parallelism is enabled,
Hive on MR3 uses the configuration key `hive.tez.llap.min.reducer.per.executor` in `hive-site.xml`
to decide the baseline for the number of reducers for each Reduce Vertex.
For example, if the entire set of ContainerWorkers can run 100 reducers concurrently and 
`hive.tez.llap.min.reducer.per.executor` is set to 0.2,
the query optimizer tries to assign at most 100 * 0.2 = 20 reducers to each Reduce Vertex.
In this way,
the configuration key `hive.tez.llap.min.reducer.per.executor` affects the execution time of queries.

For typical workloads, the default value of 1.0 is acceptable,
but depending on the characteristics of the cluster 
(e.g., number of ContainerWorkers, concurrency level, size of the dataset, resources for mappers and reducers, and so on),
a different value may result in an improvement (or a degradation) in performance.

If the number of reducers is too small, the user can try a larger value of the configuration key `hive.tez.llap.min.reducer.per.executor`
**(inside Beeline connections without having to restart HiveServer2).**
Note that a larger value increases the initial number of reducers before auto parallelism kicks in,
but it does not guarantee an increase in the final number of reducers after adjustment by auto parallelism.
If the final number of reduces still does not change,
the user can reduce the resources to be allocated to each reducer
by updating `hive.mr3.reduce.task.memory.mb` and `hive.mr3.reduce.task.vcores` so that ContainerWorkers can accommodate more reducers.

Here is an example of trying to increase the final number of reducers in a Beeline session (where we set `hive.mr3.reduce.task.vcores` to 0 and ignore the number of cores).

1. `hive.tez.llap.min.reducer.per.executor` = 0.2, `hive.mr3.reduce.task.memory.mb` = 6144. \
ContainerWorkers can accommodate 432 reducers. The initial number of reducers = 432 * 0.2 = 87.
Auto parallelism has no effect and the final number of reducers is also 87.
2. `hive.tez.llap.min.reducer.per.executor` = 1.0. \
The initial number of reducers increases to 432 * 1.0 = 432.
Auto parallelism decreases the number of reducers to 432 / 5 = 87,
so the final number of reducers after adjustment by auto parallelism is still the same.
3. `hive.tez.llap.min.reducer.per.executor` = 2.0. \
The initial number of reducers increases to 432 * 2.0 = 864.
The final number of reducers is still 864 / 10 = 87.
4. `hive.mr3.reduce.task.memory.mb` = 4096. \
The initial number of reducers increase to 1009 which is the maximum set by the configuration key `hive.exec.reducers.max`. 
The final number of reducers is 1009 / 10 = 101.

