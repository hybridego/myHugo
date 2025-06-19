---
author: Lionel.J
title: Hugo install
subtitle: How to install hugo
description: 간단히 Hugo를 설치하는 방법을 정리합니다.
date: 2025-05-26T14:16:23+09:00
publishDate: 2025-06-13
image: ""
tags: [go, golang, hugo, github, github actions, github.io, blog]
categories: [ Tech ]
URL: "/2025/06/13/Unicast_Broadcast_Multicast_SubnetMask"
draft: false
---

1. hugo 설치
   `winget install Hugo.Hugo.Extended`
2. hugo uninstall
   `winget uninstall --name "Hugo (Extended)"`
   
3. site 만들기
	```
	PS D:\dev> hugo new site hybridego_playground
	Congratulations! Your new Hugo site was created in D:\dev\hybridego_playground.
	
	Just a few more steps...
	
	1. Change the current directory to D:\dev\hybridego_playground.
	2. Create or install a theme:
	   - Create a new theme with the command "hugo new theme <THEMENAME>"
	   - Or, install a theme from https://themes.gohugo.io/
	1. Edit hugo.toml, setting the "theme" property to the theme name.
	2. Create new content with the command "hugo new content <SECTIONNAME>\<FILENAME>.<FORMAT>".
	3. Start the embedded web server with the command "hugo server --buildDrafts".
	
	See documentation at https://gohugo.io/.
	```
4. git 설정 및 테마 설정
   ```
   cd hybridego_playground
   git init
   git submodule add [git 주소] themes/[테마 이름]
   git submodule add https://github.com/zhaohuabing/hugo-theme-cleanwhite.git themes/hugo-theme-cleanwhite
   ```
   git ssh 관련 에러가 발생하면 Git의 SSL 검증을 임시로 비활성화
   ```
   git config --global http.sslVerify false
   작업 후
   git config --global http.sslVerify true
   ```
5. build
	```
	hugo serve -t  hugo-theme-cleanwhite
	Watching for changes in D:\dev\hybridego_playground\{archetypes,assets,content,data,i18n,layouts,static,themes}
	Watching for config changes in D:\dev\hybridego_playground\hugo.toml
	Start building sites …
	hugo v0.147.0-7d0039b86ddd6397816cc3383cb0cfa481b15f32+extended windows/amd64 BuildDate=2025-04-25T15:26:28Z VendorInfo=gohugoio
	
	
	                   | EN
	-------------------+-----
	  Pages            |  8
	  Paginator pages  |  0
	  Non-page files   |  0
	  Static files     | 58
	  Processed images |  0
	  Aliases          |  1
	  Cleaned          |  0
	
	Built in 3033 ms
	Environment: "development"
	Serving pages from disk
	Running in Fast Render Mode. For full rebuilds on change: hugo server --disableFastRender
	Web Server is available at http://localhost:1313/ (bind address 127.0.0.1)
	```
