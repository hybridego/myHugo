---
author: Lionel.J
title: Squid 프록시 서버 설치 및 기본 설정
subtitle: 로컬 네트워크에서 Squid로 프록시를 구성하는 방법 — 설치, ACL, 인증, 클라이언트 설정
description: Squid 설치 및 서비스 제어, 주요 설정 예제(포트, ACL, 허용 IP, 로그)와 브라우저/시스템에서 프록시를 적용하는 방법을 정리합니다.
date: 2025-11-12T00:22:01+09:00
publishDate: 2025-11-12T22:11:01+09:00
image: ""
tags: [http, squid, proxy]
categories:  [ Tech ]
URL: "/2025/11/12/squid-proxt/"
draft: false
---

# squid

### 설치

```bash
sudo apt update 
sudo apt install squid
```

### 상태확인

- 설치하면 자동으로 시작 됨. 다음의 명령어로 상태 확인

```bash
sudo systemctl status squid
```

### 다시 실행하기

```bash
sudo squid -k parse  # 설정 오류 확인 (오류 없으면 OK)
sudo systemctl restart squid
sudo systemctl status squid  # active (running) 확인
sudo ufw allow 3128  # 방화벽 열기 (uFW 사용 시)
```

### 설정

- `/etc/squid/squid.conf` 파일을 수정해서 설정 가능

```plaintext
# cat /etc/squid/squid.conf
 
# 기본 포트 (터널링 모드, intercept 없음)
http_port 3128

# ACL 정의 (HTTPS CONNECT 허용 필수)
acl localnet src 192.168.71.0/24  # Raspberry Pi 네트워크 (IP 범위 조정 가능, 테스트용: acl localnet src 0.0.0.0/0)
acl SSL_ports port 443
acl Safe_ports port 80          # HTTP
acl Safe_ports port 443         # HTTPS (중복 포함으로 안전)
acl CONNECT method CONNECT

# 기본 포트 보호 (기본 deny)
http_access deny !Safe_ports
http_access deny CONNECT !SSL_ports

# 접근 허용 (localnet에 CONNECT 허용, 순서 중요: allow 전에 deny!)
http_access allow localnet Safe_ports
http_access allow CONNECT localnet SSL_ports
http_access deny all  # 마지막에 deny all

# 로그 및 캐시 (기본값)
access_log /var/log/squid/access.log squid
cache_dir ufs /var/spool/squid 100 16 256
coredump_dir /var/spool/squid

# 기타 (헤더 전달 위해 via off, 테스트용)
via off
```

- squid는 기본 포트가 3128

### 특정 ip만 허용 (Access control list)

- 위의 `acl localnet src 192.168.71.0/2` 대신 다음을 설정하고

```plaintext
acl allowed_ips src "/etc/squid/allowed_ips.txt"
```

#### 해당 파일을 만들어서 허용할 ip를 등록

```plaintext
# /etc/squid/allowed_ips.txt

192.168.33.1
# All other allowed IPs
```

### 기타 기능

- 인증된 사용자만 접근 하게 할 수도 있음. `/etc/squid/htpasswd`
- http 기본 자격증명 인증도 가능

사용하는 방법

1. 각 브라우저에서 proxy 설정을 하거나
2. `/etc/environment` 파일에서 전체 적용 가능.

```plaintext
pi@raspberrypi2:~/dev $ cat /etc/environment
http_proxy="http://192.168.71.39:3128/"
https_proxy="http://192.168.71.39:3128/"
no_proxy="localhost,127.0.0.1,192.168.71.117,192.168.71.118,239.0.0.0/8"
```
