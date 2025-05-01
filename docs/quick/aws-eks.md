---
title: "On Amazon EKS with Autoscaling"
sidebar_position: 10
---

Since Amazon EKS is a particular instance of a Kubernetes cluster,
operating Hive on MR3 on Amazon EKS is almost the same as
operating it on a generic Kubernetes cluster.
This page explains additional steps that are specific to Amazon EKS
and not directly related to any component of Hive on MR3.
For general instructions,
refer to the guide [on Kubernetes](./k8s/).

After [installing Hive on MR3](./install), change to the directory `eks`.
```sh
# terminal-command
cd eks/
```

:::caution
The example on this page uses `eksctl` version 0.207.0 and `kubectl` version 1.23.
Make sure that your `kubectl` version is compatible with the version of `eksctl`.
:::

## Overview

Before running Hive on MR3 on Amazon EKS,
the user should understand the following topics:

1. Creating and updating IAM policies
2. Provisioning an EKS cluster with the command `eksctl`
3. (Optional) Creating an EFS file system and mounting it via a PersistentVolume
4. Configuring LoadBalancers

Creating an EFS file system is optional
because Hive on MR3 can use S3, instead of a PersistentVolume, to store transient data.

The user may create new resources (such as IAM policies)
either on the AWS console or by executing AWS CLI.

## IAM policy for accessing S3 buckets 

Create a JSON file (e.g., `MR3AccessS3.json`) for an IAM policy
that allows every Pod to access the S3 buckets for storing the warehouse and input datasets.
If S3 is used to store transient data,
extend the policy so that every Pod can access the corresponding S3 bucket
(usually called the "scratch directory").
To restrict the set of operations permitted to Pods, adjust the ``Action`` field as necessary.

```json
# terminal-command
vi MR3AccessS3.json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:*"
            ],
            "Resource": [
                "arn:aws:s3:::hivemr3-warehouse-dir",
                "arn:aws:s3:::hivemr3-warehouse-dir/*",
                "arn:aws:s3:::hivemr3-scratch-dir",
                "arn:aws:s3:::hivemr3-scratch-dir/*",
                "arn:aws:s3:::hivemr3-partitioned-2-orc",
                "arn:aws:s3:::hivemr3-partitioned-2-orc/*",
                "arn:aws:s3:::hivemr3-partitioned-1000-orc",
                "arn:aws:s3:::hivemr3-partitioned-1000-orc/*"
            ]
        }
    ]
}
```

Create an IAM policy and get its ARN (Amazon Resource Name).
In our example, the IAM policy is named `MR3AccessS3`. 

```sh
# terminal-command
S3_ARN=$(aws iam create-policy --policy-name MR3AccessS3 --policy-document file://MR3AccessS3.json --query 'Policy.Arn' --output text)

# terminal-command
echo "$S3_ARN"
arn:aws:iam::123456789012:policy/MR3AccessS3
```

## IAM policy for autoscaling 

To enable autoscaling,
create an IAM policy `EKSAutoScalingWorkerPolicy` and get its ARN. 

```json
# terminal-command
vi EKSAutoScalingWorkerPolicy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "autoscaling:DescribeAutoScalingGroups",
        "autoscaling:DescribeAutoScalingInstances",
        "autoscaling:DescribeLaunchConfigurations",
        "autoscaling:DescribeTags",
        "ec2:DescribeInstanceTypes",
        "ec2:DescribeLaunchTemplateVersions"
      ],
      "Resource": ["*"]
    },
    {
      "Effect": "Allow",
      "Action": [
        "autoscaling:SetDesiredCapacity",
        "autoscaling:TerminateInstanceInAutoScalingGroup",
        "ec2:DescribeInstanceTypes",
        "eks:DescribeNodegroup"
      ],
      "Resource": ["*"]
    }
  ]
}
```
```sh
# terminal-command
AUTOSCALING_ARN=$(aws iam create-policy --policy-name EKSAutoScalingWorkerPolicy --policy-document file://EKSAutoScalingWorkerPolicy.json --query 'Policy.Arn' --output text)

# terminal-command
echo "$AUTOSCALING_ARN"
arn:aws:iam::123456789012:policy/EKSAutoScalingWorkerPolicy
```

## Using instance storage

ContainerWorkers of MR3 write intermediate data, such as output of TaskAttempts or input to TaskAttempts fetched through shuffle handlers, to local disks.
In the case of running Hive on MR3 on Kubernetes, there are three ways to simulate local disks for ContainerWorker Pods:

1. Use emptyDir volumes specified by the configuration key `mr3.k8s.pod.worker.emptydirs`. Each directory in the configuration value is mapped to an emptyDir volume.
2. Use hostPath volumes specified by the configuration key `mr3.k8s.pod.worker.hostpaths`. Each directory in the configuration value (which should be ready on the host node) is mapped to a hostPath volume.
3. Use persistentVolumeClaim volumes (mounting PersistentVolumes) specified by the configuration key `mr3.k8s.worker.local.dir.persistentvolumes`
along with `mr3.k8s.local.dir.persistentvolume.storageclass` and `mr3.k8s.local.dir.persistentvolume.storage`.
Each directory in the configuration value is mapped to a persistentVolumeClaim volume
which is created dynamically according to the storage class specified by `mr3.k8s.local.dir.persistentvolume.storageclass` (e.g., `gp2` for EBS)
and the size specified by `mr3.k8s.local.dir.persistentvolume.storage` (e.g., `2Gi`).

For Amazon EKS, the first option is okay only for running small queries with a low concurrency level because of the small size of the root partition (20GB by default).
Or the user can increase the size of the root partition with the `--node-volume-size` flag of `eksctl` when creating an EKS cluster.
The second option offers the best performance (at a slightly higher cost) if we use instance storage which is physically attached to the host node.
The third option works only in limited cases: 1) the EKS cluster should be running in a single Availability Zone, and 2) Docker containers should run as a root user.

To use the second option, the user should create an EKS cluster whose `mr3-worker` node group uses an EC2 instance type that is equipped with instance storage.
In addition, the `preBootstrapCommands` field in the the specification of the `mr3-worker` node group should include commands for formatting and mounting the instance storage.

In our example, we use the second option.

## Configuring an EKS cluster

Open `cluster.yaml`.
Set the region for an EKS cluster. 

```yaml
# terminal-command
vi cluster.yaml

metadata:
  region: ap-northeast-2
```

We create an EKS cluster with two node groups: `mr3-master` and `mr3-worker`. 

* The `mr3-master` node group is intended for HiveServer2, DAGAppMaster, and Metastore Pods.
In our examle,
we use a single on-demand instance of type `m5.xlarge` for the master node.
* The `mr3-worker` node group is intended for ContainerWorker Pods.
In our example,
we use up to three spot instances of type `m5d.xlarge` for worker nodes.
Note that worker nodes have instance storage. 
If `eksctl` requires at least two instance types for the `mr3-worker` node group,
upgrade it to the latest version.

```yaml
# terminal-command
vi cluster.yaml

nodeGroups:
  - name: mr3-master
    instanceType: m5.xlarge
    desiredCapacity: 1

  - name: mr3-worker
    desiredCapacity: 0
    minSize: 0
    maxSize: 3
    instancesDistribution:
      instanceTypes: ["m5d.xlarge"]
      onDemandBaseCapacity: 0
      onDemandPercentageAboveBaseCapacity: 0
```

In the `iam.attachPolicyARNs` field of both node groups `mr3-master` and `mr3-worker`,
use the ARNs of the IAM policies created in the previous steps.
(Without using the ARN for `mr3-master`, the user cannot check the status of the Kubernetes Autoscaler.) 

```yaml
# terminal-command
vi cluster.yaml

nodeGroups:
  - name: mr3-master
    iam:
      attachPolicyARNs:
        - arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
        - arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy
        - arn:aws:iam::123456789012:policy/EKSAutoScalingWorkerPolicy
        - arn:aws:iam::123456789012:policy/MR3AccessS3
  - name: mr3-worker
    iam:
      attachPolicyARNs:
        - arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
        - arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy
        - arn:aws:iam::123456789012:policy/EKSAutoScalingWorkerPolicy
        - arn:aws:iam::123456789012:policy/MR3AccessS3
```

In the `preBootstrapCommands` field of the node group `mr3-worker`,
list commands for initializing instance storage. 
In our example, we mount a single local disk on the directory `/ephemeral1`.
Note that the owner of `/ephemeral1` is set to `ec2-user`
whose UID 1000 matches the UID of user `hive` in the Docker image.

```yaml
# terminal-command
vi cluster.yaml

nodeGroups:
  - name: mr3-worker
    preBootstrapCommands:
      - "IDX=1; for DEV in /dev/disk/by-id/nvme-Amazon_EC2_NVMe_Instance_Storage_*-ns-1; do mkfs.xfs ${DEV}; mkdir -p /ephemeral${IDX}; echo ${DEV} /ephemeral${IDX} xfs defaults,noatime 1 2 >> /etc/fstab; IDX=$((${IDX} + 1)); done"
      - "mount -a"
      - "IDX=1; for DEV in /dev/disk/by-id/nvme-Amazon_EC2_NVMe_Instance_Storage_*-ns-1; do chown ec2-user:ec2-user /ephemeral${IDX}; IDX=$((${IDX} + 1)); done"
```

By default, the command `eksctl` uses all Availability Zones (AZs) from the region specified by the field `metadata.region`.
As a result, ContainerWorker Pods usually spread across multiple AZs and may not be collocated with the HiveServer2 Pod.
The use of multiple AZs, however, can have an unintended consequence because
**Amazon charges for data transfer between different AZs ($0.01/GB to $0.02/GB)**
and intermediate data exchanged by ContainerWorkers can cross the AZ boundary.
Specifically ContainerWorkers exchange intermediate data very often and in large quantities,
and the data transfer cost can be surprisingly high,
sometimes surpassing the total cost of EC2 instances.

Thus the user may want to restrict the EKS cluster to a single AZ and avoid high data transfer costs.
The user can use a single AZ by updating `cluster.yaml` as follows.
(If `eksctl` does not accept this update, upgrade it to the latest version.)

```yaml
# terminal-command
vi cluster.yaml

availabilityZones: ["ap-northeast-2a", "ap-northeast-2b", "ap-northeast-2c"]

nodeGroups:
  - name: mr3-master
    availabilityZones: ["ap-northeast-2a"]

  - name: mr3-worker
    availabilityZones: ["ap-northeast-2a"]

# terminal-command
AZONE=ap-northeast-2a
```

The environment variable `AZONE` is used later.

## Creating an EKS cluster

Create an EKS cluster by executing the command `eksctl`.
The following diagram shows an example of the EKS cluster after launch:

![eks.autoscaling.example](/quickstart/eks.autoscaling.example3-fs8.png)

Creating an EKS cluster can take 15 minutes or longer.
Get the name of the CloudFormation stack `eksctl-hive-mr3-cluster`.

```sh
# terminal-command
eksctl create cluster -f cluster.yaml
2025-05-01 22:50:19 [ℹ]  eksctl version 0.207.0
2025-05-01 22:50:19 [ℹ]  using region ap-northeast-2
...
2025-05-01 23:04:03 [✔]  EKS cluster "hive-mr3" in "ap-northeast-2" region is ready
```

Get the VPC ID of CloudFormation `eksctl-hive-mr3-cluster`.
```sh
# terminal-command
VPCID=$(aws ec2 describe-vpcs --filter Name=tag:aws:cloudformation:stack-name,Values=eksctl-hive-mr3-cluster --query "Vpcs[0].VpcId" --output text)

# terminal-command
echo "$VPCID"
vpc-0394968e116d238e2
```

Get the public subnet ID of CloudFormation `eksctl-hive-mr3-cluster`.

```sh
# terminal-command
SUBNETID=$(aws ec2 describe-subnets --filter Name=vpc-id,Values=$VPCID Name=availability-zone,Values=$AZONE Name=tag:aws:cloudformation:stack-name,Values=eksctl-hive-mr3-cluster Name=tag:Name,Values="*Public*" --query "Subnets[0].SubnetId" --output text)

# terminal-command
echo "$SUBNETID"
subnet-0895b6cd4f381ad31
```

The user can find that serveral security groups are created.
Get the ID of the security group for the EKS cluster
that matches the pattern `eksctl-hive-mr3-cluster-ClusterSharedNodeSecurityGroup-*`.

```sh
# terminal-command
SGROUPALL=$(aws ec2 describe-security-groups --filters Name=vpc-id,Values=$VPCID Name=group-name,Values="eksctl-hive-mr3-cluster-ClusterSharedNodeSecurityGroup-*" --query "SecurityGroups[0].GroupId" --output text)

# terminal-command
echo "$SGROUPALL"
sg-068049732c8cc61cf
```

The user can find that two Auto Scaling groups have been created.

```sh
# terminal-command
aws autoscaling describe-auto-scaling-groups --region ap-northeast-2 --query "AutoScalingGroups[*].[AutoScalingGroupName]" --output text
eksctl-hive-mr3-nodegroup-mr3-master-NodeGroup-dGaIVkZ6q5BK
eksctl-hive-mr3-nodegroup-mr3-worker-NodeGroup-fNgGpmo0WUVd
```
![auto.scaling.group.eks](/quickstart/auto.scaling.group.eks-fs8.png)

In our example, the `mr3-master` node group starts with a single master node
whereas the `mr3-worker` node group starts with no node and can attach up to three nodes.

The user can verify that only the master node is available in the EKS cluster.
```sh
# terminal-command
kubectl get nodes
NAME                                                STATUS   ROLES    AGE   VERSION
ip-192-168-27-229.ap-northeast-2.compute.internal   Ready    <none>   25m   v1.32.1-eks-5d632ec
```

The user can get the public IP address of the master node.
```sh
# terminal-command
kubectl describe node ip-192-168-27-229.ap-northeast-2.compute.internal | grep "IP: "
  InternalIP:   192.168.27.229
  ExternalIP:   3.38.153.151
```

## Configuring Kubernetes Autoscaler

If autoscaling is enabled,
open `cluster-autoscaler-autodiscover.yaml` and
set `AWS_REGION` and `AWS_DEFAULT_REGION`.
Change the configuration for autoscaling if necessary.
By default, the Kubernetes Autoscaler removes nodes that stay idle for 1 minute (as specified by `--scale-down-unneeded-time`).

```yaml
# terminal-command
vi cluster-autoscaler-autodiscover.yaml

spec:
  template:
    spec:
      containers:
          env:
            - name: AWS_REGION
              value: ap-northeast-2
            - name: AWS_DEFAULT_REGION
              value: ap-northeast-2
          command:
            - --scale-down-delay-after-add=5m
            - --scale-down-unneeded-time=1m
```

Start the Kubernetes Autoscaler.

```sh
# terminal-command
kubectl apply -f cluster-autoscaler-autodiscover.yaml
serviceaccount/cluster-autoscaler created
clusterrole.rbac.authorization.k8s.io/cluster-autoscaler created
role.rbac.authorization.k8s.io/cluster-autoscaler created
clusterrolebinding.rbac.authorization.k8s.io/cluster-autoscaler created
rolebinding.rbac.authorization.k8s.io/cluster-autoscaler created
deployment.apps/cluster-autoscaler created
```

The user can check that the Kubernetes Autoscaler has started properly.

```sh
# terminal-command
kubectl logs -f deployment/cluster-autoscaler -n kube-system
...
I0501 14:43:00.497780       1 static_autoscaler.go:598] Starting scale down
I0501 14:43:00.497802       1 legacy.go:298] No candidates for scale down
```

## (Optional) Creating and mounting an EFS file system

Below we describe how to create and mount an EFS file system via a PersistentVolume
using an external storage provisioner
(instead of the Amazon EFS CSI driver).

### 1) Creating an EFS file system

The user can create an EFS file system on the AWS Console.
When creating EFS, choose the VPC of the EKS cluster.
Make sure that a mount target is created for each Availability Zone.
Get the file system ID of EFS (e.g., `fs-0d9698da20942d8bf`).
If the user can choose the security group for mount targets,
use the security group for the EKS cluster (in `SGROUPALL`).

Alternatively the user can create an EFS file system using AWS CLI. 
Create EFS in the Availability Zone where Hive on MR3 is to run.
Get the file system ID of EFS.

```sh
# terminal-command
EFSID=$(aws efs create-file-system --performance-mode generalPurpose --throughput-mode bursting --availability-zone-name $AZONE --query 'FileSystemId' --output text)

# terminal-command
echo "$EFSID"
fs-0d9698da20942d8bf
```

Create a mount target using the subnet ID of CloudFormation `eksctl-hive-mr3-cluster`
and the security group ID for the EKS cluster. 
Get the mount target ID which is necessary when deleting the EKS cluster.

```sh
# terminal-command
MOUNTID=$(aws efs create-mount-target --file-system-id $EFSID --subnet-id $SUBNETID --security-groups $SGROUPALL --query 'MountTargetId' --output text)

# terminal-command
echo "$MOUNTID"
fsmt-098e2c5a065bc3ca0
```

### 2) Configuring security groups when necessary

If the user cannot choose the security group for mount targets,
security groups should be configured manually.
Identify two security groups: 1) the security group for the EC2 instances constituting the EKS cluster; 
2) the security group associated with the EFS mount targets.

For the first security group (for the EC2 instances), add a rule to allow inbound access using Secure Shell (SSH) from any host so that EFS can access the EKS cluster, as shown below:
![eks.security.group.ssh](/k8s/eks.security.group.ssh-fs8.png)

For the second security group, add a rule to allow inbound access using NFS from the first security group so that the EKS cluster can access EFS, as shown below:
![eks.security.group.nfs](/k8s/eks.security.group.nfs-fs8.png)
Here `sg-096f3c3dff95ad6ae` is the first security group. 

In order to check if the EKS cluster can mount EFS to a local directory in its EC2 instances,
get the file system ID of EFS (e.g., `fs-0d9698da20942d8bf`) and the region ID (e.g., `ap-northeast-2`).
Then log on to an EC2 instance and execute the following commands.

```sh 
# terminal-command
mkdir -p /home/ec2-user/efs
# terminal-command
sudo mount -t nfs -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport fs-0d9698da20942d8bf.efs.ap-northeast-2.amazonaws.com:/ /home/ec2-user/efs
```

If the security groups are properly configured, EFS is mounted to the directory `/home/ec2-user/efs`.


### 3) Creating a StorageClass

We use the external storage provisioner for AWS EFS
(available at [https://github.com/kubernetes-sigs/sig-storage-lib-external-provisioner](https://github.com/kubernetes-sigs/sig-storage-lib-external-provisioner))
to create a StorageClass for EFS. 
The external storage provisioner assists PersistentVolumeClaims asking for the StorageClass for EFS by creating PersistentVolumes on EFS.

For creating a StorageClass for EFS,
the directory `efs` contains four YAML files for starting the storage provisioner for EFS and creating a PersistentVolumeClaim `workdir-pvc`.
Set the file system ID of EFS, the region ID, and the NFS server address in `efs/manifest.yaml`.

```yaml
# terminal-command
vi efs/manifest.yaml

data:
  file.system.id: fs-0d9698da20942d8bf
  aws.region: ap-northeast-2
  provisioner.name: example.com/aws-efs
  dns.name: ""

spec:
  template:
    spec:
      volumes:
      - name: pv-volume
        nfs:
          server: fs-0d9698da20942d8bf.efs.ap-northeast-2.amazonaws.com
          path: /
```

Set the environment variable `MR3_NAMESPACE` to the namespace and
execute the script `mount-efs.sh` to create a PersistentVolume.

```sh
# terminal-command
vi mount-efs.sh

MR3_NAMESPACE=hivemr3
```
```sh
# terminal-command
./mount-efs.sh
namespace/hivemr3 created
serviceaccount/efs-provisioner created
clusterrole.rbac.authorization.k8s.io/efs-provisioner-runner created
clusterrolebinding.rbac.authorization.k8s.io/run-efs-provisioner created
role.rbac.authorization.k8s.io/leader-locking-efs-provisioner created
rolebinding.rbac.authorization.k8s.io/leader-locking-efs-provisioner created
configmap/efs-provisioner created
deployment.apps/efs-provisioner created
storageclass.storage.k8s.io/aws-efs created
persistentvolumeclaim/workdir-pvc created
```

The user can find a new StorageClass `aws-efs`, a new Pod (e.g., `efs-provisioner-88bc4d8b6-588qg`) running the storage provisioner, and a new PersistentVolumeClaim `workdir-pvc`.
There is no limit in the capacity of the PersistentVolumeClaim `workdir-pvc`, so the user can ignored its nominal capacity `1Mi`. 
All Pods of Hive on MR3 will share the PersistentVolumeClaim `workdir-pvc`.

```sh
# terminal-command
kubectl get sc
NAME      PROVISIONER             RECLAIMPOLICY   VOLUMEBINDINGMODE      ALLOWVOLUMEEXPANSION   AGE
aws-efs   example.com/aws-efs     Delete          Immediate              false                  23s
gp2       kubernetes.io/aws-ebs   Delete          WaitForFirstConsumer   false                  62m

# terminal-command
kubectl get pods -n hivemr3
NAME                              READY   STATUS    RESTARTS   AGE
efs-provisioner-88bc4d8b6-588qg   1/1     Running   0          49s

# terminal-command
kubectl get pvc -n hivemr3
NAME          STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   VOLUMEATTRIBUTESCLASS   AGE
workdir-pvc   Bound    pvc-e9161aad-6358-48fd-a194-c0c129447481   1Mi        RWX            aws-efs        <unset>                 75s
```

The user can verify that a new directory for the PersistentVolumeClaim `workdir-pvc` has been created on EFS.
```sh
# terminal-command
kubectl exec -n hivemr3 -it efs-provisioner-88bc4d8b6-588qg -- apk add bash
# terminal-command
kubectl exec -n hivemr3 -it efs-provisioner-88bc4d8b6-588qg -- /bin/bash -c "ls /persistentvolumes"
workdir-pvc-pvc-e9161aad-6358-48fd-a194-c0c129447481
```

## Configuring Hive on MR3

Once the EKS cluster is ready,
the user can proceed to the quick start guides [on Kubernetes](./k8s/).

When configuring Hive on MR3,
most of the configuration keys in `conf/core-site.xml` and `conf/mr3-site.xml`
can use their default values.
Below we explain several configuration keys that should be customized by the user.

* Use `InstanceProfileCredentialsProvider` for the credential provider.
  Then the user does not need AWS access key and secret key.
  ```xml
  # terminal-command
  vi conf/core-site.xml

  <property>
    <name>fs.s3a.aws.credentials.provider</name>
    <value>com.amazonaws.auth.InstanceProfileCredentialsProvider</value>
  </property>
  ```

* Enable autoscaling in MR3.
  ```xml
  # terminal-command
  vi conf/mr3-site.xml

  <property>
    <name>mr3.enable.auto.scaling</name>
    <value>true</value>
  </property>
  ```

* Set `mr3.k8s.pod.worker.hostpaths` to `/ephemeral1` 
  because the instance type `m5d.xlarge` for worker nodes 
  is equipped with a single local disk mounted on the directory `/ephemeral1`.
  ```xml
  # terminal-command
  vi conf/mr3-site.xml

  <property>
    <name>mr3.k8s.pod.worker.hostpaths</name>
    <value>/ephemeral1</value>
  </property>
  ```
  If the user uses different instance types with multiple local disks, 
  the `preBootstrapCommands` field of the node group `mr3-worker` should be expanded to mount all local disks
  and the configuration key `mr3.k8s.pod.worker.hostpaths` should include additional directories.

* Since the Kubernetes Autoscaler is configured to remove nodes that remain idle for 1 minute for fast scale-in,
  set `mr3.auto.scale.in.grace.period.secs` to 90 seconds
  (60 seconds of idle time and extra 30 seconds to account for delays).
  If the user wants to increase the value of `--scale-down-unneeded-time` in `cluster-autoscaler-autodiscover.yaml`,
  the value for `mr3.auto.scale.in.grace.period.secs` should be adjusted accordingly.
  ```xml
  # terminal-command
  vi conf/mr3-site.xml

  <property>
    <name>mr3.auto.scale.in.grace.period.secs</name>
    <value>90</value>
  </property>
  ```

* To prevent MR3 from prematurely cancelling the provisioning of worker nodes,
  set `mr3.auto.scale.out.grace.period.secs` to a sufficiently large value
  For example, if it takes about 3 minutes to create and initialize a new worker node,
  `mr3.auto.scale.out.grace.period.secs` can be set to 300 (equivalent to 5 minutes).
  For more details, see [Autoscaling](/docs/features/mr3/autoscaling).
  ```xml
  # terminal-command
  vi conf/mr3-site.xml

  <property>
    <name>mr3.auto.scale.out.grace.period.secs</name>
    <value>300</value>
  </property>
  ```

* Change resources to be allocated to each mapper, reducer, and ContainerWorker by updating `conf/hive-site.xml`.
  In particular,
  the configuration keys `hive.mr3.all-in-one.containergroup.memory.mb` and `hive.mr3.all-in-one.containergroup.vcores`
  should be adjusted so that a ContainerWorker can fit in a worker node.
  For example, we can use the following values for worker nodes of instance type `m5d.xlarge`. 
  - `hive.mr3.map.task.memory.mb`=3000
  - `hive.mr3.map.task.vcores`=0
  - `hive.mr3.reduce.task.memory.mb`=3000
  - `hive.mr3.reduce.task.vcores`=0
  - `hive.mr3.all-in-one.containergroup.memory.mb`=14000
  - `hive.mr3.all-in-one.containergroup.vcores`=3

## Configuring the LoadBalancer

Executing HiveServer2 creates a new LoadBalancer.
Get the security group associated with the LoadBalancer.
If necessary, edit the inbound rule in order to restrict the source IP addresses
(e.g., by changing the source from `0.0.0.0/0` to `(IP address)/32`).

![eks.load.balancer.source](/quickstart/eks.load.balancer.source-fs8.png)

The LoadBalancer disconnects Beeline showing no activity for the idle timeout period, which is 60 seconds by default.
The user may want to increase the idle timeout period, e.g., to 1200 seconds. 
Otherwise Beeline loses the connection to HiveServer2 even after a brief period of inactivity.

## Running Beeline

To run Beeline, get the LoadBalancer Ingress of the Service `hiveserver2`.
```sh
# terminal-command
kubectl describe service -n hivemr3 hiveserver2
Name:                     hiveserver2
Namespace:                hivemr3
Labels:                   <none>
Annotations:              <none>
Selector:                 hivemr3_app=hiveserver2
Type:                     LoadBalancer
IP:                       10.100.87.74
External IPs:             1.1.1.1
LoadBalancer Ingress:     a5002d0aff1bb4773aa04dc2bcc205bf-39738783.ap-northeast-2.elb.amazonaws.com
...
```

Get the IP address of the LoadBalancer Ingress.
```sh
# terminal-command
nslookup a5002d0aff1bb4773aa04dc2bcc205bf-39738783.ap-northeast-2.elb.amazonaws.com
...
Non-authoritative answer:
Name:	a5002d0aff1bb4773aa04dc2bcc205bf-39738783.ap-northeast-2.elb.amazonaws.com
Address: 3.36.135.212
Name:	a5002d0aff1bb4773aa04dc2bcc205bf-39738783.ap-northeast-2.elb.amazonaws.com
Address: 13.124.55.22
```

In this example, the user can use `3.36.135.212` or `13.124.55.22` as the IP address of HiveServer2 when running Beeline.
This is because Beeline connects first to the LoadBalancer, not directly to HiveServer2.

After running a few queries, new worker nodes are attached and ContainerWorker Pods are created.
In our example, the EKS cluster ends up with three worker nodes.
The last ContainerWorker Pod stays in the state of `Pending`
because the number of worker nodes has reached its maximum (3 in our example) and no more worker nodes can be attached.
```sh
# terminal-command
kubectl get pods -n hivemr3
NAME                                   READY   STATUS    RESTARTS   AGE
efs-provisioner-88bc4d8b6-588qg        1/1     Running   0          7m39s
hivemr3-hiveserver2-769f575878-m57h8   1/1     Running   0          4m11s
hivemr3-metastore-0                    1/1     Running   0          4m46s
mr3master-3983-0-84c7b6c7c5-2nw74      1/1     Running   0          3m55s
mr3worker-9649-1                       1/1     Running   0          113s
mr3worker-9649-2                       1/1     Running   0          113s
mr3worker-9649-3                       1/1     Running   0          113s
mr3worker-9649-4                       0/1     Pending   0          113s
```

Here is the progress of scale-out operations
when the configuration key `mr3.auto.scale.out.num.initial.containers` is set to 1
in `conf/mr3-site.xml`:

![eks.auto.scaling.progress.scale.out](/quickstart/eks.auto.scaling.progress.scale.out-fs8.png)

Here is the progress of scale-in operations:

![eks.auto.scaling.progress.scale.in](/quickstart/eks.auto.scaling.progress.scale.in-fs8.png)

Note that the EKS cluster does not remove all worker nodes
because the configuration key `mr3.auto.scale.in.min.hosts` in `mr3-site.xml` is set to 1,
which means that no scale-in operation is performed if the number of worker nodes is 1.

The user can check the progress of autoscaling from the log of the DAGAppMaster Pod.

```sh
# terminal-command
kubectl logs -n hivemr3 mr3master-3983-0-84c7b6c7c5-2nw74 -f | grep -e Scale -e Scaling -e average
```

## Deleting the EKS cluster

Because of the additional components configured manually,
it take a few extra steps to delete the EKS cluster.
In order to delete the EKS cluster (created with `eksctl`), proceed in the following order.

1. Stop HiveServer2, DAGAppMaster, and Metastore.
    ```sh
    # terminal-command
    kubectl -n hivemr3 delete deployment hivemr3-hiveserver2
    deployment.apps "hivemr3-hiveserver2" deleted

    # terminal-command
    kubectl delete deployment -n hivemr3 mr3master-3983-0
    deployment.apps "mr3master-3983-0" deleted

    # terminal-command
    kubectl -n hivemr3 delete statefulset hivemr3-metastore
    statefulset.apps "hivemr3-metastore" deleted
    ```
2. Delete all the resources for Hive on MR3.
    ```sh
    # terminal-command
    kubectl -n hivemr3 delete configmap hivemr3-conf-configmap client-am-config mr3conf-configmap-master mr3conf-configmap-worker
    # terminal-command
    kubectl -n hivemr3 delete svc --all
    # terminal-command
    kubectl -n hivemr3 delete secret env-secret hivemr3-keytab-secret hivemr3-worker-secret 
    # terminal-command
    kubectl -n hivemr3 delete serviceaccount hive-service-account master-service-account worker-service-account
    # terminal-command
    kubectl -n hivemr3 delete role hive-role master-role worker-role
    # terminal-command
    kubectl -n hivemr3 delete rolebinding hive-role-binding master-role-binding worker-role-binding
    # terminal-command
    kubectl delete clusterrole node-reader
    # terminal-command
    kubectl delete clusterrolebinding hive-clusterrole-binding
    # terminal-command
    kubectl delete pv --all
    ```
3. Delete the resources for EFS.
    ```sh
    # terminal-command
    kubectl delete -f efs/service-account.yaml
    # terminal-command
    kubectl delete -f efs/workdir-pvc.yaml
    # terminal-command
    kubectl delete -f efs/manifest.yaml
    # terminal-command
    kubectl delete -f efs/rbac.yaml
    ```
4. Delete the namespace `hivemr3`.
    ```sh
    # terminal-command
    kubectl delete namespace hivemr3
    ```
5. If EFS was created, remove the mount target for EFS.
    ```sh
    # terminal-command
    aws efs delete-mount-target --mount-target-id $MOUNTID
    ```
6. If EFS was created, delete EFS. 
    ```sh
    # terminal-command
    aws efs delete-file-system --file-system-id $EFSID
    ```
7. Stop Kubernetes Autoscaler
    ```sh
    # terminal-command
    kubectl delete -f cluster-autoscaler-autodiscover.yaml
    ```
8. Delete EKS with `eksctl`.
    ```sh
    # terminal-command
    kubectl delete pdb -n kube-system coredns metrics-server
    # terminal-command
    eksctl delete cluster -f cluster.yaml
    ...
    2025-05-02 00:39:13 [✔]  all cluster resources were deleted
    ```

If the last command fails, the user should delete the EKS cluster manually.
Proceed in the following order on the AWS console.

1. Delete security groups manually.
2. Delete the NAT gateway created for the EKS cluster, delete the VPC, and then delete the Elastic IP address.
3. Delete the LoadBalancer.
4. Delete IAM roles.
5. Delete CloudFormations.

