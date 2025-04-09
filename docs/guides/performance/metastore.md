---
title: Column Statistics
sidebar_position: 10
---

## `hive.stats.fetch.bitvector` 

The logic of calculating column statistics in Metastore depends on
the configuration key `hive.stats.fetch.bitvector` in `hive-site.xml`.
In general,
Metastore provides more accurate column statistics when it is set to true,
albeit at slightly higher costs
due to additional queries sent to the database for Metastore.

For long-running queries that involve multiple join operators on various tables,
the value of `hive.stats.fetch.bitvector` can significantly impact the execution time.
In our experiment,
with a scale factor of 10TB on the TPC-DS benchmark,
the execution time of query 23 and query 24 varies as follows:

* With `hive.stats.fetch.bitvector` set to false,
  - the total execution time: 1418 seconds
    - query 23: 274 seconds, 346 seconds
    - query 24: 336 seconds, 462 seconds
* With `hive.stats.fetch.bitvector` set to true
  - the total execution time: 805 seconds
    - query 23: 199 seconds, 231 seconds
    - query 24: 90 seconds, 285 seconds

`hive.stats.fetch.bitvector` is set to true by default in the MR3 release.
The user can set it to false if the overhead in Metastore is too high
(e.g., when the connection to the database for Metastore is very slow).

## Compute column statistics

Computing column statistics is crucial for generating efficient query plans.
The user can compute column statistics by executing `analyze table` command
and then check the result by inspecting the property `COLUMN_STATS_ACCURATE`.
Note that 
even when the configuration key `hive.stats.column.autogather` is set to true,
manually computing column statistics is recommended in order to obtain more accurate statistics.
```sh
0: jdbc:hive2://blue0:9842/> analyze table store_sales compute statistics for columns;
...
0: jdbc:hive2://blue0:9842/> describe formatted store_returns sr_customer_sk;
...
+------------------------+---------------------------------------------------+
|    column_property     |                       value                       |
+------------------------+---------------------------------------------------+
...
| COLUMN_STATS_ACCURATE  | {\"COLUMN_STATS\":{\"sr_customer_sk\":\"true\"}}  |
+------------------------+---------------------------------------------------+
```


