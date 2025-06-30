---
layout:     post 
title:      "Nginx 오픈소스 서비스 메시 컴포넌트 Nginmesh 설치 가이드"
subtitle:   ""
description: "Nginmesh는 Istio 서비스 메시 플랫폼의 데이터 플레인 프록시로 사용되는 NGINX의 오픈소스 서비스 메시 프로젝트입니다. 이는 7계층 로드 밸런싱 및 서비스 라우팅 기능을 제공하며, Istio와 사이드카로 통합되어 '표준적이고 안정적이며 안전한 방식'으로 서비스 간 통신을 용이하게 하는 것을 목표로 합니다. Nginmesh는 연말에 0.2 및 0.3 버전을 연속으로 출시하여 서비스 디스커버리, 요청 전달, 라우팅 규칙, 성능 지표 수집 등의 기능을 제공합니다. 이 문서에서는 kubeadm을 사용하여 Kubernetes 클러스터를 설치하고 Nginmesh 사이드카를 배포하는 방법을 설명합니다."
date:       2018-01-02 12:00:00
author:     "Lionel.J"
image: "img/post-bg-2015.jpg"
publishDate: 2018-01-02 12:00:00
tags:
    - Istio 
    - service Mesh
    - nginmesh
URL: "/2018/01/02/nginmesh-install/"
categories: [ Tech ]
---

## 서문

Nginmesh는 Istio 서비스 메시 플랫폼의 데이터 플레인 프록시로 사용되는 NGINX의 오픈소스 서비스 메시 프로젝트입니다. 이는 7계층 로드 밸런싱 및 서비스 라우팅 기능을 제공하며, Istio와 사이드카로 통합되어 '표준적이고 안정적이며 안전한 방식'으로 서비스 간 통신을 용이하게 하는 것을 목표로 합니다. Nginmesh는 연말에 0.2 및 0.3 버전을 연속으로 출시하여 서비스 디스커버리, 요청 전달, 라우팅 규칙, 성능 지표 수집 등의 기능을 제공합니다.
<!--more-->
![Nginmesh sidecar proxy](https://raw.githubusercontent.com/nginmesh/nginmesh/master/images/nginx_sidecar.png)

> 참고: 이 설치 가이드는 Ubuntu 16.04를 기반으로 하며, Centos에서는 일부 설치 단계 명령을 약간 수정해야 할 수 있습니다.

## Kubernetes 클러스터 설치

Kubernetes 클러스터는 etcd, API 서버, 스케줄러, 컨트롤러 관리자 등 여러 컴포넌트를 포함하며, 컴포넌트 간의 구성이 비교적 복잡합니다. 각 컴포넌트를 수동으로 하나씩 설치하고 구성하려면 Kubernetes, 운영 체제 및 네트워크에 대한 광범위한 지식이 필요하며, 설치자의 역량이 높아야 합니다. kubeadm은 Kubernetes 클러스터를 쉽고 빠르게 설치할 수 있는 방법을 제공하며, 구성 파일을 통해 높은 유연성을 제공하므로 kubeadm을 사용하여 Kubernetes 클러스터를 설치합니다.

먼저 [kubeadm 설명서](https://kubernetes.io/docs/setup/independent/install-kubeadm)를 참조하여 Kubernetes 클러스터를 배포할 각 노드에 docker, kubeadm, kubelet 및 kubectl을 설치합니다.

docker 설치
```
apt-get update
apt-get install -y docker.io
```

Google 소스를 사용하여 kubelet, kubeadm 및 kubectl 설치
```
apt-get update && apt-get install -y apt-transport-https
curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -
cat <<EOF >/etc/apt/sources.list.d/kubernetes.list
deb http://apt.kubernetes.io/ kubernetes-xenial main
EOF
apt-get update
apt-get install -y kubelet kubeadm kubectl
```
kubeadm을 사용하여 Kubernetes 클러스터 설치

Nginmesh는 Kubernetes의 [Initializer 메커니즘](https://kubernetes.io/docs/admin/extensible-admission-controllers/#initializers)을 사용하여 사이드카 자동 주입을 구현합니다. Initializer는 현재 Kubernetes의 알파 기능이며 기본적으로 비활성화되어 있습니다. [API 서버 매개변수](https://kubernetes.io/docs/admin/extensible-admission-controllers/#enable-initializers-alpha-feature)를 통해 활성화해야 합니다. 따라서 먼저 API 서버 시작 매개변수를 구성하는 데 사용되는 kubeadm-conf 구성 파일을 만듭니다.

```
apiVersion: kubeadm.k8s.io/v1alpha1
kind: MasterConfiguration
apiServerExtraArgs:
  admission-control: Initializers,NamespaceLifecycle,LimitRanger,ServiceAccount,PersistentVolumeLabel,DefaultStorageClass,ValidatingAdmissionWebhook,ResourceQuota,DefaultTolerationSeconds,MutatingAdmissionWebhook
  runtime-config: admissionregistration.k8s.io/v1alpha1
```
kubeadm init 명령을 사용하여 Kubernetes 마스터 노드를 생성합니다.
먼저 --dry-run 매개변수를 사용하여 구성 파일을 확인해 볼 수 있습니다.
```
kubeadm init --config kubeadm-conf --dry-run
```
모든 것이 정상이면 kubeadm은 "Finished dry-running successfully. Above are the resources that would be created."라고 표시합니다.

이제 실제 생성 명령을 실행합니다.
```
kubeadm init --config kubeadm-conf
```
kubeadm은 docker 이미지를 가져오는 데 시간이 좀 걸리며, 명령이 완료되면 작업 노드를 클러스터에 조인하는 방법이 표시됩니다. 다음과 같습니다.

```
 kubeadm join --token fffbf6.13bcb3563428cf23 10.12.5.15:6443 --discovery-token-ca-cert-hash sha256:27ad08b4cd9f02e522334979deaf09e3fae80507afde63acf88892c8b72f143f
 ```
> 참고: 현재 kubeadm은 단일 노드에 마스터 설치만 지원하며, 고가용성 설치는 향후 버전에서 구현될 예정입니다. Kubernetes 공식 문서에서는 etcd 데이터를 주기적으로 백업하는 것을 권장합니다 [kubeadm limitations](https://kubernetes.io/docs/setup/independent/create-cluster-kubeadm/#limitations).

Kubeadm은 Pod에 필요한 네트워크를 설치하지 않으므로 Pod 네트워크를 수동으로 설치해야 합니다. 여기서는 Calico를 사용합니다.
```
kubectl apply -f https://docs.projectcalico.org/v2.6/getting-started/kubernetes/installation/hosted/kubeadm/1.6/calico.yaml
```

kubectl 명령을 사용하여 마스터 노드 설치 결과 확인

```
ubuntu@kube-1:~$ kubectl get all
NAME             TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
svc/kubernetes   ClusterIP   10.96.0.1    <none>        443/TCP   12m
```

각 작업 노드에서 위 kubeadm join 명령을 실행하여 작업 노드를 클러스터에 조인할 수 있습니다. kubectl 명령을 사용하여 클러스터의 노드 상태를 확인합니다.

```
 ubuntu@kube-1:~$ kubectl get nodes
NAME      STATUS    ROLES     AGE       VERSION
kube-1    Ready     master    21m       v1.9.0
kube-2    Ready     <none>    47s       v1.9.0
```

## Istio 컨트롤 플레인 및 Bookinfo 설치

[Nginmesh 문서](https://github.com/nginmesh/nginmesh)를 참조하여 Istio 컨트롤 플레인 및 Bookinfo를 설치합니다.
이 문서의 단계는 명확하므로 여기서는 자세히 설명하지 않습니다.

Nginmesh 문서에서는 Ingress의 External IP를 통해 bookinfo 애플리케이션에 액세스하는 것을 권장하지만, [Loadbalancer는 지원되는 클라우드 환경에서만 작동](https://kubernetes.io/docs/concepts/services-networking/service/#type-loadbalancer)하며 특정 구성이 필요하다는 점에 유의해야 합니다. 예를 들어, Openstack 환경에서 클러스터를 생성한 경우, [이 문서](https://docs.openstack.org/magnum/ocata/dev/kubernetes-load-balancer.html)를 참조하여 Openstack을 구성해야 Kubernetes의 Loadbalancer 서비스를 지원할 수 있습니다. 구성하지 않으면 Ingress External IP가 계속 보류 상태로 표시됩니다.

```
NAME            TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)                                                            AGE
istio-ingress   LoadBalancer   10.111.158.10   <pending>     80:32765/TCP,443:31969/TCP                                         11m
istio-mixer     ClusterIP      10.107.135.31   <none>        9091/TCP,15004/TCP,9093/TCP,9094/TCP,9102/TCP,9125/UDP,42422/TCP   11m
istio-pilot     ClusterIP      10.111.110.65   <none>        15003/TCP,443/TCP                                                  11m
```

클라우드 환경에서 Loadbalancer 기능을 구성할 수 없는 경우, 클러스터의 노드 IP:Nodeport를 사용하여 Bookinfo 애플리케이션에 직접 액세스할 수 있습니다.

```
http://10.12.5.31:32765/productpage
```
클러스터 외부에서 액세스하는 방법에 대한 자세한 내용은 [Kubernetes 클러스터 외부에서 애플리케이션에 액세스하는 방법?](http://zhaohuabing.com/2017/11/28/access-application-from-outside/)을 참조하십시오.

## 자동 주입된 사이드카 확인
kubectl get pod reviews-v3-5fff595d9b-zsb2q -o yaml 명령을 사용하여 Bookinfo 애플리케이션의 reviews 서비스 Pod를 확인합니다.

```
apiVersion: v1
kind: Pod
metadata:
  annotations:
    sidecar.istio.io/status: injected-version-0.2.12
  creationTimestamp: 2018-01-02T02:33:36Z
  generateName: reviews-v3-5fff595d9b-
  labels:
    app: reviews
    pod-template-hash: "1999151856"
    version: v3
  name: reviews-v3-5fff595d9b-zsb2q
  namespace: default
  ownerReferences:
  - apiVersion: extensions/v1beta1
    blockOwnerDeletion: true
    controller: true
    kind: ReplicaSet
    name: reviews-v3-5fff595d9b
    uid: 5599688c-ef65-11e7-8be6-fa163e160c7d
  resourceVersion: "3757"
  selfLink: /api/v1/namespaces/default/pods/reviews-v3-5fff595d9b-zsb2q
  uid: 559d8c6f-ef65-11e7-8be6-fa163e160c7d
spec:
  containers:
  - image: istio/examples-bookinfo-reviews-v3:0.2.3
    imagePullPolicy: IfNotPresent
    name: reviews
    ports:
    - containerPort: 9080
      protocol: TCP
    resources: {}
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: default-token-48vxx
      readOnly: true
  - args:
    - proxy
    - sidecar
    - -v
    - "2"
    - --configPath
    - /etc/istio/proxy
    - --binaryPath
    - /usr/local/bin/envoy
    - --serviceCluster
    - reviews
    - --drainDuration
    - 45s
    - --parentShutdownDuration
    - 1m0s
    - --discoveryAddress
    - istio-pilot.istio-system:15003
    - --discoveryRefreshDelay
    - 1s
    - --zipkinAddress
    - zipkin.istio-system:9411
    - --connectTimeout
    - 10s
    - --statsdUdpAddress
    - istio-mixer.istio-system:9125
    - --proxyAdminPort
    - "15000"
    - --controlPlaneAuthPolicy
    - NONE
    env:
    - name: POD_NAME
      valueFrom:
        fieldRef:
          apiVersion: v1
          fieldPath: metadata.name
    - name: POD_NAMESPACE
      valueFrom:
        fieldRef:
          apiVersion: v1
          fieldPath: metadata.namespace
    - name: INSTANCE_IP
      valueFrom:
        fieldRef:
          apiVersion: v1
          fieldPath: status.podIP
    image: nginmesh/proxy_debug:0.2.12
    imagePullPolicy: Always
    name: istio-proxy
    resources: {}
    securityContext:
      privileged: true
      readOnlyRootFilesystem: false
      runAsUser: 1337
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /etc/istio/proxy
      name: istio-envoy
    - mountPath: /etc/certs/
      name: istio-certs
      readOnly: true
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: default-token-48vxx
      readOnly: true
  dnsPolicy: ClusterFirst
  initContainers:
  - args:
    - -p
    - "15001"
    - -u
    - "1337"
    image: nginmesh/proxy_init:0.2.12
    imagePullPolicy: Always
    name: istio-init
    resources: {}
    securityContext:
      capabilities:
        add:
        - NET_ADMIN
      privileged: true
    terminationMessagePath: /dev/termination-log
    terminationMessagePolicy: File
    volumeMounts:
    - mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      name: default-token-48vxx
      readOnly: true
  nodeName: kube-2
  restartPolicy: Always
  schedulerName: default-scheduler
  securityContext: {}
  serviceAccount: default
  serviceAccountName: default
  terminationGracePeriodSeconds: 30
  tolerations:
  - effect: NoExecute
    key: node.kubernetes.io/not-ready
    operator: Exists
    tolerationSeconds: 300
  - effect: NoExecute
    key: node.kubernetes.io/unreachable
    operator: Exists
    tolerationSeconds: 300
  volumes:
  - emptyDir:
      medium: Memory
    name: istio-envoy
  - name: istio-certs
    secret:
      defaultMode: 420
      optional: true
      secretName: istio.default
  - name: default-token-48vxx
    secret:
      defaultMode: 420
      secretName: default-token-48vxx
status:
  conditions:
  - lastProbeTime: null
    lastTransitionTime: 2018-01-02T02:33:54Z
    status: "True"
    type: Initialized
  - lastProbeTime: null
    lastTransitionTime: 2018-01-02T02:36:06Z
    status: "True"
    type: Ready
  - lastProbeTime: null
    lastTransitionTime: 2018-01-02T02:33:36Z
    status: "True"
    type: PodScheduled
  containerStatuses:
  - containerID: docker://5d0c189b9dde8e14af4c8065ee5cf007508c0bb2b3c9535598d99dc49f531370
    image: nginmesh/proxy_debug:0.2.12
    imageID: docker-pullable://nginmesh/proxy_debug@sha256:6275934ea3a1ce5592e728717c4973ac704237b06b78966a1d50de3bc9319c71
    lastState: {}
    name: istio-proxy
    ready: true
    restartCount: 0
    state:
      running:
        startedAt: 2018-01-02T02:36:05Z
  - containerID: docker://aba3e114ac1aa87c75e969dcc1b0725696de78d3407c5341691d9db579429f28
    image: istio/examples-bookinfo-reviews-v3:0.2.3
    imageID: docker-pullable://istio/examples-bookinfo-reviews-v3@sha256:6e100e4805a8c10c47040ea7b66f10ad619c7e0068696032546ad3e35ad46570
    lastState: {}
    name: reviews
    ready: true
    restartCount: 0
    state:
      running:
        startedAt: 2018-01-02T02:35:47Z
  hostIP: 10.12.5.31
  initContainerStatuses:
  - containerID: docker://b55108625832a3205a265e8b45e5487df10276d5ae35af572ea4f30583933c1f
    image: nginmesh/proxy_init:0.2.12
    imageID: docker-pullable://nginmesh/proxy_init@sha256:f73b68839f6ac1596d6286ca498e4478b8fcfa834e4884418d23f9f625cbe5f5
    lastState: {}
    name: istio-init
    ready: true
    restartCount: 0
    state:
      terminated:
        containerID: docker://b55108625832a3205a265e8b45e5487df10276d5ae35af572ea4f30583933c1f
        exitCode: 0
        finishedAt: 2018-01-02T02:33:53Z
        reason: Completed
        startedAt: 2018-01-02T02:33:53Z
  phase: Running
  podIP: 192.168.79.138
  qosClass: BestEffort
  startTime: 2018-01-02T02:33:39Z

```

이 명령줄 출력은 상당히 길지만, Pod에 nginmesh/proxy_debug 컨테이너가 주입되었고 initContainer nginmesh/proxy_init가 추가된 것을 볼 수 있습니다. 이 두 컨테이너는 Kubernetes 이니셜라이저를 통해 Pod에 자동으로 주입됩니다. 이 두 컨테이너는 각각 어떤 역할을 할까요? [Nginmesh 소스 코드의 설명](https://github.com/nginmesh/nginmesh/tree/49cd69a61d7d330685ef39ccd63fac06421c3da2/istio/agent)을 살펴보겠습니다.

* proxy_debug: 에이전트 및 NGINX와 함께 제공됩니다.

* proxy_init: proxy_debug 이미지에서 NGINX 프록시를 애플리케이션 Pod에 투명하게 주입하기 위한 iptables 규칙을 구성하는 데 사용됩니다.

proxy_debug는 사이드카 프록시이고, proxy_init는 iptable 규칙을 구성하여 애플리케이션 트래픽을 사이드카 프록시로 라우팅하는 데 사용됩니다.

proxy_init의 Dockerfile을 보면 proxy_init가 실제로 [prepare_proxy.sh](https://github.com/nginmesh/nginmesh/blob/49cd69a61d7d330685ef39ccd63fac06421c3da2/istio/agent/docker-init/prepare_proxy.sh) 스크립트를 호출하여 iptable 규칙을 생성하는 것을 알 수 있습니다.

proxy_debug Dockerfile

```
FROM debian:stretch-slim
RUN apt-get update && apt-get install -y iptables
ADD prepare_proxy.sh /
ENTRYPOINT ["/prepare_proxy.sh"]
```

prepare_proxy.sh 발췌

```
...생략

# 인바운드 및 아웃바운드 트래픽을 공통 Envoy 포트로 리디렉션하기 위한 새 체인 생성.
iptables -t nat -N ISTIO_REDIRECT                                             -m comment --comment "istio/redirect-common-chain"
iptables -t nat -A ISTIO_REDIRECT -p tcp -j REDIRECT --to-port ${ENVOY_PORT}  -m comment --comment "istio/redirect-to-envoy-port"

# 모든 인바운드 트래픽을 Envoy로 리디렉션.
iptables -t nat -A PREROUTING -j ISTIO_REDIRECT                               -m comment --comment "istio/install-istio-prerouting"

# 아웃바운드 패킷을 Envoy로 선택적으로 리디렉션하기 위한 새 체인 생성.
iptables -t nat -N ISTIO_OUTPUT                                               -m comment --comment "istio/common-output-chain"

...생략
```

## 관련 자료

[Istio 및 Bookinfo 예제 프로그램 설치 및 사용 노트](http://zhaohuabing.com/2017/11/04/istio-install_and_example/)

## 참고 자료

* [Istio 및 NGINX를 사용한 서비스 메시](https://github.com/nginmesh/nginmesh/)

* [kubeadm을 사용하여 클러스터 생성](https://kubernetes.io/docs/setup/independent/create-cluster-kubeadm/#14-installing-kubeadm-on-your-hosts)

* [Kubernetes 참조 문서 - 동적 어드미션 컨트롤](https://kubernetes.io/docs/admin/extensible-admission-controllers/#enable-initializers-alpha-feature)
