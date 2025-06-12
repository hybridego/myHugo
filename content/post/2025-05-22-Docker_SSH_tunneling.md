---
author: "Lionel.J"
showonlyimage: true
title:      "Docker SSH tunneling"
description: "How to setup ssh tunneling to docker container."
date:       2025-05-21T23:11:23+09:00
publishDate: 2025-05-21
tags:
    - docker 
    - ssh
    - tunneling
    - vscode
    - SSH Remote
image: "/img/2025-05-22-Docker_SSH_tunneling/background.jpg"
categories: [ Tech ]
URL: "/2025/05/21/Docker_SSH_tunneling"
draft: false
---

## Docker 와 ssh 터널링 설정

1. 처음 실행 (필요한 디렉토리 mount 하고 이미지와 shell 선택, user 지정)
```base
docker run -it \
  -v /home/lionelj:/home/lionelj \
  --name lj-ubuntu \
  -v /opt:/opt \
  ubuntu:24.04 \
  /bin/bash
```

2. Docker 에서 필요한 기본 설정
```bash
apt-get update 
apt-get install -y sudo 
apt-get install -y vim git zsh
groupadd -g 1016 lionelj 
useradd -u 1016 -g 1016 -m -s /bin/zsh lionelj

usermod -aG sudo lionelj #사용자를 sudo 그룹에 추가. -a: 기존 그룹을 유지하면서 추가. -G sudo: sudo 그룹에 추가.

sudo apt-get install -y locales
sudo locale-gen en_US.UTF-8
```

3. 다음부터는 만들어진 container로 접속
```bash
# container name으로 접속
docker start lj-ubuntu
# container id로 접속
docker start 708d99e6c6b9

# start 후 shell로 접속
docker exec -it lj-ubuntu /bin/bash
```

4. 컨테이너를 이미지로 만들기 (이렇게 하면 누적된 image를 다 유지해야 함. 중간 image 삭제 불가)
```bash
docker commit <컨테이너_ID> my-ubuntu:custom

# ex)
$ docker commit 7a613f013271 lionel-ubuntu:custom
sha256:ec1a4af2f69aa0b7b9366279979d80b0cce02ffd2b3f1e07f81ded54875f7666

$ docker images
REPOSITORY      TAG       IMAGE ID       CREATED         SIZE
lionel-ubuntu   custom    ec1a4af2f69a   6 seconds ago   235MB
ubuntu          24.04     602eb6fb314b   2 weeks ago     78.1MB
```

5. 새로 만든 이미지로 컨테이너 띄우기
```
$ docker images
REPOSITORY      TAG       IMAGE ID       CREATED          SIZE
lionel-ubuntu   24.04     fa9ec891a58d   24 seconds ago   235MB
ubuntu          24.04     602eb6fb314b   2 weeks ago      78.1MB

docker run -it \
  -v /home/lionelj:/home/lionelj \
  --name lj-ubuntu \
  -v /opt:/opt \
  lionel-ubuntu:24.04 \
  /bin/bash
```

6. ssh 설정 (container에 접속해서 sshd를 띄운다.)
```bash
mkdir /run/sshd 
/usr/sbin/sshd

# 컨테이너는 기본적으로 systemd를 사용하지 않으므로, systemctl 대신 직접 sshd를 실행.
```

7. ip 설정 (host 에서 docker container의 ip를 확인한다. ssh 터널링 설정을 해야 하기 때문)
```
$ ip addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
1839: eth0@if1840: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:ac:11:00:02 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.17.0.2/16 brd 172.17.255.255 scope global eth0  <<== 이 번호를 확인.
       valid_lft forever preferred_lft forever
```

- 또 다른 ip 확인 방법 (host에서)
```
$ docker inspect 85d05024ca50 | grep IPAddress
            "SecondaryIPAddresses": null,
            "IPAddress": "172.17.0.2",
                    "IPAddress": "172.17.0.2",
```

8. 컨테이너 중지 및 삭제 후 포트 매핑 포함하여 재실행
```
docker run -it --name lj-ubuntu \
  -v /home/lionelj:/home/lionelj \
  -v /opt:/opt \
  --user 1016:1016 \
  -p 2222:2222 \
  lj-ubuntu-3:24.04 \
  /bin/bash
```

9. 이미지 이름 바꾸는 방법
```bash
docker tag 원래_이미지_이름:태그 새_이미지_이름:태그
docker rmi 원래_이미지_이름:태그
```

- 접속 하는 방법 ssh 터널링 (윈도우에서 설정.)
```
ssh -L 2222:172.17.0.2:2222 lionelj@<호스트_IP>
ssh -L 2222:172.17.0.2:2222 lionelj@192.168.85.15
```

- Windows ssh 설정
```
C:\Users\lionel.j\.ssh\config 파일을 열고

Host lj-ubuntu
  HostName localhost
  User lionelj
  Port 2222

이렇게 추가 후
vscode 에서 Remote-SSH: Connect to Host...로 lj-ubuntu 로 접속.
```

---

## 다음부터 사용할 때는 이렇게

다 설정하면 이렇게 하면 됨.
```
docker start lj-ubuntu
docker exec -it lj-ubuntu /bin/bash
```

- **중요 docker에서 sshd를 띄워줘야 함**  
```
sudo /usr/sbin/sshd
```

```
windows 에서
ssh -L 2222:172.17.0.2:2222 lionelj@192.168.85.15
```