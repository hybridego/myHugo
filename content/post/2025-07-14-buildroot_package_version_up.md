---
author: Lionel.J
title: Buildroot Package version up
subtitle: buildroot 에서 특정 패키지 version을 변경
description: 최신 버전으로 packager 버전을 올리는 방법
date: 2025-07-14T10:03:23+09:00
publishDate: 2025-07-14
image: ""
tags: [linux, buildroot]
categories: Tech
URL: "/2025/07/14/Buildroot-package-version-up/"
draft: false
---

# buildroot version 변경하는 방법

```
make nt98567_buildroot_defconfig
```

```
make clean
make <패키지이름>-rebuild
```

- 패키지의 소스코드를 수정했다면, 캐시를 지우고 빌드해야 합니다
```
make <패키지이름>-dirclean
make <패키지이름>
```

- packagename.mk 에 다음과 같이 써있으면 host 설정에 따르는 것임
```
$(eval $(virtual-package))
$(eval $(host-virtual-package))
```

- **host package 의 버전 확인하기**
```
pkg-config --modversion zlib
```

# sha256 hash값 구하기
```
sha256sum 파일이름
```
