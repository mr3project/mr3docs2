--- 
title: MR3Client 
sidebar_position: 10
---

There are two kinds of MR3Client: JobClient and SessionClient. 

## JobClient 

A JobClient (of class `mr3.client.MR3JobClient`) is designed to launch a new DAGAppMaster for each DAG submitted by the user.
Typically the user creates a JobClient to submits a DAG, and later Yarn/Kubernetes creates a new Application to execute the DAG.
However, the user can share the same JobClient in order to to submit multiple DAGs. 
In the diagram below, 
the JobClient does not create its DAGAppMaster in the beginning (in the method `start()`) because there is no DAG to execute,
and creates a new DAGAppMaster only when a DAG is submitted (in the method `submitDag()`).

### After calling MR3JobClient.start():
![client1](/mr3/client1-fs8.png)

### After calling MR3JobClient.submitDag():
![client2](/mr3/client2-fs8.png)

A DAGAppMaster created by a JobClient runs in **non-session mode** and is responsible for executing a single DAG.
Thus there are as many DAGClients as there are DAGAppMasters.
A JobClient can be terminated safely at any time because Yarn/Kubernetes automatically schedules new Applications when the cluster resource becomes available.
A JobClient is created if `mr3.am.session.mode` is set to false in `mr3-site.xml`.

## SessionClient 

A SessionClient is designed to execute multiple DAGs inside the same DAGAppMaster.
From the beginning, it creates its own DAGAppMaster, which is shared by all DAGs to be submitted subsequently.
In the diagram below,
the SessionClient establishes a connection to its DAGAppMaster by instantiating a DAGClientRPC object (in the method `start()`),
and when a new DAG is submitted, it just creates a new DAGClient (in the method `submitDag()`).

### After calling MR3SessionClient.start():
![client3](/mr3/client3-fs8.png)

### After calling MR3SessionClient.submitDag():
![client4](/mr3/client4-fs8.png)

A DAGAppMaster created by a SessionClient runs in **session mode** and orchestrates the concurrent execution of multiple DAGs.
A SessionClient should not be terminated in the middle of executing DAGs because all DAGClients would be lost together. 
A SessionClient is created if `mr3.am.session.mode` is set to true in `mr3-site.xml`.
