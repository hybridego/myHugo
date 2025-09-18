---
author: Lionel.J
title: PulseAudio 사용 multicast 구현
subtitle: pipewire-pulse
description: pipewire 기반 pulseAudio 인터페이스
date: 2025-08-10T20:01:23+09:00
publishDate: 2025-08-10
image: ""
tags: [linux, pipeWire, ALSA, pulseAudio, JACK]
categories: Tech
draft: false
URL: "/2025/08/10/pulseAudio/"
---

1. buildroot 에 pulseaudio 추가 하고 빌드
2. output/nt98567/nt98567 에서
   fd pulse 로 찾음
3. 다음의 파일들을 해당 rootfs 위치로 복사
```
$ fd pulse
usr/bin/pulseaudio
usr/share/pulseaudio/
usr/lib/libpulse-mainloop-glib.so.0
usr/lib/libpulse-mainloop-glib.so
usr/lib/libpulse-mainloop-glib.so.0.0.6
usr/lib/libpulse.so.0
usr/lib/libpulse-simple.so.0.1.1
usr/lib/libpulse.so
usr/lib/libpulse.so.0.24.2
usr/lib/libpulse-simple.so.0
usr/lib/libpulse-simple.so
etc/init.d/S50pulseaudio
usr/share/bash-completion/completions/pulseaudio
etc/pulse/
usr/lib/pulseaudio/
usr/lib/pulseaudio/libpulsedsp.so
usr/lib/pulseaudio/libpulsecommon-16.1.so
usr/lib/pulseaudio/libpulsecore-16.1.so
etc/dbus-1/system.d/pulseaudio-system.conf
sudo cp -a ./usr /home/lionelj/test/ipas/bwc_firmware/nt98567_2/
sudo cp -a ./etc/pulse /home/lionelj/test/ipas/bwc_firmware/nt98567_2/etc/
sudo cp -a ./etc/dbus-1/system.d/pulseaudio-system.conf /home/lionelj/test/ipas/bwc_firmware/nt98567_2/etc/dbus-1/system.d/
sudo cp -a ./etc/init.d/S50pulseaudio /home/lionelj/test/ipas/bwc_firmware/nt98567_2/etc/init.d/
```
4. `rm /etc/init.d/S25_Net`
5. dbus 세팅
- /etc/dbus-1/system.d/pulseaudio-system.conf 수정
```
<?xml version="1.0"?><!--*-nxml-*-->
<!DOCTYPE busconfig PUBLIC "-//freedesktop//DTD D-BUS Bus Configuration 1.0//EN"
 "http://www.freedesktop.org/standards/dbus/1.0/busconfig.dtd">
<!--
This file is part of PulseAudio.
PulseAudio is free software; you can redistribute it and/or modify it
under the terms of the GNU Lesser General Public License as
published by the Free Software Foundation; either version 2.1 of the
License, or (at your option) any later version.
PulseAudio is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General
Public License for more details.
You should have received a copy of the GNU Lesser General Public
License along with PulseAudio; if not, see <http://www.gnu.org/licenses/>.
-->
<busconfig>
  <!-- System-wide PulseAudio runs as 'pulse' user. This fragment is
       not necessary for user PulseAudio instances. -->
  <policy user="pulse">
    <allow own="org.pulseaudio.Server"/>
  </policy>
  <policy at_console="true">
    <allow send_destination="org.pulseaudio.Server"/>
  </policy>
  <policy context="default">
    <deny send_destination="org.pulseaudio.Server"/>
  </policy>
</busconfig>
```
- dbus 재시작
```
killall dbus-daemon
dbus-daemon --system --nofork --nopidfile &
```
 
6. pulseAudio 세팅
```
echo "pulse:x:999:" >> /etc/group
echo "pulse-access:x:1001:root" >> /etc/group
echo "pulse:x:999:999:PulseAudio User:/var/run/pulse:/sbin/nologin" >> /etc/passwd
echo "pulse:*:18800:0:99999:7:::" >> /etc/shadow
mkdir -p /var/run/pulse /var/lib/pulse
chown -R pulse:pulse /var/run/pulse /var/lib/pulse
👉
chmod -R 755 /var/run/pulse /var/lib/pulse
chown pulse:pulse /etc/pulse/system.pa
chmod 644 /etc/pulse/system.pa
chown pulse:pulse /etc/pulse/client.conf
chmod 644 /etc/pulse/client.conf
# audio 그룹에 pulse 추가
sed -i 's/^audio:x:[0-9]*:/&pulse,/' /etc/group
export XDG_RUNTIME_DIR=/run/user/0
mkdir -p /run/user/0
chown root:root /run/user/0
# pulse 사용자가 ALSA 장치에 접근할 수 있도록:
👉
chown pulse:pulse /dev/snd/*
chmod 660 /dev/snd/*
export PULSE_RUNTIME_PATH=/var/run/pulse
export PULSE_CLIENTCONFIG=/etc/pulse/client.conf
# Restart PulseAudio and check logs:
pulseaudio --kill
pulseaudio --system --disallow-exit --disallow-module-loading=0 --verbose &
pulseaudio --system --disallow-exit --disallow-module-loading=0 --verbose > pulseaudio.log 2>&1 &
pactl info
pactl list modules | grep -E "null-sink|rtp|combine|alsa"
# Look for 'nvtcard', 'rtp_multicast', 'combined'
pactl list sinks
paplay --device=combined golden.mp3
paplay --device=combined ./sine_48_le16s_1ch.wav
paplay --device=nvtcard ./sine_48_le16s_1ch.wav
```
---
- /etc/pulse/default.pa 수정
```
# module-detect를 주석 처리하여 자동 탐지 비활성화:
#load-module module-detect
# ALSA 싱크/소스 명시적으로 추가:
load-module module-alsa-sink device=hw:0,0 sink_name=nvtcard
load-module module-alsa-source device=hw:0,0
- device=hw:0,0: aplay -l에서 확인된 card 0: nvtcard, device 0.
- sink_name=nvtcard: PulseAudio에서 사용할 이름.
- RTP 스트리밍을 위해 추가:
load-module module-null-sink sink_name=rtp_multicast
load-module module-rtp-send source=rtp_multicast.monitor destination=224.0.0.56 port=4010 loop=0
- 자체 재생과 스트리밍 동시 지원을 위해 module-combine-sink 추가:
load-module module-combine-sink sink_name=combined slaves=nvtcard,rtp_multicast
```
- /etc/pulse/default.pa 수정 필요
```
# Disable auto detection to avoid failures
#load-module module-detect
# Load ALSA sink for local playback
load-module module-alsa-sink device=hw:0,0 sink_name=nvtcard
# Load null-sink for RTP streaming
load-module module-null-sink sink_name=rtp_multicast
# Load RTP send module
load-module module-rtp-send source=rtp_multicast.monitor destination=224.0.0.56 port=4010 loop=0
# Combine for simultaneous local + RTP output
load-module module-combine-sink sink_name=combined slaves=nvtcard,rtp_multicast
```
# 수신 디바이스
```
# rtp_recv 용 null-sink 추가
pactl unload-module module-rtp-recv
pactl load-module module-rtp-recv sap_address=224.0.0.56 sink=nvtcard
pactl load-module module-rtp-recv sap_address=224.0.0.56 sink=nvtcard latency_msec=10
paplay --device=rtp_multicast /root/sine8.wav
```
# 로딩된 모듈 리스트 확인
```
pactl list short modules
pactl list module
```
# 기본 소스 확인:
- source=default는 현재 시스템의 기본 소스를 사용합니다. 어떤 소스가 기본인지 확인하려면 pactl list sources short 명령을 실행해 보세요. 예를 들어, 마이크 입력을 사용하려면 해당 소스 이름을 명시적으로 지정(예: source=alsa_input.hw:0,0)하는 것이 더 안전할 수 있습니다.
```
pactl list sources short
```
# inittab 에 추가
```
# PulseAudio를 pulse 유저 대신 root로 실행하도록 설정.
# Buildroot init 스크립트(/etc/init.d/pulseaudio)나 inittab에 추가:
::respawn:/usr/bin/pulseaudio --system --daemonize --high-priority=no --realtime=no -nF /etc/pulse/system.pa
```
# ntp 설정 (target 에서)
```
busybox ntpd -p 192.168.71.41 -g -n
```
# ffmpeg 변환
```
ffmpeg -i test.mp3 -t 30 -c:a pcm_s16le test_30s.wav
```
## 명령어
```
chown pulse:pulse /dev/snd/*
chmod -R 755 /var/run/pulse /var/lib/pulse
chmod 660 /dev/snd/*
export PULSE_RUNTIME_PATH=/var/run/pulse
export PULSE_CLIENTCONFIG=/etc/pulse/client.conf
pulseaudio --kill
pulseaudio --system --disallow-exit --disallow-module-loading=0 --verbose &
pulseaudio --system --disallow-exit --disallow-module-loading=0 --log-level=info &
pulseaudio --system --disallow-exit --disallow-module-loading=0 &
busybox ntpd -p 192.168.71.41 -g -n
paplay --device=rtp_multicast ./sine_48_le16s_1ch.wav
paplay --device=nvtcard ./sine_48_le16s_1ch.wav
paplay --device=combined ./sine_48_le16s_1ch.wav
pactl unload-module module-rtp-recv
pactl load-module module-rtp-recv sap_address=224.0.0.56 sink=nvtcard latency_msec=200
pactl load-module module-rtp-recv sink=nvtcard latency_msec=200
pactl list sinks short
pactl list sources short
pactl list modules short
```

필요한것
```
$ sudo dpkg -l | grep pulse
ii  libpulse-mainloop-glib0:amd64                 1:15.99.1+dfsg1-1ubuntu2.2              amd64        PulseAudio client libraries (glib support)
ii  libpulse0:amd64                               1:15.99.1+dfsg1-1ubuntu2.2              amd64        PulseAudio client libraries
ii  libpulsedsp:amd64                             1:15.99.1+dfsg1-1ubuntu2.2              amd64        PulseAudio OSS pre-load library
ii  pipewire-pulse                                0.3.48-1ubuntu3                         amd64        PipeWire PulseAudio daemon
ii  pulseaudio                                    1:15.99.1+dfsg1-1ubuntu2.2              amd64        PulseAudio sound server
ii  pulseaudio-module-bluetooth                   1:15.99.1+dfsg1-1ubuntu2.2              amd64        Bluetooth module for PulseAudio sound server
ii  pulseaudio-utils                              1:15.99.1+dfsg1-1ubuntu2.2              amd64        Command line tools for the PulseAudio sound server
```
