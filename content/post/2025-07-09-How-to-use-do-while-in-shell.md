---
author: Lionel.J
title: How to Use do-while Loops in Shell Scripts
subtitle: Practical Examples of Infinite Loops in Bash
description: Bash에서 do-while 패턴을 사용하여 무한 루프를 구현하고, 시스템 정보를 주기적으로 확인하는 방법을 소개합니다.
date: 2025-07-09T15:13:23+09:00
publishDate: 2025-07-09
image: ""
tags: [linux, shell, do-while]
categories: Tech
draft: false
URL: "/2025/07/04/How_to_use_do_while_in_shell/"
---
# How to Use do-while Loops in Shell Scripts

## Practical Examples of Infinite Loops in Bash

### Bash에서 do-while 패턴을 사용하여 무한 루프를 구현하고, 시스템 정보를 주기적으로 확인하는 방법을 소개합니다.

```bash
while true; do cat /sys/devices/platform/f01d0000.adc/iio:device0/in_voltage3_raw; sleep 1; done
```

```bash
while true; do cat /sys/devices/platform/f01d0000.adc/iio:device0/in_voltage3_raw; done
```

```bash
while true; do free -h; sleep 1; echo "---"; done
```
