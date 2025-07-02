---
layout:     post
title:      "내 Ubuntu 데스크톱 설정에 대한 모든 것"
description: "내 Ubuntu 데스크톱 설정에 대한 모든 것, 나중에 필요할 경우를 대비한 메모입니다."
excerpt: "내 Ubuntu 데스크톱 설정에 대한 모든 것, 나중에 필요할 경우를 대비한 메모입니다."
date:    2018-05-24
author:     "Lionel.J"
image: "/img/2018-05-23-service_2_service_auth/background.jpg"
publishDate: 2018-05-24
tags:
    - ubuntu
URL: "/2018/05/24/set_up_my_ubuntu_desktop/"
categories: [ "Tips" ]
---

## SSH 키 쌍 생성

```
ssh-keygen -C "zhaohuabing@gmail.com"
```

## Shadowsocks

Shadowsocks 설치

```
sudo apt-get install python3-pip

sudo pip3 install shadowsocks
```

다음 내용을 포함하는 `config/shadowsocks.json`에 구성 파일 생성:

```
{
	"server":"remote-shadowsocks-server-ip-addr",
	"server_port":443,
	"local_address":"127.0.0.1",
	"local_port":1080,
	"password":"your-passwd",
	"timeout":300,
	"method":"aes-256-cfb",
	"fast_open":false,
	"workers":1
}
```

로컬 socks 프록시 시작

```
sudo sslocal -c config/shadowsocks.json -d start
```

openssl 오류가 발생하면 shadowsocks 소스 파일 수정.

```
sudo vi /usr/local/lib/python3.6/dist-packages/shadowsocks/crypto/openssl.py

:%s/cleanup/reset/gc
```

shadowsocks socks 프록시를 http 프록시로 변환

```
sudo apt-get install polipo

echo "socksParentProxy = localhost:1080" | sudo tee -a /etc/polipo/config
sudo service polipo restart
```

이제 Http 프록시는 포트 8123에서 사용 가능합니다.

# Bing 배경화면을 데스크톱 배경으로 설정

```
sudo add-apt-repository ppa:whizzzkid/bingwallpaper
sudo apt-get update
sudo apt-get install bingwallpaper
```

# bash에서 vim 모드 사용

```
echo 'set -o vi'>> ~/.bashrc
