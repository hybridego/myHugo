---
layout:     post
title:      "Istio 및 Bookinfo 예제 프로그램 설치 및 사용 후기"
subtitle:   "Istio 및 Bookinfo 예제 프로그램을 처음부터 직접 구축하는 방법"
description: "Istio는 Google, IBM, Lyft에서 개발한 서비스 메시(Service Mesh) 오픈 소스 프로젝트로, Google이 Kubernetes에 이어 내놓은 또 하나의 걸작입니다. 이 글에서는 베어 메탈에서 Istio 및 Bookinfo 예제 프로그램을 처음부터 구축하는 방법을 시연합니다."
excerpt: "Istio는 Google, IBM, Lyft에서 개발한 서비스 메시(Service Mesh) 오픈 소스 프로젝트로, Google이 Kubernetes에 이어 내놓은 또 하나의 걸작입니다. 이 글에서는 베어 메탈에서 Istio 및 Bookinfo 예제 프로그램을 처음부터 구축하는 방법을 시연합니다."
date:    2017-11-04T12:00:00
author:     "Lionel.J"
image: "/img/istio-install_and_example/post-bg.jpg"
tags:
    - Istio
URL: "/2017/11/04/istio-install_and_example/"
categories: [ Tech ]
---

## 서비스 메시 소개

**서비스 메시**(Service Mesh)는 마이크로서비스 통신 및 관리를 해결하기 위해 등장한 **아키텍처 패턴**입니다.

서비스 메시는 서비스 간 통신 및 관련 관리 제어 기능을 비즈니스 프로그램에서 인프라 계층으로 이동시켜 비즈니스 로직과 서비스 통신이라는 두 가지 관심사를 완전히 분리합니다. 서비스 메시를 채택하면 애플리케이션 개발자는 애플리케이션 비즈니스 로직에만 집중하고 구현하면 됩니다. 서비스 간 통신(서비스 검색, 통신 신뢰성, 통신 보안, 서비스 라우팅 등)은 서비스 메시 계층에서 처리하며 애플리케이션에 투명하게 제공됩니다.

<!--more-->
마이크로서비스 아키텍처의 발전 과정을 되짚어 봅시다. 서비스 메시가 등장하기 전에는 아래 그림과 같이 서비스 검색, 회로 차단, 재시도, 타임아웃 등 서비스 통신 로직을 마이크로서비스 애플리케이션 프로세스 내에서 처리했습니다.
![](/img/istio-install_and_example/5-a.png)
이 서비스 통신을 담당하는 로직을 추상화하고 일반화하여 애플리케이션이 호출할 수 있는 코드 라이브러리를 형성할 수 있습니다. 그러나 애플리케이션은 여전히 다양한 언어 코드 라이브러리의 호출 세부 사항을 처리해야 하며, 다양한 코드 라이브러리는 서로 호환되지 않아 애플리케이션이 사용하는 언어 및 코드 프레임워크에 큰 제약을 가합니다.

더 나아가, 이 로직을 애플리케이션 프로세스에서 추출하여 별도의 프로세스로 배포하고 이를 서비스 간 통신 프록시로 사용하면 아래 그림과 같습니다.
![](/img/istio-install_and_example/6-a.png)
통신 프록시 프로세스가 애플리케이션 프로세스와 함께 배포되므로, 이러한 배포 방식을 "사이드카"(오토바이의 사이드카)라고 비유적으로 부릅니다.
![](/img/istio-install_and_example/sidecar.jpg)
애플리케이션 간의 모든 트래픽은 프록시를 거쳐야 합니다. 프록시는 사이드카 방식으로 애플리케이션과 동일한 호스트에 배포되므로 애플리케이션과 프록시 간의 통신은 신뢰할 수 있는 것으로 간주됩니다. 그런 다음 프록시가 대상 서비스를 찾아 통신의 신뢰성과 보안 문제를 담당합니다.

서비스가 대량으로 배포될 때, 서비스에 배포된 사이드카 프록시 간의 연결은 아래 그림과 같은 메시를 형성하며, 이를 서비스 메시(Service Mesh)라고 부르며 다음과 같은 서비스 메시 정의를 도출합니다.

_서비스 메시는 서비스 간 통신을 처리하는 인프라 계층입니다. 클라우드 네이티브 애플리케이션은 복잡한 서비스 토폴로지를 가지며, 서비스 메시는 이러한 토폴로지에서 요청이 안정적으로 이동할 수 있도록 보장합니다. 실제 애플리케이션에서 서비스 메시는 일반적으로 애플리케이션과 함께 배포되지만 애플리케이션은 그 존재를 알 필요가 없는 일련의 경량 네트워크 프록시로 구성됩니다._

_William Morgan _[_WHAT’S A SERVICE MESH? AND WHY DO I NEED ONE?_](https://buoyant.io/2017/04/25/whats-a-service-mesh-and-why-do-i-need-one/)_

![](/img/istio-install_and_example/mesh1.png)

서비스 메시의 기본 개념을 이해했으니, 다음으로 [Istio](https://istio.io/)를 소개하겠습니다. Istio는 Google, IBM, Lyft에서 개발한 서비스 메시(Service Mesh) 오픈 소스 프로젝트로, Google이 Kubernetes에 이어 내놓은 또 하나의 걸작입니다. Istio는 아키텍처가 진보적이고 설계가 합리적이어서 발표되자마자 Linkerd, nginmesh 등 다른 서비스 메시 프로젝트의 협력과 Red Hat/Pivotal/Weaveworks/Tigera/Datawire 등의 적극적인 호응을 얻었습니다.
![](/img/istio-install_and_example/Istio-Architecture.PNG)
가까운 미래에 마이크로서비스의 표준 인프라는 서비스 배포 및 클러스터 관리를 위한 Kubernetes와 서비스 통신 및 관리를 위한 Istio를 채택할 것으로 예상됩니다. 이 둘은 상호 보완적이며 필수적입니다.

## Kubernetes 설치

Istio는 마이크로서비스 통신 및 관리의 인프라 계층이며, 서비스 배포 및 클러스터 관리를 직접 담당하지 않으므로 Kubernetes와 같은 서비스 오케스트레이션 도구와 협력해야 합니다.

Istio는 아키텍처 설계상 Kubernetes, Cloud Foundry, Mesos 등 다양한 서비스 배포 플랫폼을 지원하지만, Google의 자식인 Istio는 Kubernetes 지원을 최우선으로 고려합니다. 현재 버전 0.2 매뉴얼에는 Kubernetes 통합 설치 지침만 있으며, 다른 배포 플랫폼과 Istio의 통합은 향후 버전에서 지원될 예정입니다.

Istio 제어 평면 Pilot의 아키텍처 다이어그램에서 다양한 배포 플랫폼이 플러그인 방식으로 Istio에 통합되어 Istio에 서비스 등록 및 검색 기능을 제공할 수 있음을 알 수 있습니다.

![](/img/istio-install_and_example/PilotAdapters.PNG)

Kubernetes 클러스터 배포는 비교적 복잡하며, [Rancher](http://rancher.com)는 Kubernetes 배포 템플릿을 제공하여 원클릭 설치를 통해 Kubernetes 클러스터 설치 프로세스를 크게 단순화할 수 있습니다.

이 글의 테스트 환경은 두 대의 가상 머신으로 구성된 클러스터이며, 운영 체제는 Ubuntu 16.04.3 LTS입니다. 두 가상 머신의 주소는 다음과 같습니다.
Rancher Server: 10.12.25.60
작업 노드: 10.12.25.116

Rancher를 통해 Kubernetes 클러스터를 설치하는 간략한 단계는 다음과 같습니다.

### 서버 및 작업 노드에 Docker 설치

k8s는 최신 버전의 Docker를 지원하지 않으므로, 다음 페이지에 따라 지정된 버전의 Docker를 설치해야 합니다.
[http://rancher.com/docs/rancher/v1.6/en/hosts/](http://rancher.com/docs/rancher/v1.6/en/hosts/), 현재는 1.12 버전입니다.

```
curl https://releases.rancher.com/install-docker/1.12.sh | sh
```

비루트 사용자로 Docker 명령을 실행해야 하는 경우, [비루트 사용자로 Docker 명령을 실행하는 방법](http://zhaohuabing.com/2018/02/09/docker-without-sudo/)을 참조하십시오.

### Rancher 서버 시작

```
sudo docker run -d --restart=always -p 8080:8080 rancher/server
```

### Rancher 관리 인터페이스에 로그인하여 k8s 클러스터 생성

Rancher 관리 인터페이스의 기본 포트는 8080입니다. 브라우저에서 해당 인터페이스를 열고 메뉴 Default->Manage Environment->Add Environment를 통해 Kubernetes 클러스터를 추가합니다. 여기에 Kubernetes라는 이름과 설명을 입력하고 Kubernetes 템플릿을 선택한 다음 create를 클릭하여 Kubernetes 환경을 생성합니다.
![](/img/istio-install_and_example/Rancher.PNG)

메뉴를 클릭하여 Kubernetes Environment로 전환한 다음 오른쪽 상단의 Add a host를 클릭하여 Kubernetes 클러스터에 호스트를 추가합니다. 클러스터에 추가되는 호스트에는 요구 사항에 맞는 Docker 버전이 미리 설치되어 있어야 합니다.

그런 다음 Rancher 페이지의 지침에 따라 호스트에서 스크립트를 실행하여 Rancher 에이전트를 시작하고 호스트를 Rancher 클러스터에 추가합니다. 스크립트에 Rancher 서버 주소가 포함되어 있으므로 호스트에서 해당 주소로 ping이 가능해야 합니다.
![](/img/istio-install_and_example/Rancher-add-host.PNG)

호스트가 클러스터에 추가되면 Rancher는 호스트에 Kubernetes 이미지를 풀하고 Kubernetes 관련 서비스를 시작합니다. 설치 환경의 네트워크 상황에 따라 몇 분에서 수십 분까지 걸릴 수 있습니다.

### kubectl 설치 및 구성

Rancher 인터페이스에 Kubernetes 생성이 성공적으로 완료되었다는 메시지가 표시되면 Kubernetes 명령줄 도구인 kubectl을 설치합니다.

```
curl -LO https://storage.googleapis.com/kubernetes-release/release/v1.7.4/bin/linux/amd64/kubectl

chmod +x ./kubectl

sudo mv ./kubectl /usr/local/bin/kubectl
```

Rancher 관리 인터페이스에 로그인하여 All Environments->kubernetes->KUBERNETES->CLI create config의 내용을 ~/.kube/config에 복사하여 Kubectl과 Kubernetes 서버의 연결 정보를 구성합니다.
![](/img/istio-install_and_example/Rancher-kubectl.PNG)

## Istio 설치

Istio는 설치 스크립트를 제공하며, 이 스크립트는 운영 체제에 따라 해당 Istio 설치 패키지를 다운로드하고 현재 디렉토리에 압축을 해제합니다.

```
 curl -L https://git.io/getLatestIstio | sh -
```

스크립트의 지시에 따라 Istio 명령줄 경로를 시스템 PATH 환경 변수에 추가합니다.

```
export PATH="$PATH:/home/ubuntu/istio-0.2.10/bin"
```

Kubernetes 클러스터에 Istio 제어 평면 서비스를 배포합니다.

```
kubectl apply -f istio-0.2.10/install/kubernetes/istio.yaml
```

Istio 제어 평면 서비스가 성공적으로 배포되었는지 확인합니다. Kubernetes는 istio-system 네임스페이스를 생성하고 Istio 관련 서비스를 해당 네임스페이스에 배포합니다.

Istio 관련 서비스의 배포 상태를 확인합니다.

```
kubectl get svc -n istio-system
```

```
NAME            CLUSTER-IP      EXTERNAL-IP        PORT(S)                                                  AGE
istio-egress    10.43.192.74    <none>             80/TCP                                                   25s
istio-ingress   10.43.16.24     10.12.25.116,...   80:30984/TCP,443:30254/TCP                               25s
istio-mixer     10.43.215.250   <none>             9091/TCP,9093/TCP,9094/TCP,9102/TCP,9125/UDP,42422/TCP   26s
istio-pilot     10.43.211.140   <none>             8080/TCP,443/TCP                                         25s
```

Istio 관련 Pod의 배포 상태를 확인합니다.

```
kubectl get pods -n istio-system
```

```
NAME                             READY     STATUS    RESTARTS   AGE
istio-ca-367485603-qvbfl         1/1       Running   0          2m
istio-egress-3571786535-gwbgk    1/1       Running   0          2m
istio-ingress-2270755287-phwvq   1/1       Running   0          2m
istio-mixer-1505455116-9hmcw     2/2       Running   0          2m
istio-pilot-2278433625-68l34     1/1       Running   0          2m
```

위 출력에서 볼 수 있듯이, 여기에 배포된 것은 주로 Istio 제어 평면 서비스이며, 데이터 평면 네트워크 프록시는 어떻게 배포될까요?
앞서 서비스 메시 아키텍처 소개에서 알 수 있듯이, 네트워크 프록시는 애플리케이션과 함께 사이드카 방식으로 배포됩니다. 아래 Bookinfo 예제 프로그램 배포 시 네트워크 프록시 배포 방법을 시연합니다.

## Bookinfo 예제 프로그램 배포

다운로드한 Istio 설치 패키지의 samples 디렉토리에는 예제 애플리케이션이 포함되어 있습니다.

다음 명령을 통해 Bookinfo 애플리케이션을 배포합니다.

```
kubectl apply -f <(istioctl kube-inject -f istio-0.2.10/samples/bookinfo/kube/bookinfo.yaml)
```

Bookinfo 서비스가 시작되었는지 확인합니다.

```
kubectl get services
```

```
NAME          CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
details       10.43.175.204   <none>        9080/TCP   6m
kubernetes    10.43.0.1       <none>        443/TCP    5d
productpage   10.43.19.154    <none>        9080/TCP   6m
ratings       10.43.50.160    <none>        9080/TCP   6m
reviews       10.43.219.248   <none>        9080/TCP   6m
```

브라우저에서 애플리케이션 페이지를 엽니다. 주소는 istio-ingress의 외부 IP입니다.

`http://10.12.25.116/productpage`
![](/img/istio-install_and_example/Bookinfo.PNG)

## Istio Proxy 구현 원리 이해

서비스 메시는 스프링 클라우드와 같은 마이크로서비스 코드 라이브러리에 비해 애플리케이션에 침투하지 않고 애플리케이션 코드 수정 없이 애플리케이션 서비스 간 통신을 가로챌 수 있다는 큰 장점이 있습니다. Istio는 어떻게 이를 달성할까요? 아래에서는 예제 프로그램 배포를 통해 그 원리를 분석합니다.

Kubernetes 애플리케이션 배포 프로세스에 익숙하다면 Bookinfo 애플리케이션의 표준 배포 방식이 다음과 같다는 것을 알 것입니다.

```
kubectl apply -f istio-0.2.10/samples/bookinfo/kube/bookinfo.yaml
```

그러나 위 배포 과정에서 볼 수 있듯이, kubectl apply 명령의 입력은 Kubernetes YAML 파일이 아니라 `istioctl kube-inject -f istio-0.2.10/samples/bookinfo/kube/bookinfo.yaml` 명령의 출력입니다.

이 명령은 여기서 어떤 역할을 할까요? 이 명령을 단독으로 실행하고 출력을 파일에 저장하여 istioctl kube-inject 명령이 실제로 어떤 작업을 수행하는지 확인할 수 있습니다.

```
istioctl kube-inject -f istio-0.2.10/samples/bookinfo/kube/bookinfo.yaml >> bookinfo_with_sidecar.yaml
```

bookinfo/_with/_sidecar.yaml 파일과 bookinfo.yaml을 비교하면, 이 명령이 bookinfo.yaml을 기반으로 다음과 같은 변경 사항을 적용했음을 알 수 있습니다.

* 각 Pod에 프록시 컨테이너를 추가했습니다. 이 컨테이너는 서비스 검색, 라우팅 규칙 처리 등 애플리케이션 컨테이너 간 통신을 처리하는 데 사용됩니다. 아래 구성 파일에서 프록시 컨테이너가 15001 포트에서 수신 대기하며 애플리케이션 컨테이너의 트래픽을 수신하는 것을 볼 수 있습니다.

* 각 Pod에 init-컨테이너를 추가했습니다. 이 컨테이너는 iptable을 구성하여 애플리케이션 컨테이너의 트래픽을 프록시 컨테이너로 리디렉션하는 데 사용됩니다.

```
  # Istio 네트워크 프록시 주입
  image: docker.io/istio/proxy_debug:0.2.10
        imagePullPolicy: IfNotPresent
        name: istio-proxy
        resources: {}
        securityContext:
          privileged: true
          readOnlyRootFilesystem: false
          runAsUser: 1337
        volumeMounts:
        - mountPath: /etc/istio/proxy
          name: istio-envoy
        - mountPath: /etc/certs/
          name: istio-certs
          readOnly: true
      # init 컨테이너를 사용하여 iptable 수정
      initContainers:
      - args:
        - -p
        - "15001"
        - -u
        - "1337"
        image: docker.io/istio/proxy_init:0.2.10
        imagePullPolicy: IfNotPresent
        name: istio-init
```

위 분석을 통해 Istio의 kube-inject 도구는 Bookinfo의 Kubernetes YAML 배포 파일에 프록시 사이드카를 주입하는 데 사용된다는 것을 알 수 있습니다. 이 방식을 통해 사용자가 Kubernetes 배포 파일을 수동으로 수정할 필요 없이 서비스를 배포할 때 사이드카와 애플리케이션을 함께 배포할 수 있습니다.

명령을 통해 Pod에 배포된 Docker 컨테이너를 확인하여 Istio 프록시가 배포되었는지 확인합니다.

```
kubectl get pods

NAME                              READY     STATUS    RESTARTS   AGE
details-v1-3688945616-8hv8x       2/2       Running   0          1d
productpage-v1-2055622944-cslw1   2/2       Running   0          1d
ratings-v1-233971408-8dcnp        2/2       Running   0          1d
reviews-v1-1360980140-474x6       2/2       Running   0          1d
reviews-v2-1193607610-cfhb5       2/2       Running   0          1d
reviews-v3-3340858212-b5c8k       2/2       Running   0          1d
```

reviews Pod의 컨테이너를 확인하면 Pod에 reviews 컨테이너 외에 istio-proxy 컨테이너도 배포된 것을 볼 수 있습니다.

```
kubectl get pod reviews-v3-3340858212-b5c8k -o jsonpath='{.spec.containers[*].name}'

reviews istio-proxy
```

그렇다면 애플리케이션 컨테이너의 트래픽은 어떻게 istio-proxy로 리디렉션될까요?

원리는 Istio 프록시가 15001 포트에서 수신 대기하고, Pod 내 애플리케이션 컨테이너의 트래픽은 iptables 규칙을 통해 15001 포트로 리디렉션됩니다. 이제 Pod 내부로 들어가 관련 명령을 통해 이를 확인해 보겠습니다.

먼저 명령줄을 통해 ratings-v1-233971408-8dcnp Pod의 PID를 찾아 해당 네트워크 네임스페이스 내의 iptables 규칙을 확인하는 데 사용합니다.

```
CONTAINER_ID=$(kubectl get po ratings-v1-233971408-8dcnp -o jsonpath='{.status.containerStatuses[0].containerID}' | cut -c 10-21)

PID=$(sudo docker inspect --format '{{ .State.Pid }}' $CONTAINER_ID)
```

nsenter 명령을 사용하여 Pod의 네트워크 네임스페이스에 들어가 명령을 실행할 수 있습니다.
netstat 명령을 사용하면 istio 프록시가 수신 대기하는 포트 15001을 볼 수 있습니다.

```
sudo nsenter -t ${PID} -n netstat -all | grep 15001

tcp        0      0 *:15001                 *:*                     LISTEN
```

iptables 명령을 사용하면 다음 규칙을 확인할 수 있습니다.

```
sudo nsenter -t ${PID} -n iptables -t nat -L -n -v

Chain PREROUTING (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination
   16   960 ISTIO_REDIRECT  all  --  *      *       0.0.0.0/0            0.0.0.0/0            /* istio/install-istio-prerouting */

Chain INPUT (policy ACCEPT 16 packets, 960 bytes)
 pkts bytes target     prot opt in     out     source               destination

Chain OUTPUT (policy ACCEPT 84838 packets, 7963K bytes)
 pkts bytes target     prot opt in     out     source               destination
 1969  118K ISTIO_OUTPUT  tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            /* istio/install-istio-output */

Chain POSTROUTING (policy ACCEPT 84838 packets, 7963K bytes)
 pkts bytes target     prot opt in     out     source               destination

Chain ISTIO_OUTPUT (1 references)
 pkts bytes target     prot opt in     out     source               destination
    0     0 ISTIO_REDIRECT  all  --  *      lo      0.0.0.0/0           !127.0.0.1            /* istio/bypass-envoy */
 1969  118K RETURN     all  --  *      *       0.0.0.0/0            0.0.0.0/0            owner UID match 1337 /* istio/bypass-envoy */
    0     0 RETURN     all  --  *      *       0.0.0.0/0            127.0.0.1            /* istio/bypass-explicit-loopback */
    0     0 ISTIO_REDIRECT  all  --  *      *       0.0.0.0/0            0.0.0.0/0            /* istio/redirect-default-outbound */

Chain ISTIO_REDIRECT (3 references)
 pkts bytes target     prot opt in     out     source               destination
   16   960 REDIRECT   tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            /* istio/redirect-to-envoy-port */ redir ports 15001
```

Pod가 위치한 네트워크 네임스페이스의 iptables 규칙에서 Pod의 인바운드 및 아웃바운드 트래픽이 각각 PREROUTING 및 OUTPUT 체인을 통해 사용자 정의 ISTIO_REDIRECT 체인을 가리키고 있으며, ISTIO_REDIRECT 체인의 규칙은 모든 트래픽을 istio 프록시가 수신 대기하는 15001 포트로 리디렉션하는 것을 볼 수 있습니다. 이를 통해 애플리케이션에 투명한 통신 프록시가 구현됩니다.

## 라우팅 규칙 테스트

Bookinfo 애플리케이션의 productpage 페이지를 여러 번 새로 고치면, 페이지에 표시되는 Book Reviews가 때로는 빨간 별표가 있는 평가 정보, 때로는 검은 별표가 있는 평가 정보, 때로는 텍스트 평가 정보만 표시되는 것을 발견할 수 있습니다.
이는 Bookinfo 애플리케이션이 3가지 버전의 Reviews 서비스를 배포했으며, 각 버전의 반환 결과가 다르기 때문입니다. 라우팅 규칙이 설정되지 않은 경우, 기본 라우팅은 요청을 각 버전의 서비스로 무작위로 라우팅합니다. 아래 그림과 같습니다.

![](/img/istio-install_and_example/withistio.svg)

route-rule.yaml 라우팅 규칙을 생성하여 모든 요청 트래픽을 Reviews-v1 서비스로 유도합니다.

```
apiVersion: config.istio.io/v1alpha2
kind: RouteRule
metadata:
  name: reviews-default
spec:
  destination:
    name: reviews
  precedence: 1
  route:
  - labels:
      version: v1
```

이 라우팅 규칙을 활성화합니다.

```
istioctl create -f route-rule.yaml -n default
```

productpage 페이지를 다시 열면, 아무리 새로 고쳐도 표시되는 페이지는 항상 v1 버전의 출력, 즉 별표 없는 평가 내용이 됩니다.
![](/img/istio-install_and_example/Bookinfo-no-star.PNG)
이 라우팅 규칙을 삭제합니다.

```
istioctl delete -f route_rule.yaml -n default
```

productpage 페이지를 계속 새로 고치면, 세 가지 버전의 평가 내용 페이지가 다시 무작위로 나타납니다.

## 분산 호출 추적

먼저 설치 패키지의 `istio-0.2.10/install/kubernetes/addons/zipkin.yaml` 배포 파일을 수정하여 Nodeport를 추가하여 Kubernetes 클러스터 외부에서 Zipkin 인터페이스에 접근할 수 있도록 합니다.

```
apiVersion: v1
kind: Service
metadata:
  name: zipkin
  namespace: istio-system
spec:
  ports:
  - name: http
    port: 9411
    nodePort: 30001
  selector:
    app: zipkin
  type: NodePort
```

Zipkin 서비스를 배포합니다.

```
kubectl apply -f istio-0.2.10/install/kubernetes/addons/zipkin.yaml
```

브라우저에서 Zipkin 페이지를 열면, 엔드투엔드 호출이 어떤 서비스를 거쳤는지, 각 서비스가 소요한 시간 등 자세한 정보를 추적할 수 있습니다. 아래 그림과 같습니다.
`http://10.12.25.116:30001`
![](/img/istio-install_and_example/zipkin.PNG)

## 성능 지표 모니터링

먼저 설치 패키지의 `istio-0.2.10/install/kubernetes/addons/grafana.yaml` 배포 파일을 수정하여 Nodeport를 추가하여 Kubernetes 클러스터 외부에서 Grafana 인터페이스에 접근할 수 있도록 합니다.

```
apiVersion: v1
kind: Service
metadata:
  name: grafana
  namespace: istio-system
spec:
  ports:
  - port: 3000
    protocol: TCP
    name: http
    nodePort: 30002
  selector:
    app: grafana
  type: NodePort
```

Prometheus는 정보 지표를 수집하고 저장하는 데 사용되며, Grafana는 성능 지표 정보를 시각적으로 표현하는 데 사용되므로 Prometheus와 Grafana 서비스를 동시에 배포해야 합니다.

```
kubectl apply -f istio-0.2.10/install/kubernetes/addons/prometheus.yaml

kubectl apply -f istio-0.2.10/install/kubernetes/addons/grafana.yaml
```

먼저 브라우저에서 Bookinfo 페이지 `http://10.12.25.116/productpage`를 열고 몇 번 새로 고쳐 성능 지표 데이터를 생성합니다.

그런 다음 Grafana 페이지 `http://10.12.25.116:30002/dashboard/db/istio-dashboard`를 열어 성능 지표를 확인합니다. 아래 그림과 같습니다.
![](/img/istio-install_and_example/grafana.PNG)

## 참고

* [Istio 공식 문서](https://istio.io/docs/)
* [Pattern: Service Mesh](http://philcalcado.com/2017/08/03/pattern_service_mesh.html)
* [WHAT’S A SERVICE MESH? AND WHY DO I NEED ONE?](https://buoyant.io/2017/04/25/whats-a-service-mesh-and-why-do-i-need-one/)
* [A Hacker’s Guide to Kubernetes Networking](https://thenewstack.io/hackers-guide-kubernetes-networking/)
