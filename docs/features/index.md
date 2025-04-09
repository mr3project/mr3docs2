---
title: "Features"
sidebar_position: 1
---

MR3 is an execution engine for Hadoop and Kubernetes.
Similar in spirit to Apache MapReduce and Apache Tez,
it is designed as a distributed execution engine,
but with a simpler architecture, better performance, and more advanced features. 
MR3 is implemented in Scala. 

The primary application of MR3 is **Hive on MR3**,
which refers to Apache Hive running on top of MR3.
In take advantage of the new features of MR3,
Hive on MR3 is built on a modified backend of Hive.
Hive on MR3 uses a modified Tez runtime to perform I/O operations
and 
relies on MR3 for other tasks such as scheduling DAGs, creating worker processes, messaging, and so on.

Currently we actively maintain Hive 4 on MR3.
Hive 3.1.3 on MR3 is still available,
but Hive 1.2 and Hive 2.3 on MR3 are not supported since MR3 1.1.
Other applications of MR3 include Spark on MR3 and MapReduce on MR3.

* [MR3 Features](./mr3) highlight the key capabilities of MR3 as an execution engine.
* [Hive-on-MR3 Features](./hivemr3) describe the unique enhancements of Hive on MR3
compared to Apache Hive.

