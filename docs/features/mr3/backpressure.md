--- 
title: Backpressure Handling
sidebar_position: 135
---

## Backpressure on shuffle handlers

In MR3, backpressure occurs
when shuffle handlers are unable to keep up with incoming fetch requests from remote nodes.
To handle simultaneous fetch requests more efficiently,
a ContainerWorker distributes the shuffling load across multiple shuffle handlers,
as specified by the configuration key `mr3.use.daemon.shufflehandler`.
Each shuffle handler, in turn, creates multiple threads,
controlled by the configuration key `tez.shuffle.max.threads` in `tez-site.xml`.
An excessive number of fetch requests, however,
can still lead to slow responses from shuffle handlers,
and in some cases, may even stall individual shuffle handlers for an extended period of time.

Note that backpressure occurs **on shuffle handlers,**
which serve shuffle requests from fetchers on remote nodes,
**not on ShuffleServers,** which merely collect and relay shuffle requests.
Since shuffle handlers (i.e., data producers) cannot transmit intermediate data quickly enough,
fetchers (i.e., data consumers) may stall until shuffle handlers stabilize.
As a result, Tasks experience fetch delays and may become stragglers,
potentially triggering speculative execution.

## Backpressure handling and speculative fetching in MR3

MR3 handles backpressure on shuffle handlers
by controlling the creation of fetchers on the ShuffleServer side,
rather than by limiting the rate of incoming shuffle requests on the shuffle handler side.
This approach is necessary because the state of shuffle handlers
(e.g., whether some shuffle handlers are stalled) is not propagated to ShuffleServers.

Specifically,
when a fetcher that contacts a remote shuffle handler makes no progress
for a certain period of time,
its corresponding ShuffleServer will temporarily block further connections to that shuffle handler.
Note that the ShuffleServer can still create fetchers that contact other shuffle handlers
within the same ContainerWorker.

As part of the backpressure-handling strategy,
MR3 also implements a mechanism called **speculative fetching.**
A speculative fetcher is launched when an existing fetcher fails to make progress
for a certain period of time.
Speculative fetching addresses the scenario where a fetcher remains stuck even
after the shuffle handler serving its request has recovered.
By triggering speculative fetching, MR3 can often avoid speculative execution,
a more expensive fallback that requires launching a new TaskAttempt.

MR3 uses the following configuration keys (all in `tez-site.xml`)
to control backpressure handling and speculative fetching.

* `tez.runtime.shuffle.speculative.fetch.wait.millis`
specifies the elapsed time threshold for a fetcher before triggering speculative fetching.
The default value is 30000 (30 seconds).
* `tez.runtime.shuffle.stuck.fetcher.threshold.millis`
specifies the elapsed time threshold for a fetcher before triggering backpressure handling
and blocking further connections to the shuffle handler.
The default value is 3000 (3 seconds).
* `tez.runtime.shuffle.stuck.fetcher.release.millis`
specifies the elapsed time threshold after which backpressure handling is lifted,
resuming the creation of fetchers that contact the previously blocked shuffle handler.
The default value is 15000 (15 seconds).

MR3 considers that a fetcher is making no progress
if it fails to receive the actual payload of intermediate data,
regardless of whether the connection has been established and verified.

The following diagram shows the state transition of a fetcher
when the default values are used for backpressure handling and speculative fetching.
A fetcher can be in one of the following five states before its execution is complete:

* **Normal**: The fetcher is running normally.
* **Stuck**: The fetcher has made no progress within the time threshold specified by `tez.runtime.shuffle.stuck.fetcher.threshold.millis`.
* **Recovered**: The fetcher is no longer involved in backpressure handling
because it has received intermediate data.
* **Speculative**: The fetcher is no longer involved in backpressure handling
because the elapsed time has exceeded the threshold specified by `tez.runtime.shuffle.stuck.fetcher.release.millis`.
* **Retry**: The fetcher has not completed after the time threshold specified by `tez.runtime.shuffle.speculative.fetch.wait.millis`.

![fetcher.state](/mr3/fetcher.state-fs8.png)

In the state **Speculative** or **Retry**, MR3 may create a speculative fetcher.
MR3 creates up to three fetchers for the same shuffle request.

