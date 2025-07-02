---
layout:     post

title:      "Istio 사이드카 자동 주입 원리"
subtitle:   "Kubernetes 웹훅 확장 메커니즘 분석"
description: "Kubernetes 1.9 버전은 Admission Webhook(웹 콜백) 확장 메커니즘을 도입했습니다. 웹훅을 통해 개발자는 Kubernetes API 서버의 기능을 매우 유연하게 확장하여 API 서버가 리소스를 생성할 때 리소스를 검증하거나 수정할 수 있습니다. Istio 0.7 버전은 Kubernetes 웹훅을 활용하여 사이드카 자동 주입을 구현했습니다."
excerpt: "Kubernetes 1.9 버전은 Admission Webhook(웹 콜백) 확장 메커니즘을 도입했습니다. 웹훅을 통해 개발자는 Kubernetes API 서버의 기능을 매우 유연하게 확장하여 API 서버가 리소스를 생성할 때 리소스를 검증하거나 수정할 수 있습니다. Istio 0.7 버전은 Kubernetes 웹훅을 활용하여 사이드카 자동 주입을 구현했습니다."
date:    2018-05-23
author:     "Lionel.J"
image: "/img/2018-4-25-istio-auto-injection-with-webhook/lion.jpg"
publishDate: 2018-05-23
tags:
    - Kubernetes
    - Istio
URL: "/2018/05/23/istio-auto-injection-with-webhook/"
categories: [ Tech ]
---

## 서론
- - -
Kubernetes 1.9 버전은 Admission Webhook(웹 콜백) 확장 메커니즘을 도입했습니다. 웹훅을 통해 개발자는 Kubernetes API 서버의 기능을 매우 유연하게 확장하여 API 서버가 리소스를 생성할 때 리소스를 검증하거나 수정할 수 있습니다.

웹훅 사용의 장점은 API 서버의 소스 코드를 수정하고 다시 컴파일할 필요 없이 기능을 확장할 수 있다는 것입니다. 삽입된 로직은 독립적인 웹 프로세스로 구현되며, 매개변수 방식으로 Kubernetes에 전달되어 Kubernetes가 자체 로직을 처리할 때 확장 로직을 콜백합니다.

Istio 0.7 버전은 Kubernetes 웹훅을 활용하여 사이드카 자동 주입을 구현했습니다.
<!--more-->
## Admission이란?
---
Admission은 Kubernetes의 용어로, Kubernetes API 서버 리소스 요청 과정의 한 단계를 의미합니다. 아래 그림과 같이 API 서버가 리소스 생성 요청을 받으면 먼저 요청을 인증하고 권한을 부여한 다음 Admission 처리를 거쳐 마지막으로 etcd에 저장합니다.
![](/img/2018-4-25-istio-auto-injection-with-webhook/admission-phase.png)
그림에서 볼 수 있듯이, Admission에는 Mutation과 Validation이라는 두 가지 중요한 단계가 있으며, 이 두 단계에서 실행되는 로직은 다음과 같습니다.
* Mutation

  Mutation은 영어로 "돌연변이"를 의미하며, 문자 그대로 Mutation 단계에서 요청 내용을 수정할 수 있음을 알 수 있습니다.
* Validation

  Validation 단계에서는 요청 내용을 수정할 수 없지만, 요청 내용에 따라 해당 요청을 계속 실행할지 또는 거부할지 판단할 수 있습니다.

## Admission 웹훅
---
Admission 웹훅을 통해 Mutation 및 Validation 두 가지 유형의 웹훅 플러그인을 추가할 수 있으며, 이 플러그인들은 Kubernetes가 제공하는 사전 컴파일된 Admission 플러그인과 동일한 기능을 가집니다. 예상되는 용도는 다음과 같습니다.
* 리소스 수정. 예를 들어 Istio는 Admin Webhook을 통해 Pod 리소스에 Envoy 사이드카 컨테이너를 추가합니다.
* 사용자 정의 검증 로직. 예를 들어 리소스 이름에 대한 특별한 요구 사항이 있거나 사용자 정의 리소스의 유효성을 검증합니다.

## 웹훅을 사용하여 Istio 사이드카 자동 주입
---
### Kubernetes 버전 요구 사항
웹훅 지원에는 Kubernetes 1.9 이상 버전이 필요합니다. 아래 명령을 사용하여 kube-apiserver의 Admin 웹훅 기능이 활성화되었는지 확인합니다.

```
kubectl api-versions | grep admissionregistration

admissionregistration.k8s.io/v1beta1
```
### 사이드카 주입 웹훅의 키 및 인증서 생성
웹훅은 디지털 인증서를 사용하여 kube-apiserver에 신원 인증을 수행하므로, 먼저 도구를 사용하여 키 쌍을 생성하고 Istio CA에 디지털 인증서를 요청해야 합니다.

```
./install/kubernetes/webhook-create-signed-cert.sh /
    --service istio-sidecar-injector /
    --namespace istio-system /
    --secret sidecar-injector-certs
```

### 생성된 디지털 인증서를 웹훅에 구성
```
cat install/kubernetes/istio-sidecar-injector.yaml | /
     ./install/kubernetes/webhook-patch-ca-bundle.sh > /
     install/kubernetes/istio-sidecar-injector-with-ca-bundle.yaml
```

### 사이드카 주입 ConfigMap 생성
```
kubectl apply -f install/kubernetes/istio-sidecar-injector-configmap-release.yaml
```

### 사이드카 주입 웹훅 배포
```
kubectl apply -f install/kubernetes/istio-sidecar-injector-with-ca-bundle.yaml
```

명령을 통해 배포된 웹훅 인젝터를 확인합니다.

````
kubectl -n istio-system get deployment -listio=sidecar-injector
Copy
NAME                     DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
istio-sidecar-injector   1         1         1            1           1d
```

### 사이드카 자동 주입이 필요한 네임스페이스 활성화
```
kubectl label namespace default istio-injection=enabled

kubectl get namespace -L istio-injection

NAME           STATUS    AGE       ISTIO-INJECTION
default        Active    1h        enabled
istio-system   Active    1h        
kube-public    Active    1h        
kube-system    Active    1h  
```

## 참고

* [Extensible Admission is Beta](https://kubernetes.io/blog/2018/01/extensible-admission-is-beta)
* [Installing the Istio Sidecar](https://istio.io/docs/setup/kubernetes/sidecar-injection.html)
