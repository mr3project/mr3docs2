---
title: Configuring MR3 
sidebar_position: 1
---

The behavior of MR3 is specified by the configuration file `mr3-site.xml` in the classpath. 
Below we describe all configuration keys for MR3 which are divided into 12 sections:

* MR3Runtime: configuration keys relevant to all components (MR3Client, DAGAppMaster, ContainerWorker)
* MR3Client: configuration keys that are consumed or set by MR3Client 
* DAGAppMaster: configuration keys that are consumed or set by DAGAppMaster
* ContainerGroup: configuration keys that specify properties of ContainerGroups
* DAG: configuration keys that specify properties of DAGs
* ContainerWorker: configuration keys for ContainerWorkers 
* Memory usage and autoscaling: configuration keys for autoscaling
* TokenRenewer: configuration keys related to Kerberos and token renewal 
* HistoryLogger: configuration keys for history logging
* Tez counters: configuration keys for Tez counters
* Kubernetes: configuration keys for running MR3 on Kubernetes
* Spark on MR3: configuration keys for Spark on MR3

## MR3Runtime

|**Name**|**Default value**|Description|
|--------|:----------------|:----------|
|mr3.runtime|tez|**tez**: use Tez 0.9.1 runtime. **spark**: use Spark runtime.|
|mr3.master.mode|yarn|**local-thread**: DAGAppMaster starts as a new thread inside MR3Client.  **local-process**: DAGAppMaster starts as a new process on the same machine where MR3Client is running.  **yarn**: DAGAppMaster starts as a new container in the Hadoop cluster.  **kubernetes**: DAGAppMaster starts as a Pod in the Kubernetes cluster. For more details, see [DAGAppMaster and ContainerWorker Modes](../../features/mr3/master-worker-mode).|
|mr3.am.acls.enabled|true|**true**: enable ACLs for DAGAppMaster and DAGs.  **false**: disable ACLS for DAGAppMaster and DAGs.|
|mr3.cluster.additional.classpath||Additional classpath for DAGAppMaster and ContainerWorkers|
|mr3.cluster.use.hadoop-libs|false|**true**: include the classpath defined in `YarnConfiguration.YARN_APPLICATION_CLASSPATH`.  **false**: do not include the classpath defined in `YarnConfiguration.YARN_APPLICATION_CLASSPATH`.|
|mr3.am.max.java.heap.fraction|0.8|Fraction of memory to be allocated for Java heap in DAGAppMaster|
|mr3.container.max.java.heap.fraction|0.8|Fraction of memory to be allocated for Java heap in ContainerWorkers|
|mr3.async.logging|true|**true**: use asynchronous logging.  **false**: use synchronous logging.|

## MR3Client

|**Name**|**Default value**|Description|
|--------|:----------------|:----------|
|mr3.lib.uris||URIs for the MR3 library jar files|
|mr3.aux.uris||URIs for the MR3 auxiliary jar files|
|mr3.queue.name||Name of the Yarn queue to which the MR3 job is submitted. On Yarn, the user can exploit it to set a limit on the total resources consumed by MR3. Not used on Kubernetes.|
|mr3.application.tags||Comma-separated list of application tags for the MR3 job|
|mr3.application.scheduling.properties.map||Comma-separated list of scheduling properties for the MR3 job (e.g., `foo1=bar1,foo2=bar2`)|
|mr3.application.am.node.label||Node label expression for DAGAppMaster on Yarn|
|mr3.application.worker.node.label||Node label expression for ContainerWorkers on Yarn|
|mr3.credentials.path||Path to the credentials for MR3|
|mr3.am.staging-dir|`/tmp/${user.name}/mr3/staging`|Staging directory for DAGAppMaster|
|mr3.am.staging.dir.check.ownership.permission|true|**true**: check the ownership and directory permission of the staging directory.  **false**: do not check. Set to false if the staging directory reside on S3 which has notion of ownership and directory permission.|
|mr3.am.resource.memory.mb|4096|Size of memory in MB for DAGAppMaster|
|mr3.am.resource.cpu.cores|1|Number of cores for DAGAppMaster|
|mr3.am.max.app.attempts|2|Max number of Yarn ApplicationAttempts for the MR3 job|
|mr3.am.log.level|INFO|Logging level for DAGAppMaster|
|mr3.am.local.working-dir|`/tmp/${user.name}/mr3/working-dir`|Local working directory for DAGAppMaster running in LocalThread or LocalProcess mode|
|mr3.am.local.log-dir|`/tmp/${user.name}/mr3/log-dir`|Logging directory for DAGAppMaster running in LocalThread or LocalProcess mode|
|mr3.cancel.delegation.tokens.on.completion|true|**true**: cancel delegation tokens when the MR3 job completes.  **false**: do not cancel delegation tokens.|
|mr3.dag.status.pollinterval.ms|1000|Time interval in milliseconds for retrieving the status of running DAGs|
|mr3.am.session.mode|false|**true**: create MR3 SessionClient.  **false**: create MR3 JobClient. For more details, see [MR3Client](../../features/mr3/client).|
|mr3.am.session.share.dag.client.rpc|true|For MR3 SessionClient only.  **true**: all DAGClients share a common DAGClientRPC object.  **false**: each DAGClient creates its own DAGClientRPC object.|
|mr3.session.client.timeout.secs|120|Time in seconds for terminating MR3 SessionClient with a timeout|

|**Name**|**Default value**|Description|
|--------|:----------------|:----------|
|mr3.am.launch.cmd-opts|-server -Djava.net.preferIPv4Stack=true -Dhadoop.metrics.log.level=WARN -XX:+UseNUMA -XX:+UseParallelGC|Command-line options for launching DAGAppMaster|
|mr3.am.launch.env|LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$HADOOP_HOME/lib/native/|Environment variables for launching DAGAppMaster. Each entry takes either "VAR=VALUE" separated by "=" or "VAR". In the latter case, the value in the system environment is used.|

## DAGAppMaster 

|**Name**|**Default value**|Description|
|--------|:----------------|:----------|
|mr3.yarn.priority|0|Priority of the MR3 Yarn application|
|mr3.am.worker.mode|local|Type of the resource scheduler created in DAGAppMaster. The actual type of ContainerWorkers is specified by `mr3.container.resourcescheduler.type` for each ContainerGroup. **local**: ContainerWorkers start as threads inside DAGAppMaster.  **yarn**: ContainerWorkers start as containers in a Hadoop cluster.  **kubernetes**: ContainerWorkers start as Pods in a Kubernetes cluster.  **process**: ContainerWorkers executed by users contact DAGAppMaster. For more details, see [DAGAppMaster and ContainerWorker Modes](../../features/mr3/master-worker-mode).|
|mr3.am.max.num.concurrent.dags|128|Max number of DAGs that can run concurrently in DAGAppMaster|
|mr3.am.shutdown.rightaway|true|**true**: DAGAppMaster does not wait until MR3Client retrieves the final states of all DAGs.  **false**: DAGAppMaster waits until MR3Client retrieves the final states of all DAGs.|
|mr3.am.shutdown.sleep.max.ms|5000|Time in milliseconds to wait until MR3Client retrieves the final states of all DAGs|
|mr3.am.delete.local.working-dir|true|**true**: DAGAppMaster running in LocalThread or LocalProcess mode deletes its local working directory upon termination.  **false**: DAGAppMaster running in LocalThread or LocalProcess mode does not delete its local working directory upon termination. Set to true to ensure that DAGAppMaster in LocalProcess mode terminates properly.|
|mr3.am.taskcommunicator.type|protobuf|**protobuf**: use Protobuf for communication between TaskCommunicator and ContainerWorkers.  **protowritable**: use Protobuf + Writable for communication between TaskCommunicator and ContainerWorkers.  **writable**: use Writable for communication between TaskCommunicator and ContainerWorkers.  **direct**: use direct communication between TaskCommunicator and local ContainerWorkers.|
|mr3.am.taskcommunicator.thread.count|30|Number of threads in TaskCommunicator for serving requests from ContainerWorkers|
|mr3.am.rm.heartbeat.interval.ms|1000|Time interval in milliseconds of heartbeats in AMRMClientAsync|
|mr3.dag.priority.scheme|fifo|**fifo**: assign DAG priorities on FIFO basis.  **concurrent**: assign the same priority to all DAGs. Not set for individual DAGs.|
|mr3.vertex.priority.scheme|intact|Scheme for assigning priorities to Vertexes.  Available options: **intact**, **roots**, **leaves**, **postorder**, **normalize**. Not set for individual DAGs.|
|mr3.am.client.thread-count|32|Number of threads in DAGClientServer for serving requests from MR3Clients|
|mr3.heartbeat.task.timeout.ms|120000|Time in milliseconds for triggering heartbeat timeout for TaskAttempts (counted after being fetched by ContainerWorkers)|
|mr3.heartbeat.container.timeout.ms|600000|Time in milliseconds for triggering heartbeat timeout for ContainerWorkers. Should be (much) larger than the total time for sleeping due to `mr3.container.task.failure.num.sleeps`.|
|mr3.task.heartbeat.timeout.check.ms|30000|Time interval in milliseconds for checking heartbeat timeout for TaskAttempts|
|mr3.container.heartbeat.timeout.check.ms|15000|Time interval in milliseconds for checking heartbeat timeout for ContainerWorkers|
|mr3.dag.timeout.kill.check.ms|15000|Time interval in milliseconds for checking DAG timeout|
|mr3.container.idle.timeout.ms|300000|Time in milliseconds for triggering timeout for idle ContainerWorkers|
|mr3.am.node-blacklisting.enabled|false|**true**: enable node blacklisting.  **false**: disable node blacklisting. For more details, see [Node Blacklisting](../../features/mr3/blacklisting).|
|mr3.am.maxtaskfailure.percent|5|Percentage of TaskAttempt failures that triggers node blacklisting|
|mr3.am.max.safe.resource.percent.blacklisted|50|Max percentage of resource to be allocated to a node that is blacklisted|
|mr3.am.min.safe.resource.percent.blacklisted|10|Min percentage of resource to be allocated to a node that is blacklisted|
|mr3.dag.delete.local.dir|true|**true**: ask ContainerWorkers to delete DAG-local directories.  **false**: do not ask (as in Spark on MR3).|
|mr3.dag.recovery.enabled|true|**true**: enable DAG recovery when DAGAppMaster restarts.  **false**: disable DAG recovery when DAGAppMaster restarts.|
|mr3.am.max.finished.reported.dags|10|Max number of DAGs whose final states are kept in DAGAppMaster after being reported to MR3Client|
|mr3.am.generate.dag.graph.viz|false|**true**: create DOT graph files showing the structure of DAGs on the working directory of DAGAppMaster.  **false**: do not create DOT graph files.|

|**Name**|**Default value**|Description|
|--------|:----------------|:----------|
|mr3.am.local.resourcescheduler.min.memory.mb|256|Min size of memory in MB to reserve for all local ContainerWorkers running in DAGAppMaster|
|mr3.am.local.resourcescheduler.max.memory.mb|4096|Max size of memory in MB to reserve for all local ContainerWorkers running in DAGAppMaster|
|mr3.am.local.resourcescheduler.max.cpu.cores|16|Max number of cores for all local ContainerWorkers running in DAGAppMaster|
|mr3.am.local.resourcescheduler.native.fraction|0.0|Fraction of memory to be allocated for native memory for all local ContainerWorkers running in DAGAppMaster|
|mr3.am.resourcescheduler.max.requests.per.taskscheduler|10|Max number of containers that TaskScheduler can request to Yarn ResourceScheduler at once|

## ContainerGroup

|**Name**|**Default value**|Description|
|--------|:----------------|:----------|
|mr3.container.scheduler.scheme|none|**none**: do not recycle ContainerWorkers.  **fifo**: use FIFO scheduling for recycling ContainerWorkers.  **fair**: use fair scheduling for recycling ContainerWorkers.|
|mr3.container.scheduler.remove.empty.kind|false|**true**: remove ContainerKind with no ContainerGroups and reserve ContainerWorkers for recycling only if their ContainerKind has multiple ContainerGroups.  **false**: never remove ContainerKind and reserve all ContainerWorkers for recycling.|
|mr3.dag.queue.scheme|common|Scheme for mapping DAGs to queues of TaskAttempts in TaskScheduler.  Available options: **common**, **individual**, **capacity**. Can be set for individual ContainerGroups.|
|mr3.dag.queue.capacity.specs|default:0|Comma-separated list of specifications for capacity scheduling. Each entry consists of a queue name and the minimum capacity in percentage. Queues are specified in the order of priority. E.g., `high=50,medium=30,default=20,background=0`. Can be set for individual ContainerGroups.|
|mr3.taskattempt.queue.scheme|indexed|Scheme for managing the queue of TaskAttempts in TaskScheduler.  Available options: **basic**, **simple**, **opt**, **indexed**, **spark**. Can be set for individual ContainerGroups.  **basic**: TaskScheduler does not use the optimization based on producer-completeness. **simple**, **opt**, **indexed**: TaskScheduler applies the optimization based on producer-completeness.  **strict**: TaskScheduler behaves the same as `indexed`, except that it strictly respects location hints of Tasks.  **spark**: TaskScheduler uses a Spark-style scheme in which consumer Tasks are scheduled only after all their producer Tasks have completed.|
|mr3.vertex.high.task.priority.fraction|0.05|Fraction of Tasks within the same Vertex to be assigned higher priorities based on the size on input data|
|mr3.container.stop.cross.dag.reuse|true|**true**: stop cross-DAG container reuse for the current ContainerGroup.  **false**: do not update the current ContainerGroup with regard to cross-DAG container reuse. Can be set for individual ContainerGroups.|
|mr3.container.reuse|false|**true**: reuse ContainerWorkers in the current ContainerGroup.  **false**: use each ContainerWorker only for a single TaskAttempt. Can be set for individual ContainerGroups.|
|mr3.container.resourcescheduler.type|local|Type of ContainerWorkers. **local**: create local ContainerWorkers in DAGAppMaster for the current ContainerGroup.  **yarn**: create Yarn ContainerWorkers for the current ContainerGroup.  **kubernetes**: create Kubernetes ContainerWorkers for the current ContainerGroup.  **process**: use ContainerWorkers executed by users. Can be set for individual ContainerGroups.|
|mr3.container.combine.taskattempts|false|**true**: allow multiple TaskAttempts to run concurrently in a ContainerWorker.  **false**: allow only one TaskAttempt to run at a time in a ContainerWorker. Can be set for individual ContainerGroups.|
|mr3.container.mix.taskattempts|true|**true**: allow TaskAttempts from different DAGs to run concurrently in a ContainerWorker.  **false**: use each ContainerWorker for a single DAG exclusively. Can be set for individual ContainerGroups.|
|mr3.container.max.num.workers|Int.MaxValue|Max number of ContainerWorkers that can be created by a ContainerGroup. Can be set for individual ContainerGroups.|
|mr3.container.log.level|INFO|Logging level for ContainerWorkers|
|mr3.use.daemon.shufflehandler|0|Number of shuffle handlers in each ContainerWorker. On Kubernetes, a value of 0 causes the creation of processes for shuffle handlers.|
|mr3.daemon.shuffle.service-id||Service identifier for the shuffle handler|
|mr3.daemon.shuffle.port||Port number for the shuffle handler|
|mr3.daemon.task.message.buffer.size|16|Size of the message queue for each DaemonTask|

|**Name**|**Default value**|Description|
|--------|:----------------|:----------|
|mr3.container.launch.cmd-opts|-server -Djava.net.preferIPv4Stack=true -Dhadoop.metrics.log.level=WARN -XX:+UseNUMA -XX:+UseParallelGC|Command-line options for launching ContainerWorkers|
|mr3.container.launch.env|LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$HADOOP_HOME/lib/native/|Environment variables for launching ContainerWorkers. Each entry takes either "VAR=VALUE" separated by "=" or "VAR". In the latter case, the value in the system environment is used.|
|mr3.container.kill.policy|container.kill.wait.workervertex|**container.kill.wait.workervertex**: stop a ContainerWorker only if no more TaskAttempts are to arrive.  **container.kill.nowait**: stop a ContainerWorker right away if it is not serving any TaskAttempt.|

## DAG

|**Name**|**Default value**|Description|
|--------|:----------------|:----------|
|mr3.am.min.cluster.resource.memory.mb|102400|Min size of memory in MB that DAGAppMaster assumes as the cluster resource when initializing Map Tasks. Can be set for individual DAGs.|
|mr3.am.min.cluster.resource.cpu.cores|100|Min number of cores that DAGAppMaster assumes as the cluster resource when initializing Map Tasks. Can be set for individual DAGs.|
|mr3.am.task.max.failed.attempts|3|Max number of TaskAttempts to create for Task. Must be greater than zero. Can be set for individual DAGs. For more details, see [Fault Tolerance](../../features/mr3/fault-tolerance).|
|mr3.am.task.no.retry.errors||Comma-separated list of names of Exceptions and Errors that prevent the re-execution of Tasks. Can be set for individual DAGs. For more details, see [Fault Tolerance](../../features/mr3/fault-tolerance).|
|mr3.am.task.retry.on.fatal.error|false|**true**: retry even if TaskAttempts fail with fatal errors.  **false**: do not retry if TaskAttempts fail with fatal errors. Can be set for individual DAGs. For more details, see [Fault Tolerance](../../features/mr3/fault-tolerance).|
|mr3.am.notify.destination.vertex.complete|false|**true**: notify ContainerWorker of the completion of all destination Vertexes so that it can delete the directory for intermediate data of the source Vertex.  **false**: do not notify. Can be set for individual DAGs.|
|mr3.am.commit-all-outputs-on-dag-success|true|**true**: commit the output of all Vertexes when DAG completes successfully.  **false**: commit the output when Vertex completes successfully. Can be set for individual DAGs.|
|mr3.am.permit.custom.user.class|false|**true**: allow custom classes for VertexManager, InputInitializer, OutputCommitter.  **false**: do not allow custom classes. Can be set for individual DAGs.|
|mr3.am.task.concurrent.run.threshold.percent|100|Percentage of Tasks that complete before starting speculative execution. Can be set to an integer between 1 and 100. If set to 100, speculative execution of TaskAttempts is disabled. Can be set for individual DAGs. For more details, see [Speculative Execution](../../features/mr3/speculative).|
|mr3.am.task.concurrent.run.min.threshold.ms|10000|Minimum of the maximum execution time (in milliseconds) of Tasks that complete before starting speculative execution. For example, a value of 10000 means that if all Tasks complete within 10 seconds before starting speculative execution, we use 10 seconds as their maximum execution time. Can be set for individual DAGs.|
|mr3.am.task.concurrent.run.multiplier|2.0d|Multiplier of the maximum execution time of Tasks that complete before starting speculative execution. Can be set for individual DAGs.|
|mr3.am.task.concurrent.run.enable.root.vertex|false|**true**: Speculative execution is effective on root Vertexes with no ancestors.  **false**: Speculative execution is not effective on root Vertexes.|
|mr3.dag.queue.name|default|Name of the Task queue to which the current DAG belongs. Used with capacity scheduling. If an invalid name is given, the default value of `default` is used. Can be set for individual DAGs.|
|mr3.dag.vertex.schedule.by.stage|false|**true**: A Vertex creates Tasks only after all source Vertexes are completed.  **false**: A Vertex can creates Tasks while source Vertexes are running.|
|mr3.dag.route.event.after.source.vertex|false|**true**: A Vertex receives events only after all source Vertexes are completed.  **false**: A Vertex can receive events while source Vertexes are running.|
|mr3.dag.include.indeterminate.vertex|false|**true**: The DAG contains indeterminate Vertexes whose output can vary at each execution. Fault tolerance is not supported when fetch failures occur. **false**: The DAG contains no indeterminate Vertexes.|
|mr3.dag.create.daemon.vertex.always|false|**true**: create DaemonVertex in every DAG. **false**: do not create DaemonVertex except in the creator DAG (which creates ContainerGroups)|
|mr3.dag.timeout.kill.threshold.secs|0|Maximum execution time (in seconds) of DAGs. Set to 0 in order to disable timeout check. Can be set for individual DAGs.|

## ContainerWorker

|**name**|**default value**|description|
|--------|:----------------|:----------|
|mr3.container.get.command.interval.ms|2000|Time interval in milliseconds for retrieving commands in ContainerWorkers that are currently serving TaskAttempts|
|mr3.container.busy.wait.interval.ms|100|Time interval in milliseconds for retrieving commands in idle ContainerWorkers|
|mr3.task.am.heartbeat.interval.ms|250|Time interval in milliseconds for sending heartbeats from TaskAttempts|
|mr3.task.am.heartbeat.duration.interval.ms|15000|Time interval in milliseconds for sending heartbeats from TaskAttempts. It also determines the granularity of updating the duration of TaskAttempts in speculative execution. For more details, see [Speculative Execution](../../features/mr3/speculative).|
|mr3.task.am.heartbeat.counter.interval.ms|60000|Time interval in milliseconds for sending counters in heartbeats from TaskAttempts|
|mr3.task.max.events.per.heartbeat|500|Max number of task events to include in a heartbeat reply|
|mr3.container.thread.keep.alive.time.ms|4000|Time in milliseconds for keeping threads serving TaskAttempts in ContainerWorkers|
|mr3.container.command.num.waits.in.reserved|180|Number of times that reserved ContainerWorker attempts to contact DAGAppMaster at an interval of 1 second. Ensure `mr3.container.command.num.waits.in.reserved` * 1 second > `mr3.k8s.pod.creation.timeout.ms` on Kubernetes with autoscaling so that new requests for ContainerWorkers can be made while reserved ContainerWorkers are still alive.|
|mr3.container.command.num.waits.to.kill|6|Number of times that ContainerWorker attempts to contact DAGAppMaster at an interval of 1 second to re-establish the connection. A failed attempt takes about 10 seconds.|
|mr3.container.use.termination.checker|true|**true**: check whether TaskAttempts terminate successfully or not after termination requests. If a TaskAttempt fails to terminate, terminate the ContainerWorker.  **false**: do not check. Do not set to false in production environments.|
|mr3.container.terminate.on.fatal.error|false|**true**: always terminate ContainerWorkers that throw fatal errors such as `OutOfMemoryError`.  **false**: do not terminate ContainerWorkers that manage to recover from fatal errors.|
|mr3.container.termination.checker.timeout.ms|300000|Time in milliseconds before checking the termination of a TaskAttempt after a termination request. With the default value, the ContainerWorker checks whether a TaskAttempt has properly terminated within 300 seconds after the termination request. If the TaskAttempt has not terminated, the whole ContainerWorker is shut down. The user should not use too small a value (e.g., 30000 for 30 seconds) because closing HTTP connections to shuffle handlers can take long.|
|mr3.container.task.failure.num.sleeps|0|Number of times to sleep (15 seconds each by default) in a ContainerWorker thread after a TaskAttempt fails. Before and after each sleep, the thread tries to allocate a memory block of 1GB to trigger garbage collection. For example, if set to 2, the sequence is: allocate 1GB, sleep 15 seconds, allocate 1GB, sleep 15 seconds, allocate 1GB. If set to 0, do not sleep and do not try to allocate a memory block. For Hive on MR3, **do not set to a non-zero value when executing interactive queries with limit operators** because all active Tasks are killed when the number of records reaches the limit.|
|mr3.container.task.failure.sleep.period.secs|15|Time in seconds to sleep after a TaskAttempt fails|
|mr3.container.runtime.auto.start.input|false|**true**: automatically start LogicalInputs in RuntimeTasks.  **false**: do not automatically start LogicalInputs. Setting it to true can have negative effects on the performance because a ContainerWorker may fetch the same input data multiple times via broadcast edges.|
|mr3.container.close.filesystem.ugi|true|**true**: call FileSystem.closeAllForUGI() after finishing each DAG in ContainerWorkers.  **false**: do not call (for Spark on MR3).|
|mr3.container.use.framework.counters|false|**true**: collect framework counters (on garbage collection and process statistics) in ContainerWorkers.  **false**: do not collect framework counters.|
|mr3.container.localize.python.working.dir.unsafe|false|**true**: localize Python resources (`*.py` or `*.PY`) in the working directory of ContainerWorkers.  **false**: do not localize Python resources in the working directory.| 
|mr3.container.use.am.credentials.for.daemon|true|**true**: use the credentials of DAGAppMaster for all DaemonTaskAttempts. **false**: use the credentials of the DAG for all its DaemonTaskAttempts.|

|**name**|**default value**|description|
|--------|:----------------|:----------|
|mr3.container.elastic.execution.memory.commit.ratio|1.0|Multiplier for memory to be allocated to each TaskAttempt. For example, a value of 1.5 means that a TaskAttempt created with memory resource of 4GB is actually allocated 6GB of memory in a ContainerWorker.|

## Memory usage and autoscaling

|**Name**|**Default value**|Description|
|--------|:----------------|:----------|
|mr3.memory.usage.check.scheme|average|**average**: calculate the average memory usage of the current window.  **maximum**: calculate the maximum memory usage of the current window.|
|mr3.memory.usage.check.window.length.secs|600|Window length in seconds for calculating memory usage|
|mr3.check.memory.usage.event.interval.secs|10|Time interval in seconds for 1) generating events for calculating memory usage for autoscaling and 2) updating the number of ContainerWorkers belonging to each ContainerGroup under fair scheduling when [recycling ContainerWorkers](../../features/mr3/recycle-worker)|
|mr3.enable.auto.scaling|false|**true**: enable autoscaling.  **false**: disable autoscaling.|
|mr3.auto.scale.out.threshold.percent|80|Minimum percentage of memory usage to trigger scale-out|
|mr3.auto.scale.in.threshold.percent|50|Maximum percentage of memory usage to trigger scale-in|
|mr3.auto.scale.in.min.hosts|1|Minimum number of nodes that should remain when performing scale-in|
|mr3.auto.scale.out.grace.period.secs|300|Cooldown period in seconds after triggering scale-out|
|mr3.auto.scale.in.delay.after.scale.out.secs|60|Minimum time in seconds to wait after leaving scale-out before triggering scale-in|
|mr3.auto.scale.in.grace.period.secs|300|Cooldown period in seconds after triggering scale-in|
|mr3.auto.scale.in.wait.dag.finished|true|**true**: wait until all running DAGs complete before terminating containers in the event of scale-in.  **false**: do not wait and terminate containers immediately. |
|mr3.auto.scale.out.num.initial.containers|0|If greater than zero: number of containers to add in the case of scale-out when no containers are running.  If zero or less: not used.|
|mr3.auto.scale.out.num.increment.containers|0|If greater than zero: number of containers to add in the case of scale-out.  If zero or less: use `mr3.auto.scale.out.threshold.percent` to calculate the number of containers to add.|
|mr3.auto.scale.in.num.decrement.hosts|0|If greater than zero: number of hosts to remove in the case of scale-in.  If zero or less: use `mr3.auto.scale.in.threshold.percent` to calculate the number of hosts to remove.|

## Prometheus

|**Name**|**Default value**|Description|
|--------|:----------------|:----------|
|mr3.prometheus.enable.metrics|false|**true**: DAGAppMaster runs a Prometheus client to export metrics.  **false**: DAGAppMaster does not run a Prometheus client.|
|mr3.prometheus.enable.jvm.metrics|false|**true**: export Java VM metrics from DAGAppMaster (using `io.prometheus.client.hotspot.DefaultExports`). **false**: do not export Java VM metrics.|
|mr3.prometheus.httpserver.port|9890|Port number for the Prometheus client|
|mr3.prometheus.worker.enable.metrics|false|**true**: Every ContainerWorker runs a Prometheus client to export metrics.  **false**: ContainerWorkers do not run Prometheus clients.|
|mr3.prometheus.worker.enable.jvm.metrics|false|**true**: export Java VM metrics from ContainerWorkers (using `io.prometheus.client.hotspot.DefaultExports`). **false**: do not export Java VM metrics from ContainerWorkers.|
|mr3.prometheus.worker.httpserver.port|0|Port number for the Prometheus clients for ContainerWorkers. Use 0 if multiple ContainerWorkers run on the same node.|

## TokenRenewer

|**Name**|**Default value**|Description|
|--------|:----------------|:----------|
|mr3.principal||Kerberos principal|
|mr3.keytab||Location of the Kerberos keytab file|
|mr3.token.renewal.fraction|0.75|Fraction of the token renewal interval for renewing tokens conservatively|
|mr3.token.renewal.retry.interval.ms|3600000|Time interval in milliseconds for retrying token renewal|
|mr3.token.renewal.num.credentials.files|5|Max number of credential files to keep for token renewal|
|mr3.token.renewal.hdfs.enabled|false|**true**: automatically renew HDFS tokens.  **false**: do not renew HDFS tokens.|
|mr3.token.renewal.hive.enabled|false|**true**: automatically renew Hive tokens.  **false**: do not renew Hive tokens.|
|mr3.am.token.renewal.paths||Path that specifies FileSystem for token renewal. If empty, DAGAppMaster uses the staging directory.|
|mr3.token.renewal.pass.credentials.via.memory|true|**true**: DAGAppMaster passes credentials to ContainerWorkers directly via messages. **false**: DAGAppMaster stores credentials on HDFS.|

## HistoryLogger

|**Name**|**Default value**|Description|
|--------|:----------------|:----------|
|mr3.app.history.logging.enabled|false|**true**: enable history logging for Yarn applications and ContainerWorkers.  **false**: disable history logging for Yarn applications and ContainerWorkers.|
|mr3.dag.history.logging.enabled|false|**true**: enable history logging for DAGs.  **false**: disable history logging for DAGs.|
|mr3.task.history.logging.enabled|false|**true**: enable history logging for Tasks.  **false**: disable history logging for Tasks.|

## Tez counters

|**Name**|**Default value**|Description|
|--------|:----------------|:----------|
|tez.counters.max|1200|Max number of Tez counters|
|tez.counters.max.groups|500|Max number of Tez counters groups|
|tez.counters.counter-name.max-length|64|Max length of Tez counter names|
|tez.counters.group-name.max-length|256|Max length of Tez counters group names|

## Kubernetes

|**Name**|**Default value**|Description|
|--------|:----------------|:----------|
|mr3.k8s.api.server.url|https://kubernetes.default.svc|URL for the Kubernetes API server|
|mr3.k8s.client.config.file||Configuration file for creating a Kubernetes client (e.g., `~/.kube/config`)|
|mr3.k8s.service.account.use.token.ca.cert.path|true|**true**: use `mr3.k8s.service.account.token.path` and `mr3.k8s.service.account.token.ca.cert.path`.  **false**: do not use.|
|mr3.k8s.service.account.token.path|/var/run/secrets/kubernetes.io/serviceaccount/token|Token path for ServiceAccount for the Kubernetes client. Used only when `mr3.k8s.service.account.use.token.ca.cert.path` is set to true.|
|mr3.k8s.service.account.token.ca.cert.path|/var/run/secrets/kubernetes.io/serviceaccount/ca.crt|Certificate path for ServiceAccount for the Kubernetes client. Used only when `mr3.k8s.service.account.use.token.ca.cert.path` is set to true.|

|**Name**|**Default value**|Description|
|--------|:----------------|:----------|
|mr3.k8s.namespace|mr3|Kubernetes namespace to use when creating a Kubernetes client|
|mr3.k8s.am.service.host||Host associated with the Service for DAGAppMaster Pod. Set only when MR3Client runs outside the Kubernetes cluster and the user creates a Service manually. If not set, MR3 obtains the host from the Service created by MR3Client, e.g., `service-master-4110-0.hivemr3.svc.cluster.local`.|
|mr3.k8s.am.service.port|80|Port associated with the Service for DAGAppMaster Pod|
|mr3.k8s.nodes.polling.interval.ms|60000|Time interval in milliseconds for querying states of Kubernetes Nodes|
|mr3.k8s.pods.polling.interval.ms|15000|Time interval in milliseconds for querying Pod states|
|mr3.k8s.pod.creation.timeout.ms|30000|Time in milliseconds to wait until a new Pod is created|
|mr3.k8s.pod.image.pull.policy|IfNotPresent|Image pull policy for Pods|
|mr3.k8s.pod.image.pull.secrets||Image pull secrets for Pods|
|mr3.k8s.pod.master.serviceaccount||ServiceAccount for DAGAppMaster Pod|
|mr3.k8s.pod.worker.serviceaccount||ServiceAccount for ContainerWorker Pods|
|mr3.k8s.pod.master.image||Docker image for DAGAppMaster containers|
|mr3.k8s.pod.master.user||User for DAGAppMaster Pod|
|mr3.k8s.pod.master.emptydirs||Comma-separated list of directories where emptyDir volumes are mounted for DAGAppMaster|
|mr3.k8s.pod.master.hostpaths||Comma-separated list of directories (on each node) to which hostPath volumes point for DAGAppMaster.  For example, `/data1/k8s,/data2/k8s,/data3/k8s` mounts three hostPath volumes created from three local directories of the node where DAGAppMaster Pod is to run.|
|mr3.k8s.pod.master.node.selector||Comma-separated list of node selectors for DAGAppMaster Pod (e.g., `masternode=true,hivemr3=true`)|
|mr3.k8s.pod.master.toleration.specs||Comma-separated list of toleration specifications for DAGAppMaster Pod. The format of each entry is `[key]:[operator]:[value]:[effect]:[toleration in seconds]` where `[value]` and `:[toleration in seconds]` are optional.|
|mr3.k8s.master.working.dir||Working directory for DAGAppMaster container|
|mr3.k8s.master.command|/usr/bin/java|Command for launching Java VM for DAGAppMaster container|
|mr3.k8s.master.pod.affinity.match.label||Label for specifying Pod affinity for DAGAppMaster Pod (e.g., `hivemr3_app=hiveserver2`). Internally MR3 uses preferredDuringSchedulingIgnoredDuringExecution with a weight of 100.|
|mr3.k8s.master.pod.additional.labels||Comma-separated list of additional labels for DAGAppMaster Pod (e.g., `foo=bar,hivemr3_aux=prometheus`)|
|mr3.k8s.master.pod.cpu.limit.multiplier|1.0|Multiplier for the CPU resource limit for DAGAppMaster Pod|
|mr3.k8s.pod.worker.image||Docker image for ContainerWorker containers|
|mr3.k8s.pod.worker.user||User for ContainerWorker Pods|
|mr3.k8s.pod.worker.emptydirs||Comma-separated list of directories where emptyDir volumes are mounted for ContainerWorkers. These volumes become local directories where intermediate data is written.|
|mr3.k8s.pod.worker.hostpaths||Comma-separated list of directories (on each node) to which hostPath volumes point for ContainerWorkers.  For example, `/data1/k8s,/data2/k8s,/data3/k8s` mounts three hostPath volumes created from three local directories of the node where ContainerWorker Pods are to run. These volumes become local directories where intermediate data is written.|
|mr3.k8s.pod.worker.additional.hostpaths||Comma-separated list of additional directories (on each node) to which hostPath volumes point for ContainerWorkers|
|mr3.k8s.pod.worker.node.selector||Comma-separated list of node selectors for ContainerWorker Pods (e.g., `workernode=true,hivemr3=true`)|
|mr3.k8s.pod.worker.toleration.specs||Comma-separated list of toleration specifications for ContainerWorker Pods. The format of each entry is `[key]:[operator]:[value]:[effect]:[toleration in seconds]` where `[value]` and `:[toleration in seconds]` are optional.|
|mr3.k8s.pod.worker.node.affinity.specs||Comma-separated list of node affinity specifications for ContainerWorker Pods. The format of each entry is `[key]:[operator]:[value#1]:...:[value#N]` (e.g., `key1:In:value1:value2:value3`). Internally MR3 uses requiredDuringSchedulingIgnoredDuringExecution.|
|mr3.k8s.worker.working.dir||Working directory for ContainerWorker containers|
|mr3.k8s.java.io.tmpdir|/tmp|Temporary directory for Java in ContainerWorker containers|
|mr3.k8s.worker.command|/usr/bin/java|Command for launching Java VM for ContainerWorker containers|
|mr3.k8s.worker.total.max.memory.gb|1048576|Max memory in GB for all ContainerWorker Pods|
|mr3.k8s.worker.total.max.cpu.cores|1048576|Max number of cores for all ContainerWorker Pods|
|mr3.k8s.pod.cpu.cores.max.multiplier|1.0|Multiplier for the limit of CPU cores for each ContainerWorker Pod.  For example, a value of 2.0 means that the CPU limit of a ContainerWorker Pod is twice its CPU request.|
|mr3.k8s.pod.memory.max.multiplier|1.0|Multiplier for the limit of memory for each ContainerWorker Pod.  For example, a value of 2.0 means that the memory limit of a ContainerWorker Pod is twice its memory request. We do not recommend a value of larger than 1.0 unless every node has more memory than needed (because ContainerWorker Pods may be killed).|
|mr3.k8s.conf.dir.configmap||Name of the ConfigMap carrying all configuration files (such as `mr3-site.xml`)|
|mr3.k8s.conf.dir.mount.dir||Mount path for the ConfigMap carrying all configuration files|
|mr3.k8s.keytab.secret||Name of the Secret (containing the Keytab file) to be used by DAGAppMaster|
|mr3.k8s.worker.secret||Name of the Secret to be used by ContainerWorkers|
|mr3.k8s.keytab.mount.dir||Mount path for the Secret in DAGAppMaster (containing the keytab file) and in ContainerWorkers|
|mr3.k8s.keytab.mount.file||File name for the Secret containing the keytab file.  `mr3.k8s.keytab.mount.dir` and `mr3.k8s.keytab.mount.file` specify the full path for the keytab file mounted inside ContainerWorker Pods.|
|mr3.k8s.mount.keytab.secret|false|**true**: mount `mr3.k8s.keytab.secret` to `mr3.k8s.keytab.mount.dir`. **false**: do not mount. Set to true when: 1) `mr3.token.renewal.hdfs.enabled` is set to true; 2) `mr3.token.renewal.hive.enabled` is set to true; 3) secure shuffle is used (`tez.runtime.shuffle.ssl.enable` is set to true in `tez-site.xml`) so as to pass keystore and truststore files.|
|mr3.k8s.mount.worker.secret|false|**true**: mount `mr3.k8s.worker.secret` to `mr3.k8s.keytab.mount.dir`. **false**: do not mount. Set to true when secure shuffle is used (`tez.runtime.shuffle.ssl.enable` is set to true in `tez-site.xml`) so as to pass keystore and truststore files.|
|mr3.k8s.host.aliases||Comma-separated list of pairs of a hostname and an IP address.  For example, `foo=1.1.1.1,bar=2.2.2.2` registers host `foo` as IP address 1.1.1.1 in DAGAppMaster and ContainerWorker Pods, and so on.|
|mr3.k8s.shuffle.process.ports||Comma-separated list of port numbers for shuffle handlers.  For example, `15500,15510,15520,15530,15540` creates 5 shuffle handlers with port number 15500 to 15540.|
|mr3.k8s.shufflehandler.process.memory.mb|1024|Size of memory in MB for the container for shuffle handlers|
|mr3.k8s.readiness.probe.initial.delay.secs|10|Time in seconds before performing the first readiness probe|
|mr3.k8s.readiness.probe.period.secs|20|Time interval in seconds for performing the readiness probe|
|mr3.k8s.liveness.probe.initial.delay.secs|20|Time in seconds before performing the first liveness probe|
|mr3.k8s.liveness.probe.period.secs|40|Time interval in seconds for performing the liveness probe|

|**Name**|**Default value**|Description|
|--------|:----------------|:----------|
|mr3.k8s.master.persistentvolumeclaim.mounts||Comma-separated list of pairs of a PersistentVolumeClaim and its mount point for DAGAppMaster Pod|
|mr3.k8s.worker.persistentvolumeclaim.mounts||Comma-separated list of pairs of a PersistentVolumeClaim and its mount point.  For example, `foo1=bar1,foo2=bar2,foo3=bar3` mounts PersistentVolumeClaim `foo1` on directory `bar1` in ContainerWorker Pods, and so on.|
|mr3.k8s.pod.worker.security.context.sysctls||Comma-separated list of sysctl properties to be set by an init container in a ContainerWorker Pod. Example: `net.core.somaxconn=16384,net.ipv4.ip_local_port_range='1024 65535'`.|
|mr3.k8s.pod.worker.init.container.command||Shell command to be executed by an init container in a ContainerWorker Pod. Before executing the shell command, the init container mounts hostPath volumes specified by `mr3.k8s.pod.worker.hostpaths`. Example: `chown 1000:1000 /data1/k8s/; ls -alt /data1/k8s`.|
|mr3.k8s.pod.worker.init.container.image||Docker image for init containers when `mr3.k8s.pod.worker.security.context.sysctls` is set. `busybox` works okay.|

## Spark on MR3

|**Name**|**Default value**|Description|
|--------|:----------------|:----------|
|mr3.spark.delay.scheduling.interval.ms|1000|Time interval in milliseconds of checking delay scheduling|
|mr3.dag.queue.scheme|common|Scheme for mapping DAGs to queues of TaskAttempts in TaskScheduler.  Available options: **common** (corresponding to Spark FIFO scheme), **individual** (corresponding to Spark FAIR scheme). Can be set for individual Spark applications.|
|mr3.dag.priority.scheme|fifo|**fifo**: use Spark job priorities for DAG priorities.  **concurrent**: assign the same priority to all DAGs. Not set for individual DAGs.|
|mr3.taskattempt.queue.scheme|opt|Scheme for managing the queue of TaskAttempts in TaskScheduler.  Available option: **opt** (implementing delay scheduling).|
|mr3.vertex.priority.scheme|normalize|**intact**: use Spark stage IDs for Vertex priorities. **normalize**: set Vertex priorities to 0. Not set for individual DAGs.|

