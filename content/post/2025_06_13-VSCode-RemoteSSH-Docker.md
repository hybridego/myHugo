---
author: Lionel.J
title: vscode remoteSSH용 docker 생성
subtitle: docker에 SSH ternneling을 사용해서 vscode remote ssh를 연결하자
description: docker를 만들고 ssh ternneling 으로 vscode retmoe ssh를 붙이는 방법
date: 2025-06-18T16:16:23+09:00
publishDate: 2025-06-18
image: ""
tags: [docker, ssh, ternneling, remoteSSH, vscode]
categories: Tech
URL: "/2025/06/18/VSCode-RemoteSSH-Docker"
draft: false
---

1. 사용자에게 docker 권한 부여하기
	```shell
	sudo usermod -aG docker $USER
	newgrp docker
	```

2. Dockerfile 작성
	```
	FROM ubuntu:24.04
	
	# Install required packages for minimal build environment and requested tools
	RUN apt-get update && \
	    apt-get install -y \
	    build-essential \
	    cmake \
	    clang-tidy \
	    git \
	    vim \
	    sudo \
	    zsh \
	    openssh-server \
	    locales && \
	    apt-get clean && \
	    rm -rf /var/lib/apt/lists/*
	
	# Configure locale
	RUN locale-gen en_US.UTF-8
	ENV LANG en_US.UTF-8
	ENV LANGUAGE en_US:en
	ENV LC_ALL en_US.UTF-8
	
	# Create user and group
	RUN groupadd -g 1016 lionelj && \
	    useradd -u 1016 -g 1016 -m -s /bin/zsh lionelj && \
	    usermod -aG sudo lionelj
	
	# Configure SSH
	RUN mkdir /var/run/sshd && \
	    echo "lionelj ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/lionelj && \
	    chmod 0440 /etc/sudoers.d/lionelj && \
	    sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config
	
	# Expose SSH port
	EXPOSE 2222
	
	# Start SSH server
	CMD ["/usr/sbin/sshd", "-D"]
	```

3. build
	```shell
	docker build -t lionel-build-env:v1 .
	
	# 잘 성공하면 다음과 같이 나옴
	docker images
	
	REPOSITORY                                           TAG            IMAGE ID       CREATED         SIZE
	lionel-build-env                                     v1             f061ec87e272   8 minutes ago   1.6GB
	```

4. 빌드 잘 되었는지 테스트 (ssh로 접속해본다.)
	```shell
	# 2222 포트를 22포트로 매핑
	docker run -d -p 2222:22 --name lio-container lionel-build-env:v1
	
	# 최초 암호 설정
	docker exec -it lio-container passwd lionelj
	```

5. 컨테이너 중지, 삭제, 포트 매핑 환경 포함하여 재시작
	```shell
	# 중지
	docker stop 9d58655d09c7
	#삭제
	docker rm -f 9d58655d09c7
	# 재시작
	docker run -it --name lio-container \
	  -v /home/lionelj:/home/lionelj \
	  -v /opt:/opt \
	  --user 1016:1016 \
	  -p 2222:2222 \
	  lionel-build-env:v1 \
	  /bin/zsh
	```

6. ip 설정 (host 에서 docker container의 ip를 확인한다. ssh 터널링 설정을 해야 하기 때문)
	```
	ip addr
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
	```shell
	sudo docker inspect dc6d671ba3b0 | grep IPAddress
			"SecondaryIPAddresses": null,
			"IPAddress": "172.17.0.2",
					"IPAddress": "172.17.0.2",
	```

7. 윈도우에서 터널링 설정
	```shell
	ssh -L 2222:172.17.0.2:2222 lionelj@<호스트_IP>
	ssh -L 2222:172.17.0.2:2222 lionelj@192.168.71.41
	```

8. Windows ssh 설정
	```
	C:\Users\lionel.j\.ssh\config 파일을 열고
	
	Host heimdall
	  HostName localhost
	  User lionelj
	  Port 2222
	
	이렇게 추가 후
	vscode 에서 Remote-SSH: Connect to Host...로 heimdall 로 접속.
	```

9. 뭔가 잘 안되는 것 같으면 다음 명령으로 ssh 접속 테스트를 해 볼 수 있다.
   ```shell
   ssh -v lj-ubuntu
   ```
