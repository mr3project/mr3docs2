---
title: Installing Hive on MR3
sidebar_position: 2
---

In order to install Hive on MR3, 
clone the git repository of MR3.

```sh
# terminal-command
git clone https://github.com/mr3project/mr3.git
# terminal-command
cd mr3/
```

The MR3 git repository contains scripts and preset configuration files
for running Hive on MR3, but it does not contain binary files.
In order to download binary files,
execute `install.sh` with the address of an MR3 release.
The script copies jar files of Hive on MR3 and creates symbolic links.

Download Hive on MR3.

```sh
# terminal-command
./install.sh https://github.com/mr3project/mr3/releases/download/v2.0/hive4-mr3-2.0.tar.gz
```

That's it!

:::info
For running Hive on MR3 **on Hadoop**,
it suffices to install Hive on MR3 only on the master node (where HiveServer2 is executed).
:::
:::info
For running Hive on MR3 **on Kubernetes**, it is not necessary to download binary files.
:::
:::caution
**Hive on MR3 requires Java 17 or later (up to Java 22).**
Install Java 17 on your system,
except when running Hive on MR3 on Kubernetes.
:::
:::caution
The MR3 release has **a worker capacity limit of 512GB.**
For example, the user can create up to 8 workers, each with 64GB of memory.

**For larger deployments, a commercial license is available.
See [Pricing & FAQ](https://datamonad.com/pricing/) for more information.**
:::

