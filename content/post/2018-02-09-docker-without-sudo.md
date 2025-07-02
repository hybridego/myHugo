---
layout:     post
title:      "sudo 없이 Docker 명령을 실행하는 방법"
subtitle:   ""
description: "sudo 없이 Docker 명령을 실행하는 방법"
excerpt: "sudo 없이 Docker 명령을 실행하는 방법"
date:       2018-02-09 10:00:00
author:     "Lionel.J"
image:     "/img/docker.jpg"
publishDate: 2018-02-09 10:00:00
showtoc: false
tags:
    - Tips
    - Docker
URL: "/2018/02/09/docker-without-sudo/"
categories: [ Tips ]
---

### Docker 그룹이 아직 존재하지 않으면 추가합니다:

`sudo groupadd docker`

### 연결된 사용자 "$USER"를 docker 그룹에 추가합니다. 현재 사용자를 사용하지 않으려면 사용자 이름을 원하는 사용자와 일치하도록 변경하십시오:

`sudo gpasswd -a $USER docker`

### 그룹 변경 사항을 활성화하려면 newgrp docker를 실행하거나 로그아웃/로그인하십시오.
