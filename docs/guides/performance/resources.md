---
title: Resource Configuration
sidebar_position: 2
---

## Resources for Metastore, HiveServer2, and DAGAppMaster

To serve concurrent requests from multiple users,
the three main components should be allocated enough resources.
In particular,
failing to allocate enough resources to any of these components
can slow down all queries without reporting errors.
In production environments with up to 16 concurrent connections,
the user can use the following settings as a baseline, and adjust later as necessary.

```sh
# terminal-command
vi env.sh

HIVE_SERVER2_HEAPSIZE=16384
HIVE_METASTORE_HEAPSIZE=16384
```

```yaml
# terminal-command
vi yaml/hive.yaml

        resources:
          requests:
            cpu: 8
            memory: 16Gi
          limits:
            cpu: 8
            memory: 16Gi
```

```yaml
# terminal-command
vi yaml/metastore.yaml

        resources:
          requests:
            cpu: 8
            memory: 16Gi
          limits:
            cpu: 8
            memory: 16Gi
```

```xml
# terminal-command
vi conf/mr3-site.xml

<property>
  <name>mr3.am.resource.memory.mb</name>
  <value>32768</value>
</property>

<property>
  <name>mr3.am.resource.cpu.cores</name>
  <value>16</value>
</property>
```

If HiveServer2 becomes a performance bottleneck,
the user can either increase the resources for HiveServer2 or
create multiple instances of HiveServer2, e.g.:

```yaml
# terminal-command
vi yaml/hive.yaml

spec:
  replicas: 2
```

## Resources for mappers, reducers, and ContainerWorkers

The following configuration keys in `hive-site.xml` specify resources (in terms of memory in MB and number of cores) 
to be allocated to each mapper (Map Task), reducer (Reduce Task), and ContainerWorker.

* `hive.mr3.map.task.memory.mb` and `hive.mr3.map.task.vcores`:
  memory in MB and number of cores to be allocated to each mapper
* `hive.mr3.reduce.task.memory.mb` and `hive.mr3.reduce.task.vcores`:
  memory in MB and number of cores to be allocated to each mapper
* `hive.mr3.all-in-one.containergroup.memory.mb` and `hive.mr3.all-in-one.containergroup.vcores` (for all-in-one ContainerGroup scheme):
  memory in MB and number of cores to be allocated to each ContainerWorker
* `hive.mr3.resource.vcores.divisor`: divisor for the number of cores

`hive.mr3.map.task.memory.mb` and `hive.mr3.reduce.task.memory.mb` should be sufficiently large for the size of the dataset.
Otherwise queries may fail with `OutOfMemoryError` or `MapJoinMemoryExhaustionError`.

The performance of Hive on MR3 usually improves if multiple mappers and reducers can run in a ContainerWorker concurrently.
Moreover queries are less likely to fail with `OutOfMemoryError` or `MapJoinMemoryExhaustionError`
because a mapper or reducer can use more memory than specified by `hive.mr3.map.task.memory.mb` or `hive.mr3.reduce.task.memory.mb`.
With too many mappers and reducers in a ContainerWorker, however, the performance may deteriorate 
because of the increased overhead of memory allocation and garbage collection.

In the following example, we allocate 4GB and 1 core to each mapper and reducer.
For a ContainerWorker, we allocate 40GB and 10 cores so that 10 mappers and reducers can run concurrently.

```xml
# terminal-command
vi conf/hive-site.xml

<property>
  <name>hive.mr3.resource.vcores.divisor</name>
  <value>1</value>
</property>

<property>
  <name>hive.mr3.map.task.memory.mb</name>
  <value>4096</value>
</property>

<property>
  <name>hive.mr3.map.task.vcores</name>
  <value>1</value>
</property>

<property>
  <name>hive.mr3.reduce.task.memory.mb</name>
  <value>4096</value>
</property>

<property>
  <name>hive.mr3.reduce.task.vcores</name>
  <value>1</value>
</property>

<property>
  <name>hive.mr3.all-in-one.containergroup.memory.mb</name>
  <value>40960</value>
</property>

<property>
  <name>hive.mr3.all-in-one.containergroup.vcores</name>
  <value>10</value>
</property>
```

:::tip
We recommend 
setting `hive.mr3.all-in-one.containergroup.memory.mb`
to a multiple of `hive.mr3.map.task.memory.mb` and `hive.mr3.reduce.task.memory.mb`.
:::

The user can configure Hive on MR3 so that
the default values for mappers and reducers can be overridden for each individual query inside Beeline connections.
First, add relevant configuration keys to the list specified by the configuration key `hive.security.authorization.sqlstd.confwhitelist.append`
in `hive-site.xml`.
Note that regular expressions for the list are separated by `|`, not `,`.

```xml
# terminal-command
vi conf/hive-site.xml

<property>
  <name>hive.security.authorization.sqlstd.confwhitelist.append</name>
  <value>hive\.querylog\.location.*|hive\.mr3\.map\.task.*|hive\.mr3\.reduce\.task.*</value>
</property>
```

:::tip
We do not recommend adding `hive.mr3.resource.vcores.divisor` to the list
because it implicitly affects `hive.mr3.all-in-one.containergroup.vcores`.
:::

After restarting Hive on MR3, the user can override the default values inside Beeline connections.
In the following example,
the first query allocates 8GB and 2 cores to each mapper and reducer
whereas the second query allocates 2GB and 1 core to each mapper and reducer.

```sh
0: jdbc:hive2://192.168.10.1:9852/> set hive.mr3.map.task.memory.mb=8192;
0: jdbc:hive2://192.168.10.1:9852/> set hive.mr3.map.task.vcores=2;
0: jdbc:hive2://192.168.10.1:9852/> set hive.mr3.reduce.task.memory.mb=8192;
0: jdbc:hive2://192.168.10.1:9852/> set hive.mr3.reduce.task.vcores=2;
0: jdbc:hive2://192.168.10.1:9852/> !run /home/hive/sample1.sql

0: jdbc:hive2://192.168.10.1:9852/> set hive.mr3.map.task.memory.mb=2048;
0: jdbc:hive2://192.168.10.1:9852/> set hive.mr3.map.task.vcores=1;
0: jdbc:hive2://192.168.10.1:9852/> set hive.mr3.reduce.task.memory.mb=2048;
0: jdbc:hive2://192.168.10.1:9852/> set hive.mr3.reduce.task.vcores=1;
0: jdbc:hive2://192.168.10.1:9852/> !run /home/hive/sample2.sql
```

## Common mistakes

Below we show examples of common mistakes in configuring resources.
We assume that `hive.mr3.resource.vcores.divisor` is set to 1.

#### 1. Memory not fully utilized

* `hive.mr3.map.task.memory.mb` = 1024, `hive.mr3.map.task.vcores` = 1
* `hive.mr3.reduce.task.memory.mb` = 1024, `hive.mr3.reduce.task.vcores` = 1
* `hive.mr3.all-in-one.containergroup.memory.mb` = 8192, `hive.mr3.all-in-one.containergroup.vcores` = 4

A ContainerWorker (with 4 cores) can accommodate 4 mappers and reducers (each requesting 1 core).
Since every mapper or reducer requests only 1024MB, a ContainerWorker never uses the remaining 8192 - 4 * 1024 = 4096MB of memory. 
As a result, the average memory usage reported by DAGAppMaster never exceeds 50%.
```sh
2020-07-19T10:07:28,159  INFO [All-In-One] TaskScheduler: All-In-One average memory usage = 50.0% (4096MB / 8192MB)
```

#### 2. Cores not fully utilized

* `hive.mr3.map.task.memory.mb` = 1024, `hive.mr3.map.task.vcores` = 1
* `hive.mr3.reduce.task.memory.mb` = 1024, `hive.mr3.reduce.task.vcores` = 1
* `hive.mr3.all-in-one.containergroup.memory.mb` = 4096, `hive.mr3.all-in-one.containergroup.vcores` = 8

A ContainerWorker (with 4096MB) can accommodate 4 mappers and reducers (each requesting 1024MB).
Since every mapper or reducer requests 1 core, 8 - 4 * 1 = 4 cores are never used.

#### 3. Memory and cores not fully utilized

* `hive.mr3.map.task.memory.mb` = 2048, `hive.mr3.map.task.vcores` = 2
* `hive.mr3.reduce.task.memory.mb` = 2048, `hive.mr3.reduce.task.vcores` = 2
* `hive.mr3.all-in-one.containergroup.memory.mb` = 9216, `hive.mr3.all-in-one.containergroup.vcores` = 9

After taking 4 mappers and reducers,
a ContainerWorker does not use the remaining resources (1024MB of memory and 1 core).

#### 4. Resources for ContainerWorkers too large

The resources to be assigned to each ContainerWorker should not exceed 
the maximum resources allowed by the underlying resource manager
(Kubernetes or Yarn).
The maximum resources are usually smaller than the physical resources available on a worker node.
For example, a worker node with 16GB of physical memory and 4 physical cores may allow up to 14GB of memory and 3 cores for ContainerWorkers only.

In addition, if a ContainerWorker starts with LLAP I/O enabled, the user should take into consideration the memory allocated for LLAP I/O as well
(`hive.mr3.llap.headroom.mb` and `hive.llap.io.memory.size`).
For more details, see [LLAP I/O](./llap-io).

