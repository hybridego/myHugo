---
showonlyimage: true
title: Istio v1alpha3 라우팅 API 소개
excerpt: Istio v1alpha3 라우팅 API 및 설계 원칙 소개
description: Istio v1alpha3 라우팅 API 및 설계 원칙 소개
date: 2018-06-04
author: Lionel.J
image: "/img/2018-06-04-introducing-the-istio-v1alpha3-routing-api/background.jpg"
publishDate: 2018-06-04
tags:
    - Istio

categories: [ Tech ]
URL: "/2018/06/04/introducing-the-istio-v1alpha3-routing-api/"
---

지금까지 Istio는 RouteRule, DestinationPolicy, EgressRule, Ingress(Kubernetes의 Ingress 리소스를 직접 사용)의 네 가지 리소스를 포함하는 간단한 트래픽 관리 API를 제공했습니다. 이 API를 통해 사용자는 Istio 서비스 메시 내에서 트래픽을 쉽게 관리할 수 있습니다. 이 API를 통해 사용자는 요청을 특정 서비스 버전으로 라우팅하고, 복원력 테스트를 위해 지연 및 오류를 주입하고, 타임아웃 및 회로 차단기를 추가하는 등 애플리케이션 코드를 수정할 필요 없이 모든 작업을 수행할 수 있습니다.

<!--more-->
현재 API는 Istio의 가장 강력한 기능 중 하나로 입증되었지만, 사용자 피드백은 특히 수천 개의 서비스가 있는 매우 큰 애플리케이션을 관리하거나 HTTP 이외의 프로토콜을 사용할 때 몇 가지 단점을 지적했습니다. 또한 Kubernetes Ingress 리소스를 사용하여 외부 트래픽을 구성하는 것이 많은 요구 사항에 충분하지 않다는 것이 밝혀졌습니다.

이러한 문제 및 기타 문제를 해결하기 위해 Istio는 이전 API를 완전히 대체할 새로운 트래픽 관리 API v1alpha3을 도입했습니다. v1alpha3은 기본적으로 이전 모델과 유사하지만, 하위 호환성이 없으므로 이전 API를 기반으로 하는 모델은 수동 변환이 필요합니다. Istio는 향후 릴리스에서 이전 모델과 새 모델 간의 변환을 위한 마이그레이션 도구를 제공할 것입니다.

이러한 하위 호환되지 않는 업그레이드를 정당화하기 위해 v1alpha3 API는 길고 엄격한 커뮤니티 평가 프로세스를 거쳤으며, 새로운 API가 상당한 개선을 가져오고 시간의 시험을 견딜 수 있기를 바랍니다. 이 글에서는 새로운 구성 모델을 소개하고 그 배경이 되는 동기 및 설계 원칙 중 일부를 설명하고자 합니다.

## 설계 원칙

라우팅 모델을 재설계하는 동안 몇 가지 주요 설계 원칙이 준수되었습니다.

* 선언적(의도 기반) 구성 외에도, 모델은 기본 인프라 종속성을 명시적으로 지정할 수 있도록 합니다. 예를 들어, 인그레스 게이트웨이의 기능적 기능을 구성하는 것 외에도, 인그레스 게이트웨이를 구현하는 구성 요소(컨트롤러)도 모델에 지정할 수 있습니다.
* 모델은 여러 개의 개별 규칙으로 구성되는 대신, 작성 시 "생산자 지향적"이고 "호스트 중심적"이어야 합니다. 예를 들어, 특정 호스트와 관련된 모든 규칙은 개별적으로 구성되는 대신 함께 구성됩니다.
* 라우팅 및 라우팅 후 동작은 명확하게 분리됩니다.

## v1alpha3의 구성 리소스

일반적인 메시에서는 일반적으로 외부 TLS 연결을 종료하고 트래픽을 메시로 가져오는 하나 이상의 로드 밸런서(게이트웨이라고 함)가 있습니다. 그런 다음 트래픽은 사이드카 게이트웨이를 통해 내부 서비스로 흐릅니다. 애플리케이션이 외부 서비스(예: Google Maps API 접근)를 사용하는 것도 일반적입니다. 경우에 따라 이러한 외부 서비스는 직접 호출될 수 있지만, 특정 배포에서는 외부 서비스로 향하는 모든 아웃바운드 트래픽이 전용 이그레스 게이트웨이를 통과해야 할 수 있습니다. 아래 다이어그램은 메시 내에서 게이트웨이를 사용하는 방법을 보여줍니다.

![Gateway](/img/2018-06-04-introducing-the-istio-v1alpha3-routing-api/gateways.svg)

이러한 요소를 고려하여 `v1alpha3`은 메시로 들어오고, 메시 내에서, 메시를 떠나는 트래픽 라우팅을 제어하기 위해 다음 새로운 구성 리소스를 도입합니다.

1. `Gateway`
1. `VirtualService`
1. `DestinationRule`
1. `ServiceEntry`
`VirtualService`, `DestinationRule`, `ServiceEntry`는 각각 원래 API의 `RouteRule`, `DestinationPolicy`, `EgressRule`을 대체합니다. `Gateway`는 전용 중간 장치로 흐르는 트래픽을 모델링하는 데 사용되는 플랫폼 독립적인 추상화입니다.

아래 다이어그램은 여러 구성 리소스 간의 제어 흐름을 보여줍니다.
![다양한 구성 리소스 간의 관계](/img/2018-06-04-introducing-the-istio-v1alpha3-routing-api/virtualservices-destrules.svg)

### Gateway
[Gateway](https://istio.io/docs/reference/config/istio.networking.v1alpha3/#Gateway)는 로드 밸런서가 어디에서 실행되든 관계없이 HTTP/TCP 트래픽에 대한 로드 밸런서를 구성하는 데 사용됩니다. 메시 내에는 원하는 수의 Gateway가 존재할 수 있으며, 여러 다른 Gateway 구현이 공존할 수 있습니다. 실제로 구성에서 워크로드(Pod) 레이블 세트를 지정하여 Gateway 구성을 특정 워크로드에 바인딩할 수 있으므로, 사용자는 간단한 Gateway 컨트롤러를 작성하여 기존 네트워크 장치를 재사용할 수 있습니다.

인그레스 트래픽 관리에 대해 질문할 수 있습니다. 왜 Kubernetes Ingress API를 사용하지 않습니까? 그 이유는 Ingress API가 Istio의 라우팅 요구 사항을 표현할 수 없기 때문입니다. Ingress는 다른 HTTP 프록시 간의 공통 부분 집합을 찾으려고 시도하므로 가장 기본적인 HTTP 라우팅만 지원합니다. 결과적으로 프록시의 고급 기능은 주석을 통해 추가되어야 하며, 이는 다른 프록시 간에 호환되지 않고 이식성이 없습니다.

Istio `Gateway`는 L4-L6 구성을 L7 구성과 분리하여 `Ingress`의 이러한 단점을 극복합니다. `Gateway`는 L4-L6 기능(예: 노출 포트 및 TLS 설정)만 구성하는 데 사용되며, 이는 모든 주류 L7 프록시에서 통합된 방식으로 구현됩니다. 그런 다음 `VirtualService`를 `Gateway`에 바인딩하여 표준 Istio 규칙을 사용하여 `Gateway`로 들어오는 HTTP 및 TCP 트래픽을 제어할 수 있습니다.

예를 들어, 다음 간단한 `Gateway`는 bookinfo.com 호스트에 대한 외부 HTTPS 트래픽을 메시로 허용하도록 로드 밸런서를 구성합니다.

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: bookinfo-gateway
spec:
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - bookinfo.com
    tls:
      mode: SIMPLE
      serverCertificate: /tmp/tls.crt
      privateKey: /tmp/tls.key
```

위 Gateway로 들어오는 트래픽에 대한 라우팅을 구성하려면 동일한 호스트에 대한 `VirtualService`를 정의하고(다음 섹션에서 설명) 구성의 `gateways` 필드를 사용하여 이전에 정의된 `Gateway`에 바인딩해야 합니다.
```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: bookinfo
spec:
  hosts:
    - bookinfo.com
  gateways:
  - bookinfo-gateway # <---- 게이트웨이에 바인딩
  http:
  - match:
    - uri:
        prefix: /reviews
    route:
    - destination:
        host: reviews
  - match:
    - uri:
        prefix: /ratings
    route:
    - destination:
        host: ratings
  ...
```
Gateway는 첫 번째 다이어그램에서 보여지는 것처럼 엣지 프록시 또는 순수 내부 프록시를 모델링하는 데 사용될 수 있습니다. 위치에 관계없이 모든 게이트웨이는 동일한 방식으로 구성하고 제어할 수 있습니다.
### VirtualService

라우팅 규칙을 "가상 서비스"라는 것으로 대체하는 것이 처음에는 다소 이상하게 들릴 수 있지만, 구성하는 내용에 대해서는 실제로 더 나은 이름입니다. 특히 이전 모델의 확장성 문제를 해결하기 위해 API를 재설계한 후에는 더욱 그렇습니다.

실제로 변경 사항은 다음과 같습니다. 이전 모델에서는 특정 대상 서비스에 대한 라우팅을 설정하기 위해 일련의 독립적인 구성 규칙이 필요했으며, `precedence` 필드를 사용하여 이러한 규칙의 순서를 제어했습니다. 새로운 API에서는 (가상) 서비스를 직접 구성하고, 해당 가상 서비스에 대한 모든 규칙은 해당 [VirtualService](/docs/reference/config/istio.networking.v1alpha3/#VirtualService) 리소스 내에서 순서가 지정된 목록으로 지정됩니다.

예를 들어, 이전에 [Bookinfo](/docs/guides/bookinfo/) 애플리케이션의 reviews 서비스에는 아래와 같이 두 개의 `RouteRule` 리소스가 있었습니다.

```yaml
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
---
apiVersion: config.istio.io/v1alpha2
kind: RouteRule
metadata:
  name: reviews-test-v2
spec:
  destination:
    name: reviews
  precedence: 2
  match:
    request:
      headers:
        cookie:
          regex: "^(.*?;)?(user=jason)(;.*)?$"
  route:
  - labels:
      version: v2
```

`v1alpha3`에서는 단일 `VirtualService` 리소스 내에서 동일한 구성을 제공할 수 있습니다.

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts:
    - reviews
  http:
  - match:
    - headers:
        cookie:
          regex: "^(.*?;)?(user=jason)(;.*)?$"
    route:
    - destination:
        host: reviews
        subset: v2
  - route:
    - destination:
        host: reviews
        subset: v1
```
보시다시피, reviews 서비스와 관련된 두 가지 규칙이 이제 한 곳으로 통합되었습니다. 언뜻 보기에는 이 변경이 특별히 유리해 보이지 않을 수 있습니다. 그러나 새로운 모델을 자세히 살펴보면 이전 API와 근본적인 차이점이 있어 v1alpha3이 훨씬 더 강력하다는 것을 알 수 있습니다.

먼저, `VirtualService`의 대상 서비스는 `hosts` 필드(실제로는 반복 필드)를 사용하여 지정된 다음, 각 경로의 `destination` 필드에서 다시 참조된다는 점에 유의하십시오. 이는 이전 모델과의 중요한 차이점입니다.

`VirtualService`는 하나 이상의 사용자 접근 가능한 대상과 메시 내의 실제 워크로드 간의 매핑을 설명합니다. 위 예시에서는 이 두 주소가 동일하지만, 실제로는 사용자 접근 가능한 대상은 서비스 위치를 찾는 데 사용되는 모든 DNS 이름이 될 수 있으며, 선택적으로 와일드카드 또는 CIDR 접두사를 포함할 수 있습니다.

이는 모놀리식 아키텍처에서 마이크로서비스 아키텍처로 마이그레이션하는 동안 특히 유용합니다. 모놀리식 애플리케이션이 여러 독립적인 마이크로서비스로 분할될 때, `VirtualService`를 사용하면 동일한 대상 주소 아래에 여러 마이크로서비스를 계속 노출할 수 있으므로 서비스 소비자는 새로운 아키텍처에 맞춰 변경할 필요가 없습니다.

예를 들어, 다음 규칙은 서비스 소비자가 Bookinfo 애플리케이션의 reviews 및 ratings 서비스를 마치 `http://bookinfo.com/`의 단일 (가상) 서비스의 일부인 것처럼 접근할 수 있도록 합니다.

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: bookinfo
spec:
  hosts:
    - bookinfo.com
  http:
  - match:
    - uri:
        prefix: /reviews
    route:
    - destination:
        host: reviews
  - match:
    - uri:
        prefix: /ratings
    route:
    - destination:
        host: ratings
  ...
```
실제로 `VirtualService`의 `hosts` 섹션은 가상 대상만 정의하므로, 메시 내에 이미 등록된 서비스에 반드시 해당할 필요는 없습니다. 이를 통해 사용자는 메시 내에 라우팅 가능한 항목이 없는 가상 호스트에 대한 트래픽을 모델링할 수 있습니다. `VirtualService`를 동일한 호스트에 대한 `Gateway` 구성에 바인딩하여(이전 섹션에서 설명한 대로) 이러한 호스트를 메시 외부의 외부 트래픽에 노출할 수 있습니다.

이러한 주요 리팩토링 외에도 `VirtualService`는 몇 가지 중요한 변경 사항을 도입합니다.

1. 단일 `VirtualService` 구성 내에서 여러 일치 조건을 지정할 수 있으므로 중복 규칙 정의의 필요성이 줄어듭니다.

1. 각 서비스 버전에는 이름(서비스 서브셋이라고 함)이 있습니다. 서브셋에 속하는 Pod/VM 그룹은 `DestinationRule`에 정의되며, 이는 다음 섹션에서 논의될 것입니다.

1. DNS 와일드카드 접두사를 사용하여 `VirtualService`의 호스트를 지정함으로써, 일치하는 모든 서비스에 적용되는 단일 규칙을 생성할 수 있습니다. 예를 들어, Kubernetes에서 `*.foo.svc.cluster.local`을 `VirtualService`의 호스트로 사용하면 `foo` 네임스페이스의 모든 서비스에 동일한 재작성 규칙을 적용할 수 있습니다.

### DestinationRule

[DestinationRule](https://istio.io/docs/reference/config/istio.networking.v1alpha3/#DestinationRule)은 서비스로 트래픽을 전달할 때 적용되는 정책 집합을 지정합니다. 이러한 정책은 일반적으로 서비스 제공자가 작성하며, 회로 차단기, 로드 밸런싱, TLS 등과 같은 설정을 설명합니다. 아래에 설명된 변경 사항을 제외하고 `DestinationRule`은 이전 버전인 `DestinationPolicy`와 크게 유사합니다.

1. [DestinationRule](https://istio.io/docs/reference/config/istio.networking.v1alpha3/#DestinationRule)의 `host` 필드는 와일드카드 접두사를 포함할 수 있어 단일 규칙이 여러 서비스에 적용될 수 있습니다.
2. `DestinationRule`은 대상 호스트의 서브셋(예: 명명된 버전)을 정의합니다. 이러한 서브셋은 `VirtualService`의 라우팅 규칙에서 참조되어 트래픽을 특정 서비스 버전으로 보낼 수 있도록 합니다. 이러한 버전에 이름을 지정함으로써 다양한 가상 서비스에서 명시적으로 참조하고, Istio 프록시에서 내보내는 통계를 단순화하며, 서브셋을 SNI 헤더에 인코딩할 수 있습니다.

reviews 서비스에 대한 정책 및 서브셋을 구성하는 `DestinationRule`은 다음과 같습니다.

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: reviews
spec:
  host: reviews
  trafficPolicy:
    loadBalancer:
      simple: RANDOM
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
    trafficPolicy:
      loadBalancer:
        simple: ROUND_ROBIN
  - name: v3
    labels:
      version: v3
```
참고: `DestinationPolicy`와 달리, 단일 `DestinationRule` 내에서 여러 정책을 지정할 수 있습니다(예: 위에서 보여진 기본 정책 및 v2에 대한 버전별 정책).
### ServiceEntry

[ServiceEntry](https://istio.io/docs/reference/config/istio.networking.v1alpha3/#ServiceEntry)는 Istio가 내부적으로 유지 관리하는 서비스 레지스트리에 추가 항목을 추가하는 데 사용됩니다.
가장 일반적으로 웹의 API 또는 레거시 인프라의 서비스와 같이 메시 외부의 종속성에 대한 트래픽을 모델링하는 데 사용됩니다.

이전에 `EgressRule`을 사용하여 구성했던 모든 것을 이제 `ServiceEntry`로 쉽게 수행할 수 있습니다. 예를 들어, 다음과 같은 구성을 사용하여 메시 내에서 간단한 외부 서비스에 대한 접근을 허용할 수 있습니다.
```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: foo-ext
spec:
  hosts:
  - foo.com
  ports:
  - number: 80
    name: http
    protocol: HTTP
```
즉, `ServiceEntry`는 이전 버전보다 더 많은 기능을 제공합니다. 첫째, `ServiceEntry`는 외부 서비스 구성에만 국한되지 않습니다. 메시 내부 또는 메시 외부의 두 가지 유형이 될 수 있습니다. 내부 메시 항목은 단순히 서비스를 메시에 명시적으로 추가하는 데 사용되며, 추가된 서비스는 다른 내부 서비스와 동일하게 처리됩니다. 내부 메시 항목을 사용하면 이전에 관리되지 않던 인프라를 메시로 가져올 수 있습니다(예: 가상 머신에서 실행되는 서비스를 Kubernetes 기반 서비스 메시로 추가). 반면에 외부 메시 항목은 메시 외부의 서비스를 나타냅니다. 이러한 외부 서비스의 경우 mTLS 인증이 비활성화되고, 내부 서비스 요청과 달리 서버 측이 아닌 클라이언트 측에서 정책이 적용됩니다.

`ServiceEntry` 구성은 단순히 서비스를 메시의 내부 서비스 레지스트리에 추가하므로, `VirtualService` 및/또는 `DestinationRule`과 함께 레지스트리의 다른 서비스와 마찬가지로 사용할 수 있습니다. 예를 들어, 다음 `DestinationRule`은 외부 서비스에 대한 mTLS 연결을 시작하는 데 사용될 수 있습니다.
```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: foo-ext
spec:
  name: foo.com
  trafficPolicy:
    tls:
      mode: MUTUAL
      clientCertificate: /etc/certs/myclientcert.pem
      privateKey: /etc/certs/client_private_key.pem
      caCertificates: /etc/certs/rootcacerts.pem
```
일반성을 확장하는 것 외에도 `ServiceEntry`는 `EgressRule`에 비해 다음과 같은 몇 가지 개선 사항을 제공합니다.

1. 이제 단일 `ServiceEntry`에서 여러 서비스 엔드포인트를 구성할 수 있으며, 이전에는 여러 `EgressRule`이 필요했습니다.
1. 이제 서비스 엔드포인트의 해결 모드(`NONE`, `STATIC`, `DNS`)를 구성할 수 있습니다.
1. 또한, 또 다른 과제를 해결하기 위해 노력하고 있습니다. 현재 보안 외부 서비스는 일반 텍스트 포트(예: `http://google.com:443`)를 통해 접근해야 합니다. 이 문제는 향후 몇 주 내에 해결되어 애플리케이션이 `https://google.com`에 직접 접근할 수 있도록 할 것입니다. 이 제한 사항을 해결할 예정인 Istio 패치 릴리스(0.8.x)를 기대해 주십시오.

## v1alpha3 라우팅 규칙 생성 및 삭제
특정 대상에 대한 모든 라우팅 규칙이 이제 단일 `VirtualService` 리소스 내에 순서가 지정된 목록으로 저장되므로, 해당 대상에 대한 새 규칙을 추가하는 데 더 이상 새 `RouteRule`을 생성할 필요가 없습니다. 대신 해당 대상에 대한 `VirtualService` 리소스를 업데이트합니다.

이전 라우팅 규칙:
```command
$ istioctl create -f my-second-rule-for-destination-abc.yaml
```
`v1alpha3` 라우팅 규칙:
```command
$ istioctl replace -f my-updated-rules-for-destination-abc.yaml
```

라우팅 규칙 삭제도 `istioctl replace`를 사용하여 수행됩니다. 단, 마지막 라우팅 규칙을 삭제하는 경우(이 경우 해당 `VirtualService`를 삭제해야 함)는 예외입니다.

서비스 버전을 참조하는 경로를 추가하거나 제거할 때, 해당 서비스에 대한 `DestinationRule`의 `subsets`를 업데이트해야 합니다. 짐작하시겠지만, 이 또한 `istioctl replace`를 사용하여 수행됩니다.

## 요약
Istio `v1alpha3` 라우팅 API는 이전 버전보다 더 많은 기능을 제공하지만, 아쉽게도 새로운 API는 하위 호환성이 없으며, 이전 모델에서 업그레이드하려면 일회성 수동 변환이 필요합니다. Istio 0.9 이후에는 이전 구성 리소스인 `RouteRule`, `DestinationPolicy`, `EgressRule`이 더 이상 지원되지 않습니다. Kubernetes 사용자는 `Ingress`를 계속 사용하여 기본 라우팅을 위한 엣지 로드 밸런서를 구성할 수 있습니다. 그러나 고급 라우팅 기능(예: 두 버전 간의 트래픽 분할)은 `Gateway`를 사용해야 합니다. `Gateway`는 `Ingress`보다 강력하고 Istio에서 권장하는 대안입니다.

## 감사
새로운 라우팅 모델의 리팩토링 및 구현에 기여한 다음 분들께 감사드립니다(알파벳 순):

* Frank Budinsky (IBM)
* Zack Butcher (Google)
* Greg Hanson (IBM)
* Costin Manolache (Google)
* Martin Ostrowski (Google)
* Shriram Rajagopalan (VMware)
* Louis Ryan (Google)
* Isaiah Snell-Feikema (IBM)
* Kuat Yessenov (Google)

## 원문

* [Introducing the Istio v1alpha3 routing API](https://kubernetes.io/blog/2018/01/extensible-admission-is-beta)
