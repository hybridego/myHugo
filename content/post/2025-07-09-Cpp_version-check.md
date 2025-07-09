---
author: Lionel.J
title: How to Check the C++ Version in Use
subtitle: How to Find Out Which C++ Version You Are Using
description: g++ 명령어로 현재 사용 중인 C++ 표준 버전을 쉽게 확인하는 방법을 안내합니다.
date: 2025-07-09T15:11:23+09:00
publishDate: 2025-07-09
image: ""
tags: [linux, cpp, c++, g++]
categories: Tech
draft: false
URL: "/2025/07/04/Cpp_version_check/"
---

# C++ 표준 버전 확인하기

    g++ -std=c++14 -E -dM -x c++ /dev/null | grep '__cplusplus'

이 명령은 g++ 컴파일러가 인식하는 C++ 표준 버전을 확인하는 명령입니다. 각 옵션의 역할은 다음과 같습니다:

- g++: GNU C++ 컴파일러를 실행합니다.
- -std=c++14: C++14 표준을 사용하도록 지정합니다. 다른 버전(c++11, c++17 등)으로 변경할 수 있습니다.
- -E: 전처리 단계만 수행하고 결과를 출력합니다. 컴파일 과정은 생략됩니다.
- -dM: 전처리된 출력에서 매크로 정의만 포함하도록 지정합니다.
- -x c++: 입력 파일의 종류를 C++ 소스 코드로 간주합니다.
- /dev/null: 실제 소스 코드 파일 대신 null 디바이스를 사용합니다. 이는 컴파일러 자체에서 정의된 매크로를 확인하기 위함입니다.
- | grep '__cplusplus': 전처리된 출력에서 __cplusplus 매크로를 검색하여 출력합니다.

__cplusplus 매크로는 컴파일러가 지원하는 C++ 표준 버전을 나타냅니다. 예를 들어, 출력이 201703L이면 C++17 표준을 지원함을 의미합니다.  

이 명령을 실행하면 컴파일러가 인식하는 C++ 버전이 출력됩니다. 예를 들어, g++ 7.5.0 버전에서 -std=c++14 옵션을 사용하면 __cplusplus=201402L이 출력됩니다.  

이 방법은 특정 컴파일러 버전에서 지원하는 C++ 표준 버전을 확인하고자 할 때 유용합니다. 프로젝트에 맞는 C++ 버전을 선택하거나 특정 기능이 지원되는지 확인할 수 있습니다.
