---
layout:     post
title:      "HTTP 프록시 뒤에서 Docker를 사용하는 방법"
subtitle:   ""
description: "HTTP 프록시 뒤에서 Docker를 사용하는 방법"
date:       2018-03-13 18:00:00
author:     "Lionel.J"
image: "/img/docker.jpg"
publishDate: 2018-03-13 18:00:00
tags:
    - Tips
    - Docker
URL: "/2018/03/13/use-docker-behind-http-proxy/"
categories: [ Tips ]
---
## Ubuntu
### Docker에서 HTTP 프록시 설정
```
sudo /etc/default/docker

export http_proxy="http://127.0.0.1:3128/"
export https_proxy="http://127.0.0.1:3128/"
export HTTP_PROXY="http://127.0.0.1:3128/"
export HTTPS_PROXY="http://127.0.0.1:3128/"
```
<!--more-->
### 설정 로드 및 Docker 재시작
```
sudo service docker restart
```
## CentOS
### Docker에서 HTTP 프록시 설정
```
sudo mkdir -p /etc/systemd/system/docker.service.d

echo '
[Service]
Environment="HTTP_PROXY=http://proxy.foo.bar.com:80/"
' | sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf
```

### 설정 로드 및 Docker 재시작
```
sudo systemctl daemon-reload
sudo systemctl restart docker
