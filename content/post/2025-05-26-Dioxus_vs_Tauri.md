---
author: Lionel.J
title: Dioxus vs Tauri
subtitle: Brief Comparison of Dioxus and Tauri
description: Dioxus 와 Tauri의 간단한 비교
date: 2025-05-26T10:11:23+09:00
publishDate: 2025-05-26
image: ""
tags: [Dioxus, Tauri, rust]
categories: [ Tech ]
URL: "/2025/05/26/Dioxus_vs_Tauri"
draft: false
---


# Dioxus와 Tauri 비교

## Dioxus란?

Dioxus는 Rust로 작성된 풀스택 UI 프레임워크로, React와 유사한 선언적 프로그래밍 모델을 제공합니다. 웹, 데스크톱, 모바일, 서버사이드 렌더링(SSR), LiveView 등 다양한 플랫폼을 단일 코드베이스로 지원합니다. Rust의 메모리 안전성과 성능을 활용하여 빠르고 안정적인 애플리케이션을 개발할 수 있도록 설계되었습니다. Dioxus는 가상 DOM(Virtual DOM)을 사용하여 UI를 효율적으로 관리하며, React의 컴포넌트 기반 아키텍처와 유사한 개발 경험을 제공합니다. 또한, HTML과 CSS를 적극 활용하며, Tailwind CSS와 같은 외부 CSS 라이브러리와의 통합도 지원합니다. 모바일 지원은 Tauri의 Tao와 Wry 라이브러리를 활용하며, 특히 데스크톱과 웹에서 강력한 성능을 발휘합니다.[](https://dioxuslabs.com/blog/introducing-dioxus/)[](https://www.syntax-stories.com/2024/12/dioxus-framework.html)

### 주요 특징

- **React와 유사한 API**: 컴포넌트, props, hooks를 사용하여 직관적인 UI 개발.
- **렌더러 독립적**: 웹, 데스크톱, 모바일 등 다양한 플랫폼에서 동일한 코드 사용.
- **Rust 중심**: UI와 비즈니스 로직 모두 Rust로 작성 가능, JavaScript 의존성 최소화.
- **핫 리로딩**: 코드 수정 시 즉각적인 UI 반영으로 개발자 경험 향상.
- **모바일 지원**: iOS와 Android 지원, 하지만 모바일은 아직 실험적 단계.[](https://dioxuslabs.com/blog/release-040/)
- **커뮤니티 중심**: 활발한 Discord 및 GitHub 커뮤니티, 오픈소스 라이센스(MIT/Apache-2).

## Tauri란?

Tauri는 Rust로 작성된 경량 크로스 플랫폼 프레임워크로, 웹 프론트엔드(HTML/CSS/JavaScript)와 Rust 백엔드를 결합하여 데스크톱 및 모바일 애플리케이션을 빌드합니다. Electron의 대안으로, 시스템의 기본 WebView(예: Windows의 WebView2, macOS의 WebKit)를 사용하여 메모리 사용량과 실행 파일 크기를 최소화합니다. Tauri는 기존 웹 프레임워크(React, Vue, Svelte 등)를 프론트엔드로 사용하며, Rust로 작성된 백엔드 로직을 호출할 수 있는 구조를 제공합니다. 이를 통해 웹 개발자 친화적이면서 Rust의 성능과 안전성을 활용할 수 있습니다.[](https://www.infoworld.com/article/3547072/electron-vs-tauri-which-cross-platform-framework-is-for-you.html)[](https://v2.tauri.app/)

### 주요 특징

- **경량**: 시스템 WebView를 사용하여 실행 파일 크기(최소 600KB)와 메모리 사용량 감소.
- **웹 프론트엔드 호환**: React, Vue, Svelte 등 다양한 JavaScript 프레임워크 지원.
- **Rust 백엔드**: 고성능 및 메모리 안전성을 보장하는 Rust로 백엔드 로직 작성.
- **크로스 플랫폼**: Windows, macOS, Linux, Android, iOS 지원.
- **개발자 경험**: `cargo tauri dev` 명령어로 빠른 개발 및 핫 리로딩 지원.
- **보안**: Rust의 메모리 안전성과 WebView의 샌드박싱으로 보안 강화.

## Dioxus와 Tauri의 차이점

아래 표는 Dioxus와 Tauri의 주요 차이점을 비교한 것입니다.

|**항목**|**Dioxus**|**Tauri**|
|---|---|---|
|**프레임워크 유형**|풀스택 UI 프레임워크 (UI + 백엔드 모두 Rust로 작성 가능)|웹 프론트엔드 + Rust 백엔드 프레임워크|
|**프론트엔드**|Rust 기반, React 스타일의 RSX 매크로로 UI 작성, HTML/CSS 지원|JavaScript/TypeScript 기반 (React, Vue, Svelte 등), HTML/CSS 사용|
|**렌더링 방식**|가상 DOM(Virtual DOM)을 사용한 선언적 UI 렌더링|시스템 WebView를 통한 렌더링 (WebView2, WebKit 등)|
|**언어 의존성**|Rust 중심, JavaScript 최소화|JavaScript/TypeScript 필수 (프론트엔드), Rust (백엔드)|
|**파일 크기**|데스크톱/모바일 앱 ~5MB, 웹 앱 ~50KB|최소 600KB, 시스템 WebView 활용으로 경량|
|**성능**|Rust의 고성능, 가상 DOM 최적화로 빠름|시스템 WebView와 Rust 백엔드로 고성능, JavaScript로 인해 약간의 오버헤드 가능|
|**플랫폼 지원**|웹, 데스크톱, 모바일, TUI, SSR, LiveView (모바일은 실험적)|웹, 데스크톱, 모바일 (모바일은 Tauri 2.0에서 강화)|
|**개발자 친화성**|React 개발자 친화적, Rust 학습 필요|웹 개발자 친화적, JavaScript/TypeScript 개발자 접근 용이|
|**에코시스템**|Rust 기반 라이브러리 통합, 커뮤니티 중심 crates (예: Taffy, manganis)|JavaScript 에코시스템 활용, Tauri 전용 Rust 라이브러리 (Tao, Wry)|
|**주요 사용 사례**|Rust로 통합된 풀스택 앱 개발, 복잡한 UI와 상태 관리|기존 웹 앱을 데스크톱/모바일로 포팅, 경량 애플리케이션|
|**모바일 지원**|실험적, Tauri의 Tao/Wry 활용|Tauri 2.0에서 강화, 안정적 모바일 지원|
|**배포**|`dx bundle`로 macOS, Windows, Linux, iOS, Android 지원|`cargo tauri build`로 macOS, Windows, Linux, Android, iOS 지원|

## 언제 무엇을 선택해야 할까?

- **Dioxus 선택 시**:
    
    - Rust로 프론트엔드와 백엔드를 모두 작성하고 싶을 때.
    - React와 유사한 선언적 UI와 가상 DOM을 선호할 때.
    - JavaScript 의존성을 최소화하고 Rust의 안전성과 성능을 극대화하고자 할 때.
    - 풀스택 애플리케이션(웹, 데스크톱, 모바일)을 단일 코드베이스로 개발하고자 할 때.
- **Tauri 선택 시**:
    
    - 기존 웹 기술(React, Vue, Svelte 등)을 활용하여 빠르게 크로스 플랫폼 앱을 만들고 싶을 때.
    - 경량 실행 파일과 낮은 메모리 사용량이 중요한 경우.
    - 웹 개발자 팀이 JavaScript/TypeScript에 익숙하고 Rust를 백엔드에만 사용하고자 할 때.
    - 안정적인 모바일 지원이 필요한 경우 (Tauri 2.0 기준).

## 결론

Dioxus와 Tauri는 모두 Rust의 강점을 활용하지만, Dioxus는 Rust 중심의 풀스택 UI 프레임워크로, React 스타일의 개발 경험을 제공하며 JavaScript 의존성을 줄입니다. 반면, Tauri는 웹 프론트엔드와 Rust 백엔드를 결합하여 경량화된 크로스 플랫폼 앱 개발에 적합합니다. 프로젝트 요구사항, 팀의 기술 스택, 성능 및 배포 요구사항에 따라 적절한 프레임워크를 선택하세요.[](https://medium.com/solo-devs/tauri-vs-dioxus-the-ultimate-rust-showdown-5d8d305497d6)

### 참고 자료

- Dioxus 공식 사이트: [https://dioxuslabs.com/](https://dioxuslabs.com/)
- Tauri 공식 사이트: [https://v2.tauri.app/](https://v2.tauri.app/)
- GitHub: [Dioxus](https://github.com/DioxusLabs/dioxus), [Tauri](https://github.com/tauri-apps/tauri)
