---
title:      "Istio를 이용한 카나리 릴리스(Canary Release) 구현"
subtitle:   "사용자에게 영향을 주지 않는 원활한 서비스 업그레이드"
description: "애플리케이션이 출시된 후, 운영팀이 직면하는 큰 과제 중 하나는 기존 서비스에 영향을 주지 않으면서 업그레이드를 수행하는 방법입니다. 이 문서에서는 Istio를 사용하여 애플리케이션의 카나리 릴리스를 구현하는 방법을 소개합니다."
excerpt: "애플리케이션이 출시된 후, 운영팀이 직면하는 큰 과제 중 하나는 기존 서비스에 영향을 주지 않으면서 업그레이드를 수행하는 방법입니다. 이 문서에서는 Istio를 사용하여 애플리케이션의 카나리 릴리스를 구현하는 방법을 소개합니다."
date:       2017-11-08 15:00:00
author:     "Lionel.J"
image: "/img/istio-canary-release/canary_bg.jpg"
publishDate: 2017-11-08 15:00:00
tags:
    - Istio
URL: "/2017/11/08/istio-canary-release-ko/"
categories: [ "Tech" ]
---

## 카나리 릴리스(Canary Release) 소개

애플리케이션이 출시된 후, 운영팀이 직면하는 큰 과제 중 하나는 기존 서비스에 영향을 주지 않으면서 업그레이드를 수행하는 방법입니다. 제품을 개발해 본 사람이라면 누구나 알겠지만, 출시 전에 아무리 완벽한 자동화 및 수동 테스트를 거쳤더라도 출시 후에는 크고 작은 문제가 발생하기 마련입니다. 머피의 법칙에 따르면, 잘못될 수 있는 버전 릴리스는 반드시 잘못됩니다.

"잘못될 수 있는 모든 것은 잘못될 것이다" -- 머피의 법칙

따라서 우리는 오프라인 테스트에서 모든 잠재적 결함을 발견할 수 있다고 기대할 수 없습니다. 버전 업그레이드 실패를 100% 피할 수 없는 상황에서는 통제 가능한 방식으로 버전을 배포하여 장애 영향을 허용 가능한 범위 내로 제어하고 빠르게 롤백할 수 있는 방법이 필요합니다.

[카나리 릴리스](https://martinfowler.com/bliki/CanaryRelease.html)를 통해 기존 버전에서 새 버전으로의 원활한 전환을 구현하고, 업그레이드 과정에서 발생할 수 있는 문제가 사용자에게 미치는 영향을 방지할 수 있습니다.

"카나리 릴리스"라는 이름은 광부들이 광산의 공기 테스트를 위해 카나리아를 사용했던 관행에서 유래했습니다. 예전에는 광부들이 광산에 들어가기 전에 카나리아를 먼저 들여보내거나, 채굴하는 동안 계속 카나리아를 데리고 다녔습니다. 카나리아는 메탄과 일산화탄소 농도에 민감하여 먼저 경고를 울렸습니다. 그래서 사람들은 "카나리아"를 가장 먼저 테스트하는 데 사용했습니다.

아래 그림에서 왼쪽 하단의 소수 사용자들은 새로 출시된 1.1 버전을 테스트하기 위한 "카나리아"로 사용됩니다. 새 버전에 문제가 발생하면 "카나리아"들이 경고를 울리지만, 다른 사용자들의 서비스 정상 운영에는 영향을 미치지 않습니다.
![Istio 카나리 릴리스 개요](/img/istio-canary-release/canary-deployment.PNG)

카나리 릴리스의 절차는 다음과 같습니다.

- 프로덕션 환경과 격리된 "카나리" 서버를 준비합니다.
- 새 버전의 서비스를 "카나리" 서버에 배포합니다.
- "카나리" 서버의 서비스에 대해 자동화 및 수동 테스트를 수행합니다.
- 테스트 통과 후, "카나리" 서버를 프로덕션 환경에 연결하고 소량의 프로덕션 트래픽을 "카나리" 서버로 라우팅합니다.
- 온라인 테스트 중 문제가 발생하면, "카나리" 서버에서 프로덕션 트래픽을 이전 버전 서비스로 다시 라우팅하여 롤백하고, 문제를 수정한 후 다시 배포합니다.
- 온라인 테스트가 순조롭게 진행되면, 특정 전략에 따라 프로덕션 트래픽을 점진적으로 새 버전 서버로 라우팅합니다.
- 새 버전 서비스가 안정적으로 운영되면, 이전 버전 서비스를 삭제합니다.

## Istio를 이용한 카나리 릴리스(Canary Release) 원리
위 절차에서 볼 수 있듯이, 카나리 릴리스 절차를 구현하려면 애플리케이션과 운영 절차가 이 배포 과정을 지원해야 하므로 작업량과 난이도가 매우 높습니다. 유사한 문제에 직면하더라도 각 기업이나 조직은 일반적으로 카나리 릴리스를 위해 서로 다른 사설 구현 방식을 채택하여 연구 개발 및 운영에 막대한 비용을 초래했습니다.

Istio는 높은 추상화와 우수한 설계를 통해 일관된 방식으로 이 문제를 해결했습니다. 사이드카를 사용하여 애플리케이션 트래픽을 전달하고, Pilot을 통해 라우팅 규칙을 배포함으로써 애플리케이션을 수정하지 않고도 카나리 릴리스를 구현할 수 있습니다.

참고: Kubernetes의 [롤링 업데이트(rolling update)](https://kubernetes.io/docs/tasks/run-application/rolling-update-replication-controller/) 기능도 서비스 중단 없이 애플리케이션 업그레이드를 구현할 수 있지만, 롤링 업데이트는 새 버전의 서비스를 점진적으로 사용하여 이전 버전 서비스를 대체하는 방식으로 애플리케이션을 업그레이드합니다. 롤링 업데이트에서는 애플리케이션의 트래픽 분배를 제어할 수 없으므로, 제어된 방식으로 프로덕션 트래픽을 새 버전 서비스로 점진적으로 라우팅할 수 없으며, 따라서 서비스 업그레이드가 사용자에게 미치는 영향을 제어할 수 없습니다.

Istio를 사용하면 라우팅 규칙을 사용자 정의하여 특정 트래픽(예: 특정 특성을 가진 사용자)을 새 버전 서비스로 라우팅하고, 프로덕션 환경에서 테스트를 수행할 수 있습니다. 동시에 점진적이고 제어된 방식으로 프로덕션 트래픽을 라우팅하여 업그레이드 중 발생하는 장애가 사용자에게 미치는 영향을 최소화할 수 있습니다. 또한 새 버전과 이전 버전 서비스가 동시에 존재할 때, 애플리케이션 부하에 따라 다른 버전의 서비스를 독립적으로 확장/축소할 수 있어 매우 유연합니다. Istio를 사용한 카나리 릴리스 절차는 아래 그림과 같습니다.
![Istio 카나리 릴리스 개요](/img/istio-canary-release/canary-deployments.gif)

## 작업 단계
아래에서는 Istio에 내장된 BookinfoInfo 예제 프로그램을 사용하여 카나리 릴리스 절차를 시험해 봅니다.
### 테스트 환경 설치
먼저 [Istio 및 Bookinfo 예제 프로그램 설치 가이드](http://zhaohuabing.com/2017/11/04/istio-install_and_example/)를 참조하여 Kubernetes 및 Istio 제어 평면을 설치합니다.

이 실험에서는 reviews 서비스의 세 가지 버전을 모두 설치할 필요가 없으므로, 이미 애플리케이션이 설치되어 있다면 다음 명령을 사용하여 먼저 제거합니다.

```
istio-0.2.10/samples/bookinfo/kube/cleanup.sh
```
### V1 버전 서비스 배포

먼저 V1 버전의 Bookinfo 애플리케이션만 배포합니다. 예제 YAML 파일에는 reviews 서비스의 세 가지 버전이 포함되어 있으므로, 먼저 YAML 파일 `istio-0.2.10/samples/bookinfo/kube/bookinfo.yaml`에서 V2 및 V3 버전의 Deployment를 삭제합니다.

Bookinfo.yaml에서 다음 내용을 삭제합니다.

```
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: reviews-v2
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: reviews
        version: v2
    spec:
      containers:
      - name: reviews
        image: istio/examples-bookinfo-reviews-v2:0.2.3
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 9080
---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: reviews-v3
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: reviews
        version: v3
    spec:
      containers:
      - name: reviews
        image: istio/examples-bookinfo-reviews-v3:0.2.3
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 9080    
---         
```

V1 버전의 Bookinfo 프로그램을 배포합니다.

```
kubectl apply -f <(istioctl kube-inject -f istio-0.2.10/samples/bookinfo/kube/bookinfo.yaml)
```

kubectl 명령줄을 통해 pod 배포를 확인하면 V1 버전 서비스만 볼 수 있습니다.

```
kubectl get pods

NAME                              READY     STATUS    RESTARTS   AGE
details-v1-3688945616-nhkqk       2/2       Running   0          2m
productpage-v1-2055622944-m3fql   2/2       Running   0          2m
ratings-v1-233971408-0f3s9        2/2       Running   0          2m
reviews-v1-1360980140-0zs9z       2/2       Running   0          2m
```
브라우저에서 애플리케이션 페이지를 엽니다. 주소는 istio-ingress의 External IP입니다. V1 버전의 reviews 서비스는 rating 서비스를 호출하지 않으므로, Product 페이지에 별점 없는 평가 정보가 표시됩니다.

`http://10.12.25.116/productpage`  
![](//img/istio-canary-release/product-page-default.PNG)

현재 시스템의 마이크로서비스 배포 상황은 아래 그림과 같습니다(아래 다이어그램은 이 예제와 관련 없는 details 및 ratings 서비스는 무시합니다).
![](//img/istio-canary-release/canary-example-only-v1.PNG)

### V2 버전 reviews 서비스 배포
V2 버전 reviews 서비스를 배포하기 전에, 모든 프로덕션 트래픽을 V1 버전으로 라우팅하여 온라인 사용자에게 영향을 주지 않도록 기본 라우팅 규칙 `route-rule-default-reviews.yaml`을 먼저 생성해야 합니다.

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
istioctl create -f route-rule-default-reviews.yaml -n default
```
V2 버전 배포 파일 `bookinfo-reviews-v2.yaml`을 생성합니다. 내용은 다음과 같습니다.
```
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: reviews-v2
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: reviews
        version: v2
    spec:
      containers:
      - name: reviews
        image: istio/examples-bookinfo-reviews-v2:0.2.3
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 9080
```

V2 버전 reviews 서비스를 배포합니다.
```
kubectl apply -f <(istioctl kube-inject -f  bookinfo-reviews-v2.yaml)
```
현재 시스템에는 V1과 V2 두 가지 버전의 reviews 서비스가 배포되어 있지만, 모든 비즈니스 트래픽은 `reviews-default` 규칙에 따라 V1으로 라우팅됩니다. 아래 그림과 같습니다.
![](/img/istio-canary-release/canary-example-deploy-v2.PNG)


### 테스트 트래픽을 V2 버전 reviews 서비스로 라우팅
시뮬레이션 테스트를 수행할 때, 테스트 환경과 프로덕션 환경의 네트워크, 서버, 운영 체제 등 환경 차이로 인해 프로덕션 환경을 완벽하게 시뮬레이션하기 어렵습니다. 환경 요인이 테스트 결과에 미치는 영향을 줄이기 위해, 우리는 프로덕션 환경에서 출시 전 테스트를 수행하기를 원하지만, 적절한 격리 조치가 없으면 테스트가 이미 출시된 서비스에 영향을 미쳐 기업에 손실을 초래할 수 있습니다.

Istio의 라우팅 규칙을 사용하면 프로덕션과 유사한 환경에서 테스트를 수행하면서도 온라인 사용자의 프로덕션 트래픽과 테스트 트래픽을 완전히 격리하여, 시뮬레이션 테스트가 이미 출시된 서비스에 미치는 영향을 최소화할 수 있습니다. 아래 그림과 같습니다.
![](/img/istio-canary-release/canary-example-route-test.PNG)

사용자 이름이 `test-user`인 트래픽을 V2로 라우팅하는 규칙을 생성합니다.

```
apiVersion: config.istio.io/v1alpha2
kind: RouteRule
metadata:
  name: reviews-test-user
spec:
  destination:
    name: reviews
  precedence: 2
  match:
    request:
      headers:
        cookie:
          regex: "^(.*?;)?(user=test-user)(;.*)?$"
  route:
  - labels:
      version: v2
```
참고: `precedence` 속성은 규칙의 우선순위를 설정하는 데 사용됩니다. 여러 규칙이 동시에 존재할 경우, 우선순위가 높은 규칙이 먼저 실행됩니다. 이 규칙의 `precedence`는 2로 설정되어 기본 규칙보다 먼저 실행되어 `test-user` 사용자의 요청을 V2 버전 reviews 서비스로 라우팅합니다.

이 규칙을 활성화합니다.

```
istioctl create -f route-rule-test-reviews-v2.yaml -n default
```
`test-user`로 로그인하면 V2 버전의 별점 있는 평가 페이지를 볼 수 있습니다.
![](/img/istio-canary-release/product-page-test-user.PNG)

`test-user`에서 로그아웃하면 V1 버전의 별점 없는 평가 페이지를 볼 수 있습니다. 아래 그림과 같습니다.
![](/img/istio-canary-release/product-page-default.PNG)

### 일부 프로덕션 트래픽을 V2 버전 reviews 서비스로 라우팅

온라인 시뮬레이션 테스트가 완료된 후, 시스템 테스트 결과가 양호하면 규칙을 통해 일부 사용자 트래픽을 V2 버전 서비스로 라우팅하여 소규모 "카나리" 테스트를 수행할 수 있습니다.

`route-rule-default-reviews.yaml` 규칙을 수정하여 트래픽의 50%를 V2 버전으로 라우팅합니다.

> 참고: 이 예제는 원리를 설명하기 위한 것이므로 간단하게 50%의 트래픽을 V2 버전으로 라우팅합니다. 실제 작업에서는 먼저 소량의 트래픽을 라우팅한 다음, 새 버전의 모니터링 상황에 따라 트래픽을 점진적으로 라우팅하는 것이 더 일반적입니다(예: 5%, 10%, 20%, 50% 등의 비율로 점진적 라우팅).

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
    weight: 50
  - labels:
      version: v2
    weight: 50
```

```
istioctl replace -f route-rule-default-reviews.yaml -n default
```

현재 시스템 배포는 아래 그림과 같습니다.
![](/img/istio-canary-release/canary-example-route-production-50.PNG)

### 모든 프로덕션 트래픽을 V2 버전 reviews 서비스로 라우팅

새 버전 서비스가 정상적으로 작동하면 모든 트래픽을 V2 버전으로 라우팅할 수 있습니다.

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
      version: v2
    weight: 100
```

```
istioctl replace -f route-rule-default-reviews.yaml -n default
```
시스템 배포는 아래 그림과 같습니다.
![](/img/istio-canary-release/canary-example-route-production-100.PNG)

이제 어떤 사용자로 로그인하든 V2 버전의 별점 있는 평가 페이지를 볼 수 있습니다. 아래 그림과 같습니다.
![](/img/istio-canary-release/product-page-default-v2.PNG)

> 참고: 카나리 릴리스 과정에서 새 버전 서비스에 문제가 발생하면 라우팅 규칙을 수정하여 트래픽을 V1 버전 서비스로 다시 라우팅하고, V2 버전의 문제를 수정한 후 다시 테스트를 진행할 수 있습니다.

### V1 버전 reviews 서비스 삭제

V2 버전이 안정적으로 출시된 후, V1 버전 reviews 서비스와 테스트 규칙을 삭제합니다.
```
kubectl delete pod reviews-v1-1360980140-0zs9z

istioctl delete -f route-rule-test-reviews-v2.yaml -n default
```

## 참고

* [Istio 공식 문서](https://istio.io/docs/)
