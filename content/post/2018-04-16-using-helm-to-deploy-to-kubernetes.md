---
layout:     post
title:      "Helm을 사용하여 Kubernetes에 배포하는 방법"
subtitle:   ""
description: "Helm을 사용하여 Kubernetes에 배포하는 방법"
date:       2018-04-16 10:00:00
author:     "Lionel.J"
image: "/img/kubernetes.jpg"
publishDate: 2018-04-16 10:00:00
tags:
    - Kubernetes
    - Helm
URL: "/2018/04/16/using-helm-to-deploy-to-kubernetes/"
categories: [ Tech ]
---
## Helm이란?
Helm은 Kubernetes 애플리케이션을 관리하는 도구입니다. Helm은 Kubernetes 애플리케이션을 패키징하고 배포하는 데 사용됩니다. Helm은 Kubernetes 애플리케이션을 쉽게 설치, 업그레이드, 롤백할 수 있도록 도와줍니다.

## Helm 설치
Helm을 설치하려면 다음 명령을 실행합니다.
```
curl https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3 | bash
```

## Helm 차트
Helm 차트는 Kubernetes 애플리케이션을 정의하는 파일 모음입니다. 차트는 애플리케이션의 모든 리소스(예: Deployment, Service, Ingress)를 포함합니다.

## Helm 차트 생성
새 Helm 차트를 생성하려면 다음 명령을 실행합니다.
```
helm create mychart
```
이 명령은 `mychart`라는 디렉토리를 생성하고, 이 디렉토리에는 차트의 기본 구조가 포함됩니다.

## Helm 차트 배포
Helm 차트를 Kubernetes 클러스터에 배포하려면 다음 명령을 실행합니다.
```
helm install my-release ./mychart
```
여기서 `my-release`는 배포의 이름이고, `./mychart`는 차트의 경로입니다.

## Helm 차트 업그레이드
배포된 Helm 차트를 업그레이드하려면 다음 명령을 실행합니다.
```
helm upgrade my-release ./mychart
```

## Helm 차트 롤백
배포된 Helm 차트를 이전 버전으로 롤백하려면 다음 명령을 실행합니다.
```
helm rollback my-release
```

## Helm 차트 삭제
배포된 Helm 차트를 삭제하려면 다음 명령을 실행합니다.
```
helm uninstall my-release
