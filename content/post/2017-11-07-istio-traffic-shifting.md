---
layout:     post
title:      "Istio를 사용하여 애플리케이션 트래픽 전환 구현"
subtitle:   "이 문서는 Istio 공식 문서를 번역한 것입니다."
description: "이 작업은 애플리케이션 트래픽을 이전 버전의 서비스에서 새 버전으로 점진적으로 마이그레이션하는 방법을 보여줍니다. Istio를 통해 다양한 가중치 규칙(10%, 20%, ··· 100%)을 사용하여 트래픽을 이전 버전 서비스에서 새 버전 서비스로 원활하게 마이그레이션할 수 있습니다."
excerpt: "이 작업은 애플리케이션 트래픽을 이전 버전의 서비스에서 새 버전으로 점진적으로 마이그레이션하는 방법을 보여줍니다. Istio를 통해 다양한 가중치 규칙(10%, 20%, ··· 100%)을 사용하여 트래픽을 이전 버전 서비스에서 새 버전 서비스로 원활하게 마이그레이션할 수 있습니다."
date:     2017-11-07
author:     "Lionel.J"
image: "/img/istio-traffic-shifting/crossroads.png"
categories: [ "Tech"]
tags:
    - Istio
URL: "/2017/11/07/istio-traffic-shifting/"
---

Istio에 대한 더 많은 내용은 [Istio 중국어 문서](http://istio.doczh.cn/)를 참조하십시오.

원문은 [Traffic Shifting](https://istio.io/docs/tasks/traffic-management/traffic-shifting.html)을 참조하십시오.

이 작업은 애플리케이션 트래픽을 이전 버전의 서비스에서 새 버전으로 점진적으로 마이그레이션하는 방법을 보여줍니다. Istio를 통해 다양한 가중치 규칙(10%, 20%, ··· 100%)을 사용하여 트래픽을 이전 버전 서비스에서 새 버전 서비스로 원활하게 마이그레이션할 수 있습니다.
<!--more-->
간단히 하기 위해, 이 작업에서는 `reviews:v1`에서 `reviews:v3`으로 트래픽을 50%, 100%의 가중치로 두 단계에 걸쳐 마이그레이션합니다.


# 시작하기 전에

* 문서 [설치 가이드](http://istio.doczh.cn/docs/setup/kubernetes/index.html)의 단계에 따라 Istio를 설치하십시오.

* [BookInfo](http://istio.doczh.cn/docs/guides/bookinfo.html) 예제 애플리케이션을 배포하십시오.

> 참고: 이 문서는 예제 애플리케이션이 Kubernetes에 배포되었다고 가정합니다. 모든 예제 명령줄은 규칙 yaml 파일(예: `samples/bookinfo/kube/route-rule-all-v1.yaml`)에 지정된 Kubernetes 버전을 사용합니다. 다른 환경에서 이 작업을 실행하는 경우 `kube`를 해당 환경의 디렉토리(예: Consul 기반 환경의 경우 `samples/bookinfo/consul/route-rule-all-v1.yaml`)로 변경하십시오.


# 가중치 기반 버전 라우팅

1. 모든 마이크로서비스의 기본 버전을 v1으로 설정합니다.

   ```bash
   istioctl create -f samples/bookinfo/kube/route-rule-all-v1.yaml
   ```

1. 브라우저에서 http://$GATEWAY_URL/productpage를 열어 `reviews` 서비스의 현재 활성 버전이 v1인지 확인합니다.

   브라우저에 BookInfo 애플리케이션의 productpage 페이지가 나타납니다.
   `productpage`에 표시되는 리뷰 내용에 별표가 없는 것을 확인하십시오. 이는 `reviews:v1`이 `ratings` 서비스에 접근하지 않기 때문입니다.

   > 참고: 이전에 [요청 라우팅 구성](http://istio.doczh.cn/docs/tasks/traffic-management/request-routing.html) 작업을 수행했다면, 테스트 사용자 "jason"을 로그아웃하거나 이전에 해당 사용자를 위해 생성된 테스트 규칙을 삭제해야 합니다.

     ```bash
     istioctl delete routerule reviews-test-v2
     ```

1. 먼저, 다음 명령을 사용하여 `reviews:v1`에서 `reviews:v3`으로 트래픽의 50%를 전환합니다.

   ```bash
   istioctl replace -f samples/bookinfo/kube/route-rule-reviews-50-v3.yaml
   ```

   여기서는 `create` 대신 `istioctl replace`를 사용했습니다.

1. 브라우저에서 `productpage` 페이지를 여러 번 새로 고치면 약 50%의 확률로 빨간 별이 있는 리뷰 내용이 페이지에 나타나는 것을 볼 수 있습니다.

   > 참고: 현재 Envoy 사이드카 구현에서는 트래픽 분배 효과를 확인하기 위해 `productpage`를 여러 번 새로 고쳐야 할 수 있습니다. 페이지가 변경되기 전에 15번 이상 새로 고쳐야 할 수도 있습니다. 규칙을 수정하여 트래픽의 90%를 v3으로 라우팅하면 더 명확한 효과를 볼 수 있습니다.

1. v3 버전의 `reviews` 서비스가 안정적으로 실행된 후, 트래픽의 100%를 `reviews:v3`으로 라우팅할 수 있습니다.

   ```bash
   istioctl replace -f samples/bookinfo/kube/route-rule-reviews-v3.yaml
   ```

   이제 어떤 사용자로 `productpage` 페이지에 로그인하더라도 빨간 별이 있는 리뷰 정보를 볼 수 있습니다.

# 원리 이해하기

이 작업에서 우리는 Istio의 가중치 기반 라우팅 기능을 사용하여 이전 버전의 `reviews` 서비스에서 새 버전 서비스로 트래픽을 점진적으로 마이그레이션했습니다.

이 방식은 컨테이너 오케스트레이션 플랫폼의 배포 기능을 사용하여 버전 마이그레이션을 수행하는 것과는 완전히 다릅니다. 컨테이너 오케스트레이션 플랫폼은 인스턴스 스케일링을 사용하여 트래픽을 관리합니다. 반면 Istio를 사용하면 두 버전의 `reviews` 서비스를 독립적으로 스케일 업 및 스케일 다운할 수 있으며, 이는 두 버전 서비스 간의 트래픽 분배에 영향을 미치지 않습니다.

스케일링을 지원하는 버전별 라우팅 기능에 대한 자세한 내용은 [Istio를 사용한 카나리 배포](https://istio.io/blog/canary-deployments-using-istio.html)를 참조하십시오.

# 정리

* 라우팅 규칙을 삭제합니다.

  ```bash
  istioctl delete -f samples/bookinfo/kube/route-rule-all-v1.yaml
  ```

* 이후 작업을 시도할 계획이 없다면 [BookInfo 정리](http://istio.doczh.cn/docs/guides/bookinfo.html#cleanup)의 단계에 따라 애플리케이션을 종료하십시오.


# 추가 자료

* 더 많은 내용은 [요청 라우팅](http://istio.doczh.cn/docs/concepts/traffic-management/rules-configuration.html)을 참조하십시오.
