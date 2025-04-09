--- 
title: Node Blacklisting
sidebar_position: 145
---

## Node blacklisting in MR3

MR3 implements a mechanism of node blacklisting for restricting the assignment of TaskAttempts to those nodes where TaskAttempts fail repeatedly. 
For each node, the DAGAppMaster keeps updating the ratio of unsuccessful TaskAttempts among all TaskAttempts over a certain time window.
When the ratio reaches a threshold, it blacklists the node. 
Once blacklisted, the node does not execute TaskAttempts at its full capacity.

The following configuration keys control the behavior of MR3 for node blacklisting:

* `mr3.am.maxtaskfailure.percent` specifies the threshold for the ratio of unsuccessful TaskAttempts.
For example, a default value of 5 means that if 5 percent of TaskAttempts fail over the past time window, a node is blacklisted.
* `mr3.am.max.safe.resource.percent.blacklisted` specifies the maximum percentage of resources that a blacklisted node can utilize.
For example, a default value of 50 means that at the time of being blacklisted, a node can accommodate TaskAttempts with only 50 percent of its resources (CPU cores and memory).
* `mr3.am.min.safe.resource.percent.blacklisted` specifies the minimum percentage of resources that a blacklisted node can utilize.
For example, a default value of 10 means that  node can accommodate TaskAttempts with at least 10 percent of its resources (CPU cores and memory).

The following graph plots the percentage of resources of a node with respect to the ratio of successful TaskAttempts among all TaskAttempts:
![blacklisting](/mr3/blacklisting-fs8.png)

Note that even in the worst case where all TaskAttempts consistently fail, a node can still get assigned new TaskAttempts by the DAGAppMaster.
Thus it is never eliminated from consideration for TaskAttempts (provided that the configuration key `mr3.am.min.safe.resource.percent.blacklisted` is set to a sufficiently large value).
In this way, the DAGAppMaster can have a chance of unblacklisting a node when TaskAttempts start to complete successfully again.

