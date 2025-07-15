---
layout:     post 
title:      "Kubernetes 클러스터 외부에서 애플리케이션에 접근하는 방법은 무엇인가요?"
subtitle:   ""
description: "Kubernetes의 클러스터 네트워크는 사설 네트워크에 속하며, 배포된 애플리케이션은 클러스터 네트워크 내부에서만 접근할 수 있다는 것을 알고 있습니다. 그렇다면 Kubernetes 클러스터의 애플리케이션을 외부 네트워크에 노출하여 외부 사용자에게 서비스를 제공하는 방법은 무엇일까요? 이 글에서는 외부 네트워크에서 Kubernetes 클러스터의 애플리케이션에 접근하는 몇 가지 구현 방식을 탐구합니다."
date:       2017-11-28 12:00:00
author:     "Lionel.J"
publishDate: 2017-11-28 12:00:00
tags:
    - Kubernetes
URL: "/2017/11/28/access-application-from-outside/"
categories: [ Tech ]
---

## 서론

Kubernetes의 클러스터 네트워크는 사설 네트워크에 속하며, 배포된 애플리케이션은 클러스터 네트워크 내부에서만 접근할 수 있다는 것을 알고 있습니다. 그렇다면 Kubernetes 클러스터의 애플리케이션을 외부 네트워크에 노출하여 외부 사용자에게 서비스를 제공하는 방법은 무엇일까요? 이 글에서는 외부 네트워크에서 Kubernetes 클러스터의 애플리케이션에 접근하는 몇 가지 구현 방식을 탐구합니다.
<!--more-->
> 이 글은 최대한 이해하기 쉽게 쓰려고 노력했지만, 복잡한 내용을 쉽고 명확하게 설명하는 것은 매우 어려운 일이며, 개인적으로 아직 그 경지에 도달하지 못했음을 인정합니다. 끊임없이 노력할 뿐입니다. 또한, Kubernetes 자체는 비교적 복잡한 시스템이므로, 이 글에서 관련된 모든 개념을 자세히 설명할 수는 없습니다. 그렇게 하면 글의 주제에서 벗어날 수 있으므로, 독자들이 이 글을 읽기 전에 Docker, Container, Pod와 같은 Kubernetes의 기본 개념을 이미 이해하고 있다고 가정합니다.

또한, 이 글의 일부 내용은 개인적인 이해를 바탕으로 작성되었으며, 지식의 한계로 인해 오류가 있을 수 있습니다. 독자 여러분께서 글의 내용에 의문이 있거나 수정할 부분이 있다면 언제든지 지적해 주시면 감사하겠습니다.

## Pod와 Service

먼저 Kubernetes의 Pod와 Service 개념에 대해 알아보겠습니다.

Pod(컨테이너 그룹)는 영어로 '콩깍지'를 의미하며, 이름의 의미에서 알 수 있듯이 Pod는 의존 관계가 있는 컨테이너 그룹입니다. Pod에 포함된 컨테이너는 모두 동일한 호스트 노드에서 실행되며, 동일한 볼륨과 네트워크 네임스페이스 공간을 공유합니다. Kubernetes는 Pod를 기본 운영 단위로 사용하며, 장애 조치 또는 로드 밸런싱을 위해 여러 개의 동일한 Pod를 동시에 시작할 수 있습니다.

![Pod](/img/access-application-from-outside/pod.PNG)

Pod의 수명 주기는 짧습니다. Kubernetes는 애플리케이션 구성에 따라 Pod를 생성, 파괴하고, 모니터링 지표에 따라 스케일 인/아웃을 수행합니다. Kubernetes는 Pod를 생성할 때 클러스터 내의 어떤 유휴 호스트든 선택할 수 있으므로, 네트워크 주소가 고정되어 있지 않습니다. 이러한 Pod의 특성 때문에 일반적으로 Pod의 주소를 직접 사용하여 애플리케이션에 접근하는 것은 권장되지 않습니다.

Pod에 직접 접근하기 어려운 문제를 해결하기 위해 Kubernetes는 Service 개념을 채택했습니다. Service는 백엔드에 서비스를 제공하는 Pod 그룹의 추상화입니다. Service는 고정된 가상 IP에 바인딩되며, 이 가상 IP는 Kubernetes 클러스터 내에서만 볼 수 있습니다. 그러나 이 IP는 실제 가상 또는 물리적 장치에 해당하지 않고, 단지 IPtable의 규칙일 뿐이며, 이 IPtable을 통해 서비스 요청이 백엔드 Pod로 라우팅됩니다. 이러한 방식을 통해 서비스 소비자는 Pod가 제공하는 서비스에 안정적으로 접근할 수 있으며, Pod의 생성, 삭제, 마이그레이션과 같은 변화나 Pod 그룹을 사용하여 로드 밸런싱하는 방법에 대해 걱정할 필요가 없습니다.

Service의 메커니즘은 아래 그림과 같습니다. Kube-proxy는 Kubernetes 마스터의 Service 및 Endpoint 추가/삭제 메시지를 수신하며, 각 Service에 대해 kube-proxy는 해당 iptables 규칙을 생성하여 Service Cluster IP로 전송되는 트래픽을 Service 백엔드 Pod의 해당 포트로 전달합니다.
![Pod와 Service의 관계](/img/access-application-from-outside/services-iptables-overview.png)

> 참고: Service의 Cluster IP와 서비스 포트를 통해 백엔드 Pod가 제공하는 서비스에 접근할 수 있지만, 해당 Cluster IP는 Ping할 수 없습니다. 그 이유는 Cluster IP가 iptable의 규칙일 뿐 네트워크 장치에 해당하지 않기 때문입니다.

## Service의 유형
Service의 유형(ServiceType)은 Service가 외부로 서비스를 제공하는 방식을 결정합니다. 유형에 따라 서비스는 Kubernetes 클러스터 내에서만 보이거나 클러스터 외부로 노출될 수 있습니다. Service에는 ClusterIP, NodePort, LoadBalancer의 세 가지 유형이 있습니다. 이 중 ClusterIP는 Service의 기본 유형이며, 이 유형의 서비스는 클러스터 내에서만 접근할 수 있는 가상 IP를 제공하며, 그 구현 메커니즘은 이전 섹션에서 설명했습니다.

## NodePort를 통한 외부 접근 지점 제공

Service의 유형을 NodePort로 설정하면 클러스터 내의 호스트에서 지정된 포트를 통해 서비스를 노출할 수 있습니다. 클러스터 내의 각 호스트에 있는 해당 지정된 포트를 통해 서비스에 접근할 수 있으며, 해당 호스트 포트로 전송된 요청은 Kubernetes에 의해 서비스를 제공하는 Pod로 라우팅됩니다. 이 서비스 유형을 사용하면 Kubernetes 클러스터 네트워크 외부에서 호스트 IP:포트 방식으로 서비스에 접근할 수 있습니다.

> 참고: 공식 문서에서는 Kubernetes ClusterIP 트래픽이 백엔드 Pod로 전달되는 방식에 Iptable과 kube-proxy 두 가지 방식이 있다고 설명하지만, NodePort가 트래픽을 어떻게 전달하는지에 대해서는 명확하지 않습니다. 이 그림은 네트워크에서 가져온 것으로, 그림상으로는 kube-proxy를 통해 전달되는 것으로 보입니다. 저는 소스 코드를 연구해 본 적이 없습니다. 아시는 분은 댓글로 설명해 주시면 감사하겠습니다.

![Pod와 Service의 관계](/img/access-application-from-outside/nodeport.PNG)

다음은 NodePort를 통해 서비스를 외부로 노출하는 예시입니다. nodePort를 지정할 수도 있고 지정하지 않을 수도 있습니다. 지정하지 않으면 Kubernetes가 사용 가능한 포트 범위에서 무작위 포트를 자동으로 할당합니다.

```
kind: Service
apiVersion: v1
metadata:
  name: influxdb
spec:
  type: NodePort
  ports:
    - port: 8086
      nodePort: 30000
  selector:
    name: influxdb
```

NodePort를 통한 외부 접근에는 다음과 같은 몇 가지 문제가 있습니다. 개인적인 용도나 테스트 시에는 이 방식을 사용할 수 있지만, 프로덕션 환경에는 적합하지 않습니다.

* Kubernetes 클러스터 호스트의 IP는 잘 알려진 IP여야 합니다. 즉, 클라이언트가 해당 IP를 알아야 합니다. 그러나 클러스터의 호스트는 리소스 풀로 간주되며, 추가 및 삭제가 가능하고, 각 호스트의 IP는 일반적으로 동적으로 할당되므로, 호스트 IP가 클라이언트에게 잘 알려진 IP라고 볼 수 없습니다.

* 클라이언트가 특정 고정 호스트 IP에 접근하는 경우 단일 장애 지점이 발생합니다. 만약 호스트 한 대가 다운되면 Kubernetes 클러스터는 애플리케이션을 다른 노드로 다시 로드하지만, 클라이언트는 해당 호스트의 NodePort를 통해 애플리케이션에 접근할 수 없게 됩니다.

* 이 방식은 클라이언트가 Kubernetes 호스트가 위치한 네트워크에 접근할 수 있다고 가정합니다. 프로덕션 환경에서는 클라이언트와 Kubernetes 호스트 네트워크가 격리될 수 있습니다. 예를 들어, 클라이언트가 공용 네트워크의 모바일 앱일 경우, 호스트가 위치한 사설 네트워크에 직접 접근할 수 없습니다.

따라서 외부 클라이언트의 요청을 클러스터 내의 애플리케이션으로 가져오기 위해 게이트웨이가 필요하며, Kubernetes에서는 이 게이트웨이가 4계층 로드 밸런서입니다.

## Load Balancer를 통한 외부 접근 지점 제공

Service의 유형을 LoadBalancer로 설정하면 Service에 외부 Load Balancer를 생성할 수 있습니다. Kubernetes 문서에서는 이 Service 유형이 클라우드 서비스 제공업체의 지원을 필요로 한다고 명시하고 있습니다. 사실 여기서는 Kubernetes 구성 파일에서 해당 Service에 Load Balancer를 생성하라는 요구 사항을 제시할 뿐이며, 생성 방법은 Google Cloud 또는 Amazon Cloud와 같은 클라우드 서비스 제공업체에서 제공하며, 생성된 Load Balancer는 Kubernetes 클러스터의 관리 범위에 속하지 않습니다. Kubernetes 1.6 버전에서는 AWS, Azure, CloudStack, GCE 및 OpenStack과 같은 클라우드 제공업체가 Kubernetes에 Load Balancer를 제공할 수 있습니다. 다음은 Load Balancer 유형 Service의 예시입니다.

```
kind: Service
apiVersion: v1
metadata:
  name: influxdb
spec:
  type: LoadBalancer
  ports:
    - port: 8086
  selector:
    name: influxdb
```
이 Service를 배포한 후 Kubernetes가 생성한 내용을 살펴보겠습니다.
```
$ kubectl get svc influxdb
NAME       CLUSTER-IP     EXTERNAL-IP     PORT(S)          AGE
influxdb   10.97.121.42   10.13.242.236   8086:30051/TCP   39s
```
Kubernetes는 먼저 influxdb에 클러스터 내부에서 접근할 수 있는 ClusterIP 10.97.121.42를 생성했습니다. nodeport 포트를 지정하지 않았기 때문에 Kubernetes는 사용 가능한 30051 호스트 포트를 선택하여 서비스를 호스트 네트워크에 노출한 다음, 클라우드 제공업체에 로드 밸런서를 생성하도록 알렸습니다. 위 출력의 EXTERNAL-IP가 로드 밸런서의 IP입니다.

테스트에 사용된 클라우드 제공업체는 OpenStack입니다. `neutron lb-vip-show` 명령을 통해 생성된 Load Balancer의 상세 정보를 확인할 수 있습니다.

```
$ neutron lb-vip-show 9bf2a580-2ba4-4494-93fd-9b6969c55ac3
+---------------------+--------------------------------------------------------------+
| Field               | Value                                                        |
+---------------------+--------------------------------------------------------------+
| address             | 10.13.242.236                                                |
| admin_state_up      | True                                                         |
| connection_limit    | -1                                                           |
| description         | Kubernetes external service a6ffa4dadf99711e68ea2fa163e0b082 |
| id                  | 9bf2a580-2ba4-4494-93fd-9b6969c55ac3                         |
| name                | a6ffa4dadf99711e68ea2fa163e0b082                             |
| pool_id             | 392917a6-ed61-4924-acb2-026cd4181755                         |
| port_id             | e450b80b-6da1-4b31-a008-280abdc6400b                         |
| protocol            | TCP                                                          |
| protocol_port       | 8086                                                         |
| session_persistence |                                                              |
| status              | ACTIVE                                                       |
| status_description  |                                                              |
| subnet_id           | 73f8eb91-90cf-42f4-85d0-dcff44077313                         |
| tenant_id           | 4d68886fea6e45b0bc2e05cd302cccb9                             |
+---------------------+--------------------------------------------------------------+

$ neutron lb-pool-show 392917a6-ed61-4924-acb2-026cd4181755
+------------------------+--------------------------------------+
| Field                  | Value                                |
+------------------------+--------------------------------------+
| admin_state_up         | True                                 |
| description            |                                      |
| health_monitors        |                                      |
| health_monitors_status |                                      |
| id                     | 392917a6-ed61-4924-acb2-026cd4181755 |
| lb_method              | ROUND_ROBIN                          |
| members                | d0825cc2-46a3-43bd-af82-e9d8f1f85299 |
|                        | 3f73d3bb-bc40-478d-8d0e-df05cdfb9734 |
| name                   | a6ffa4dadf99711e68ea2fa163e0b082     |
| protocol               | TCP                                  |
| provider               | haproxy                              |
| status                 | ACTIVE                               |
| status_description     |                                      |
| subnet_id              | 73f8eb91-90cf-42f4-85d0-dcff44077313 |
| tenant_id              | 4d68886fea6e45b0bc2e05cd302cccb9     |
| vip_id                 | 9bf2a580-2ba4-4494-93fd-9b6969c55ac3 |
+------------------------+--------------------------------------+

$ neutron lb-member-list
+--------------------------------------+--------------+---------------+--------+----------------+--------+
| id                                   | address      | protocol_port | weight | admin_state_up | status |
+--------------------------------------+--------------+---------------+--------+----------------+--------+
| 3f73d3bb-bc40-478d-8d0e-df05cdfb9734 | 10.13.241.89 |         30051 |      1 | True           | ACTIVE |
| d0825cc2-46a3-43bd-af82-e9d8f1f85299 | 10.13.241.10 |         30051 |      1 | True           | ACTIVE |
+--------------------------------------+--------------+---------------+--------+----------------+--------
```
OpenStack이 VIP 10.13.242.236을 사용하여 포트 8086에 로드 밸런서를 생성했으며, 로드 밸런서에 해당하는 Lb 풀에는 두 개의 멤버 10.13.241.89와 10.13.241.10이 있음을 확인할 수 있습니다. 이들은 정확히 Kubernetes 호스트 노드이며, 로드 밸런서 트래픽은 이 두 노드의 해당 서비스 Nodeport 30051로 분산됩니다.

그러나 클라이언트가 Openstack Neutron의 사설 서브넷에 있지 않은 경우, 외부 클라이언트가 로드 밸런서에 연결할 수 있도록 로드 밸런서의 VIP에 플로팅 IP를 연결해야 합니다.

로드 밸런서 배포 후 애플리케이션의 토폴로지 구조는 아래 그림과 같습니다 (참고: 이 그림은 Kubernetes 클러스터가 Openstack 사설 클라우드에 배포되었다고 가정합니다).
![외부 Load balancer](/img/access-application-from-outside/load-balancer.PNG)

> 참고: Kubernetes 환경이 Public Cloud에 있다면, Loadbalancer 유형의 Service가 생성하는 외부 Load Balancer는 이미 공용 IP 주소를 가지고 있어 외부 네트워크에서 직접 접근할 수 있으며, floating IP를 바인딩할 필요가 없습니다. 예를 들어 AWS에서 생성된 Elastic Load Balancing (ELB)에 대한 자세한 내용은 다음 글을 참조하십시오: [Expose Services on your AWS Quick Start Kubernetes cluster]( http://docs.heptio.com/content/tutorials/aws-qs-services-elb.html).

Kubernetes 클러스터가 LoadBalancer 기능을 지원하지 않는 클라우드 제공업체 또는 베어 메탈에 생성된 경우에도 LoadBalancer 유형의 Service를 구현할 수 있을까요? 가능합니다. Kubernetes 자체는 LoadBalancer를 직접 지원하지 않지만, Kubernetes를 확장하여 구현할 수 있습니다. Kubernetes Master의 서비스 생성 메시지를 수신하고, 메시지에 따라 해당 Load Balancer(예: Nginx 또는 HAProxy)를 배포하여 Load Balancer 유형의 Service를 구현할 수 있습니다.

Service 유형을 설정하여 제공되는 것은 4계층 로드 밸런서입니다. 하나의 서비스만 외부로 노출해야 할 때는 이 방식을 직접 사용할 수 있습니다. 그러나 하나의 애플리케이션이 여러 서비스를 외부로 제공해야 할 때는 이 방식을 사용하면 각 서비스(IP+Port)마다 외부 로드 밸런서가 생성됩니다. 아래 그림과 같습니다.
![여러 Load balancer를 생성하여 애플리케이션의 여러 서비스를 노출](/img/access-application-from-outside/multiple-load-balancer.PNG)
일반적으로 동일한 애플리케이션의 여러 서비스/리소스는 동일한 도메인 아래에 배치됩니다. 이 경우 여러 로드 밸런서를 생성하는 것은 전혀 불필요하며, 오히려 추가적인 오버헤드와 관리 비용을 초래합니다. 서비스를 외부 사용자에게 직접 노출하는 것은 프론트엔드와 백엔드의 결합을 초래하여 백엔드 아키텍처의 유연성에 영향을 미치며, 향후 비즈니스 요구 사항에 따라 서비스를 조정할 경우 클라이언트에 직접적인 영향을 미칠 수 있습니다. 이 문제는 Kubernetes Ingress를 사용하여 L7 로드 밸런싱을 통해 해결할 수 있습니다.

## Ingress를 7계층 로드 밸런서로 사용

먼저 Ingress를 도입한 후의 애플리케이션 토폴로지 다이어그램을 살펴보겠습니다 (참고: 이 그림은 Kubernetes 클러스터가 Openstack 사설 클라우드에 배포되었다고 가정합니다).
![Ingress를 사용하여 애플리케이션의 여러 서비스를 노출](/img/access-application-from-outside/ingress.PNG)
여기서 Ingress는 7계층 로드 밸런서 및 HTTP 역방향 프록시 역할을 하며, 다양한 URL에 따라 들어오는 트래픽을 다양한 백엔드 서비스로 분산할 수 있습니다. 외부 클라이언트는 foo.bar.com 서버만 보게 되며, 내부의 여러 서비스 구현 방식은 숨겨집니다. 이 방식을 사용하면 클라이언트 접근이 단순화되고 백엔드 구현 및 배포의 유연성이 향상되어 클라이언트에 영향을 주지 않고 백엔드 서비스 배포를 조정할 수 있습니다.

다음은 Kubernetes Ingress 구성 파일의 예시입니다. 가상 호스트 foot.bar.com 아래에 두 개의 Path가 정의되어 있으며, /foo는 백엔드 서비스 s1으로, /bar는 백엔드 서비스 s2로 분산됩니다.

```
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: test
  annotations:
    ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: foo.bar.com
    http:
      paths:
      - path: /foo
        backend:
          serviceName: s1
          servicePort: 80
      - path: /bar
        backend:
          serviceName: s2
          servicePort: 80
```

여기서 Ingress는 가상 호스트 경로 분배 요구 사항만 설명하며, 여러 Ingress를 정의하여 다른 7계층 분배 요구 사항을 설명할 수 있습니다. 이러한 요구 사항은 Ingress Controller에 의해 구현되어야 합니다. Ingress Controller는 Kubernetes Master에서 Ingress 정의를 수신하고, Ingress 정의에 따라 7계층 프록시를 구성하여 Ingress 정의에서 요구하는 가상 호스트 및 경로 분배 규칙을 구현합니다. Ingress Controller에는 여러 구현체가 있으며, Kubernetes는 [Nginx 기반 Ingress Controller](https://github.com/kubernetes/ingress-nginx)를 제공합니다. Kubernetes 클러스터를 배포할 때 Ingress Controller가 기본적으로 배포되지 않으므로 직접 배포해야 한다는 점에 유의해야 합니다.

다음은 Nginx Ingress Controller 배포 구성 파일의 예시입니다. 여기서 Nginx Ingress Controller에 LoadBalancer 유형의 Service를 정의하여 Ingress Controller에 외부에서 접근 가능한 공용 IP를 제공합니다.

```
apiVersion: v1
kind: Service
metadata:
  name: nginx-ingress
spec:
  type: LoadBalancer
  ports:
    - port: 80
      name: http
    - port: 443
      name: https
  selector:
    k8s-app: nginx-ingress-lb
---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: nginx-ingress-controller
spec:
  replicas: 2
  revisionHistoryLimit: 3
  template:
    metadata:
      labels:
        k8s-app: nginx-ingress-lb
    spec:
      terminationGracePeriodSeconds: 60
      containers:
        - name: nginx-ingress-controller
          image: gcr.io/google_containers/nginx-ingress-controller:0.8.3
          imagePullPolicy: Always
    //----omitted for brevity----
```

> 참고: Google Cloud는 Ingress 리소스를 직접 지원합니다. 애플리케이션이 Google Cloud에 배포된 경우, Google Cloud는 Ingress 리소스에 대해 7계층 로드 밸런서를 자동으로 생성하고 외부 IP를 할당하므로 Ingress Controller를 직접 배포할 필요가 없습니다.

## 결론
Ingress와 Load balancer를 함께 사용하는 방식은 Kubernetes 클러스터의 애플리케이션 서비스를 외부 클라이언트에 노출하는 데 유연하며, 대부분의 애플리케이션 요구 사항을 충족할 수 있습니다. 그러나 진입점에서 더 강력한 기능(예: 더 높은 효율성 요구 사항, 보안 인증, 로깅 또는 특정 애플리케이션 맞춤형 로직)이 필요한 경우, 마이크로서비스 아키텍처의 API Gateway 패턴을 고려하여 더 강력한 API Gateway를 애플리케이션의 트래픽 진입점으로 사용해야 합니다.

## 참고

* [Accessing Kubernetes Pods from Outside of the Cluster](http://alesnosek.com/blog/2017/02/14/accessing-kubernetes-pods-from-outside-of-the-cluster/)

* [Kubernetes nginx-ingress-controller](https://daemonza.github.io/2017/02/13/kubernetes-nginx-ingress-controller/)

* [Using Kubernetes external load balancer feature](https://docs.openstack.org/magnum/ocata/dev/kubernetes-load-balancer.html)

* [Expose Services on your AWS Quick Start Kubernetes cluster]( http://docs.heptio.com/content/tutorials/aws-qs-services-elb.html)
