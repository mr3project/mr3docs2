--- 
title: Eliminating Fetch Delays
sidebar_position: 130
---

## Fetch delays

Fetch delays are a phenomenon in which shuffling intermediate data between ContainerWorkers gets stuck for a long time (but eventually completes)
after TCP listen queues fail to process bursty connection requests.
They can occur in any application program that opens TCP listen queues for data transmission,
such Hadoop DataNode daemons, Hadoop shuffle servers, and MR3 shuffle handlers.
In the context of MR3, fetch delays give rise to stragglers which usually delay the completion of DAGs in the order of hundreds of seconds
and sometimes thousands of seconds.

The following example shows fetch delays and resultant stragglers
when running query 4 of the TPC-DS benchmark with a scale factor of 1TB in a cluster of 42 nodes (each with 96GB of memory).
In a normal case, the query completes in much less than 100 seconds,
but even at 124 seconds, four Tasks of Map 7 are still running:
![fetch1](/mr3/fetch1-fs8.png)
These four Tasks make no progress for the next 1400 seconds and stall the progress of the whole query:
![fetch2](/mr3/fetch2-fs8.png)
Until these stragglers resume,
every node in the cluster stays idle because data transmission from Map 13 and Map 14 is the bottleneck.
(Map 7 reads not only from HDFS but also intermediate data produced by Map 13 and Map 14.)
Eventually the query completes at 1577 seconds, but after causing the entire cluster to come to a halt for more than 1400 seconds.

Ironically fetch delays occur more frequently 1) on small datasets than large datasets and 2) in large clusters than small clusters for the size of the dataset.
Intuitively a large cluster can accommodate more Tasks and a small dataset allows Tasks to complete faster.
As a result,
many Tasks can simultaneously generate bursty connection requests to a common source of data, thus increasing the chance of fetch delays.
In our experiment, for example, query 4 suffers from fetch delays very often on the dataset of 1TB, but never on the dataset of 10TB.
The structure of the DAG (e.g., the result of compiling a query in Hive on MR3) also affects the chance of fetch delays.
In our experiment, for example, only query 4 in the TPC-DS benchmark produces fetch delays. 

## Eliminating fetch delays in MR3

We combine two features of MR3 to solve the problem of fetch delays.

* We run multiple shuffle handlers in a ContainerWorker in order to reduce the chance of fetch delays
(see [MR3 Shuffle Handler](./shufflehandler)).
We may think of using multiple shuffle handlers as implementing a simple form of load balancing. 
Note that running multiple shuffle handlers is different from running multiple worker threads in a single shuffle handler
by adjusting the configuration parameter `tez.shuffle.max.threads` in `tez-site.xml`.
* In order to mitigate the effect of stragglers when fetch delays occur, we use speculative execution
(see [Speculative Execution](./speculative)).
That is, when MR3 detects a straggler, it creates another TaskAttempt with the hope that the new TaskAttempt will not suffer from fetch delays.
If the new TaskAttempt is later judged to be a straggler as well, MR3 creates yet another TaskAttempt, and so on.

Below we demonstrate how MR3 eliminates fetch delays.
We consecutively run query 4 of the TPC-DS benchmark a total of 100 times in the same setting described above,
and report the execution time of every run. 

1. If we 1) deploy a single large ContainerWorker on each node, 2) create a single shuffle handler in each ContainerWorker,
and 3) do not use speculative execution,
fetch delays occur frequently. 
In this scenario, there is only one shuffle handler running on each node.
The graph shows the run number in the x-axis and the execution time in seconds in the y-axis.
![fetch.ex1](/mr3/fetch.ex1-fs8.png)

2. If we instead use Hadoop shuffle service which runs as an independent process on every node, 
fetch delays occur less frequently, but are still a serious problem.
![fetch.ex2](/mr3/fetch.ex2-fs8.png)

3. If we 1) deploy 5 small ContainerWorkers on each node, 2) create a single shuffle handler in each ContainerWorker,
and 3) do not use speculative execution,
fetch delays occur much less frequently.
The result is better than in the first scenario because every node runs 5 shuffle handlers.
![fetch.ex3](/mr3/fetch.ex3-fs8.png)

4. If we 1) deploy a single large ContainerWorker on each node, 2) create 10 shuffle handlers in each ContainerWorker,
and 3) use speculative execution,
fetch delays seldom occur.
In this scenario, there are 10 shuffle handlers running on each node.
![fetch.ex4](/mr3/fetch.ex4-fs8.png)

5. If we 1) deploy a single large ContainerWorker on each node, 2) create 20 shuffle handlers in each ContainerWorker,
and 3) use speculative execution,
fetch delays never occur.
In this scenario, there are 20 shuffle handlers running on each node.
Moreover the execution time is noticeably more stable than in the previous scenario.
![fetch.ex5](/mr3/fetch.ex5-fs8.png)

