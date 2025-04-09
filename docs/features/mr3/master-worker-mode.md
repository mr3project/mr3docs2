--- 
title: DAGAppMaster and ContainerWorker Modes 
sidebar_position: 20
---

A DAGAppMaster runs in one of the following four modes:

* **LocalThread** mode: A DAGAppMaster starts as a new thread inside the MR3Client.
* **LocalProcess** mode: A DAGAppMaster starts as a new process on the same machine where the MR3Client is running.
* **Yarn** mode: A DAGAppMaster starts as a new container in the Hadoop cluster.
* **Kubernetes** mode: A DAGAppMaster starts as a Pod in a Kubernetes cluster.

A ContainerWorker runs in one of the following four modes:

* **Local** mode: A ContainerWorker starts as a thread inside the DAGAppMaster. 
* **Yarn** mode: A ContainerWorker starts as a container in a Hadoop cluster.
* **Kubernetes** mode: A ContainerWorker starts as a Pod in a Kubernetes cluster.
* **Process** mode: A ContainerWorker starts as an ordinary process. 

## Combinations of DAGAppMaster and ContainerWorker modes

MR3 support many combinations of DAGAppMaster and ContainerWorker modes.
For example, LocalProcess mode allows us to run the DAGAppMaster on a dedicated machine outside the Hadoop cluster (as an unmanaged ApplicationMaster),
which is particularly useful when running many concurrent DAGs in the same DAGAppMaster.
As another example, a DAGAppMaster in Yarn mode can run its ContainerWorkers in Local mode, similarly to the Uber mode of Hadoop.
Moreover a DAGAppMaster can mix ContainerWorkers with different modes. 
For example, long-running ContainerWorkers can run in Yarn mode while short-lived ContainerWorkers can run in Local mode. 

The following list shows all the combinations permitted by MR3.
For LocalProcess mode in the Kubernetes cluster, DAGAppMaster should run inside the Kubernetes cluster.

|Cluster|DAGAppMaster|ContainerWorker|
|---|:--------|:----------------|
|Hadoop/Kubernetes/Standalone|LocalThread|Local|
  ||LocalProcess|Local|
|Hadoop|LocalThread|Yarn|
  ||LocalProcess|Yarn|
  ||Yarn|Local|
  ||Yarn|Yarn|
|Kubernetes|LocalThread|Kubernetes|
  ||LocalProcess (only inside the cluster)|Kubernetes|
  ||Kubernetes|Local|
  ||Kubernetes|Kubernetes|
|Standalone|LocalThread|Process|
  ||LocalProcess|Process|

## On Hadoop

Here are schematic descriptions of six combinations in the Hadoop cluster:  

1. DAGAppMaster in LocalThread mode, ContainerWorker in Local mode 
![masterworkermode1](/mr3/masterworkermode1-fs8.png)

2. DAGAppMaster in LocalProcess mode, ContainerWorker in Local mode 
![masterworkermode2](/mr3/masterworkermode2-fs8.png)

3. DAGAppMaster in Yarn mode, ContainerWorker in Local mode 
![masterworkermode3](/mr3/masterworkermode3-fs8.png)

4. DAGAppMaster in LocalThread mode, ContainerWorker in Yarn mode 
![masterworkermode4](/mr3/masterworkermode4-fs8.png)

5. DAGAppMaster in LocalProcess mode, ContainerWorker in Yarn mode 
![masterworkermode5](/mr3/masterworkermode5-fs8.png)

6. DAGAppMaster in Yarn mode, ContainerWorker in Yarn mode 
![masterworkermode6](/mr3/masterworkermode6-fs8.png)

## On Kubernetes

Here are schematic descriptions of the six combinations on Kubernetes
where we assume Hive on MR3.
In the current implementation, HiveServer2 always starts in a Pod.

1. DAGAppMaster in LocalThread mode, ContainerWorker in Local mode
![masterworkermode1](/k8s/masterworkermode1-fs8.png)
&nbsp;

2. DAGAppMaster in LocalThread mode, ContainerWorker in Kubernetes mode
![masterworkermode2](/k8s/masterworkermode2-fs8.png)
&nbsp;

3. DAGAppMaster in LocalProcess mode, ContainerWorker in Local mode
![masterworkermode3](/k8s/masterworkermode3-fs8.png)
&nbsp;

4. DAGAppMaster in LocalProcess mode, ContainerWorker in Kubernetes mode
![masterworkermode4](/k8s/masterworkermode4-fs8.png)

5. DAGAppMaster in Kubernetes mode, ContainerWorker in Local mode
![masterworkermode5](/k8s/masterworkermode5-fs8.png)

6. DAGAppMaster in Kubernetes mode, ContainerWorker in Kubernetes mode
![masterworkermode6](/k8s/masterworkermode6-fs8.png)

## Specifying DAGAppMaster/ContainerWorker mode

A DAGAppMaster mode can be specified with configuration key `mr3.master.mode` in `mr3-site.xml`: 

* **LocalThread** mode: `mr3.master.mode=local-thread`
* **LocalProcess** mode: `mr3.master.mode=local-process`
* **Yarn** mode: `mr3.master.mode=yarn`
* **Kubernetes** mode: `mr3.master.mode=kubernetes`

A ContainerWorker mode can be specified with configuration key `mr3.am.worker.mode` in `mr3-site.xml`:

* **Local** mode: `mr3.am.worker.mode=local`. In this case, all ContainerWorkers run in Local mode.
* **Yarn** mode: `mr3.am.worker.mode=yarn`. In this case, a ContainerWorker can run in either Local or Yarn mode (which is determined by its ContainerGroup). 
* **Kubernetes** mode: `mr3.am.worker.mode=kubernetes`. In this case, a ContainerWorker can run in either Local or Kubernetes mode (which is determined by its ContainerGroup). 
* **Process** mode: `mr3.am.worker.mode=process`. In this case, a ContainerWorker can run in either Local or Process mode (which is determined by its ContainerGroup). 
    
## No LocalThread/LocalProcess mode in a secure Hadoop cluster

A noteworthy limitation is that a DAGAppMaster in LocalThread or LocalProcess mode cannot start in a Kerberos-enabled secure Hadoop cluster. 
This is not so much a limitation of MR3 as a missing feature in Yarn ([YARN-2892](https://issues.apache.org/jira/browse/YARN-2892)),
which is necessary for an unmanaged ApplicationMaster to retrieve an AMRMToken.
Hence the user should not start a DAGAppMaster in LocalThread or LocalProcess mode in a secure Hadoop cluster. 
(In Hive on MR3, do not use the `--amprocess` option in a secure cluster.)
If a DAGAppMaster should start in LocalThread or LocalProcess mode in a secure Hadoop cluster, ContainerWorkers should run only in Local mode.

