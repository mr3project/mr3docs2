MR3
===

MR3 is a new execution engine for Hadoop and Kubernetes. Similar in spirit to
MapReduce and Tez, it is a new execution engine with simpler design, better
performance, and more features. MR3 serves as a framework for running jobs on
Hadoop and Kubernetes. MR3 also supports standalone mode which does not require
a resource manager such as Hadoop or Kubernetes.

The main application of MR3 is Hive on MR3. With MR3 as the execution engine,
the user can run Apache Hive not only on Hadoop but also directly on Kubernetes.
By exploiting standalone mode supported by MR3, the user can run Apache Hive
virtually in any type of cluster regardless of the availability of Hadoop or
Kubernetes and the version of Java installed in the system.

MR3 is implemented in Scala.

For the full documentation on MR3 (including Quick Start Guide), please visit:

  https://mr3docs.datamonad.com/

* [MR3 Slack](https://join.slack.com/t/mr3-help/shared_invite/zt-1wpqztk35-AN8JRDznTkvxFIjtvhmiNg)
* [MR3 Google Group](https://groups.google.com/g/hive-mr3)  

MR3docs
=======

This is the git repository for the MR3 documentation.
Please visit [MR3docs](https://mr3docs.datamonad.com/) to see the website.
This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

