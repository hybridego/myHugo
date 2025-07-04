---
author: Lionel.J
title: linux 에서 시스템 Buff and Cache 비우기
subtitle: linux 시스템의 버퍼와 캐시를 비우는 방법
description: 강제로 캐시를 비우게 한다.
date: 2025-07-02T15:35:23+09:00
publishDate: 2025-07-02
image: ""
tags: [linux, drop_caches, stress]
categories: Tech
URL: "/2025/07/02/Empty-Buff-Cache"
draft: false
---

- /proc/sys/vm/drop_caches 사용
리눅스 커널은 /proc/sys/vm/drop_caches 파일을 통해 캐시를 강제로 비울 수 있는 인터페이스를 제공합니다. 이 방법을 사용하려면 **루트 권한**이 필요합니다.
```
# 캐시 비우기 (페이지 캐시만 비움)
echo 1 | tee /proc/sys/vm/drop_caches

# 덴트리(dentries)와 아이노드(inode) 캐시 비우기
echo 2 | tee /proc/sys/vm/drop_caches

# 페이지 캐시, 덴트리, 아이노드 모두 비우기 (가장 강력)
echo 3 | tee /proc/sys/vm/drop_caches
```

- 강제로 비우는 대신, 큰 메모리를 사용하는 프로그램(예: stress 도구)을 실행해 시스템이 자연스럽게 buff/cache를 비우도록 유도할 수도 있습니다.
```
sudo apt install stress  # 설치 (Ubuntu/Debian 기준)
stress --vm 1 --vm-bytes 200G  # 200GB 메모리 사용 시뮬레이션
```
