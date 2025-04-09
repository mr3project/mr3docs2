---
title: "MR3Client Inside/Outside Kubernetes"
sidebar_position: 25
---

For running MR3 on Kubernetes,
the user can execute MR3Client (included in HiveServer2 and Spark drivers) either inside Kubernetes or outside Kubernetes.

## MR3Client inside Kubernetes

The default settings of MR3 are ready for executing MR3Client from a Pod inside Kubernetes.

* `mr3.k8s.api.server.url` is set to `https://kubernetes.default.svc` which is accessible inside Kubernetes.
* `mr3.k8s.client.config.file` is not set, so MR3Client does not read a configuration file for ServiceAccount.
* `mr3.k8s.service.account.use.token.ca.cert.path` is set to true,
  so MR3Client reads two files for ServiceAccount which are automatically mounted by Kubernetes: 
  `/var/run/secrets/kubernetes.io/serviceaccount/token` and 
  `/var/run/secrets/kubernetes.io/serviceaccount/ca.crt`.

The user can run DAGAppMaster in one of the LocalThread, LocalProcess, and Kubernetes modes.
This is the preferred way to run Hive on MR3 on Kubernetes because HiveServer2 automatically restarts whenever necessary. 

1. MR3Client inside Kubernetes, DAGAppMaster in LocalThread mode (`mr3.master.mode=local-thread`)
![k8s-client-inside-localthread](/mr3/k8s-client-inside-localthread-fs8.png)

2. MR3Client inside Kubernetes, DAGAppMaster in LocalProcess mode (`mr3.master.mode=local-process`)
![k8s-client-inside-localprocess](/mr3/k8s-client-inside-localprocess-fs8.png)

3. MR3Client inside Kubernetes, DAGAppMaster in Kubernetes mode (`mr3.master.mode=kubernetes`)
![k8s-client-inside-k8s](/mr3/k8s-client-inside-k8s-fs8.png)

## MR3Client outside Kubernetes

In order to execute MR3Client outside Kubernetes, the user should set the following configuration keys in `mr3-site.xml`
which MR3Client uses when creating a Kubernetes client.

* `mr3.k8s.api.server.url` should be set to the address of Kubernetes API server.
* `mr3.k8s.client.config.file` should be point to a configuration file for ServiceAccount (e.g., `~/.kube/config`).
* `mr3.k8s.service.account.use.token.ca.cert.path` should be set to false (unless the user manually prepares two files for ServiceAccount).

Then the user can run DAGAppMaster in LocalThread mode after setting configurations for DAGAppMaster
(such as `mr3.am.staging-dir` pointing to a local directory).

4. MR3Client outside Kubernetes, DAGAppMaster in LocalThread mode (`mr3.master.mode=local-thread`)
![k8s-client-outside-localthread](/mr3/k8s-client-outside-localthread-fs8.png)

For running DAGAppMaster in Kubernetes mode,
the user should take two additional actions.
First the user should  create a Service so that DAGAppMaster can be reached from the outside of Kubernetes.
Next the user should set the configuration keys `mr3.k8s.am.service.host` and `mr3.k8s.am.service.port` to the address of the Service.
Note that DAGAppMaster running in a Pod inside the Kubernetes cluster creates its own Kubernetes client (in order to create ContainerWorker Pods),
but it uses the default settings of MR3, not the settings overridden in `mr3-site.xml`.
Now the user can run DAGAppMaster in Kubernetes mode.

5. MR3Client outside Kubernetes, DAGAppMaster in Kubernetes mode (`mr3.master.mode=kubernetes`)
![k8s-client-outside-k8s](/mr3/k8s-client-outside-k8s-fs8.png)

Currently running DAGAppMaster in LocalProcess mode is not supported.
