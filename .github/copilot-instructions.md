# Project Overview

이 프로젝트는 hugo 기반의 개인 블로그 입니다.
블로그의 작성자는 Lionel.J 입니다.

# post header example

포스트 글의 헤더는 다음과 같은 형식을 따릅니다.
모든 Post 글의 첫 부분은 다음과 같은 yaml 메타데이터 블록으로 시작해야 합니다.

```yaml
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
URL: "/2025/07/02/Empty-Buff-Cache/"
draft: false
---
```

## 작성 가이드 (간단)

- 작성 언어: 포스트 본문은 한국어 또는 영어로 작성할 수 있습니다. 메타데이터(`title`, `description`, `subtitle`)는 글 언어에 맞춰 작성해주세요.
- author 필드는 항상 `Lionel.J`로 둡니다.
- 파일 경로: `content/post/` 아래에 `YYYY-MM-DD-슬러그.md` 형태로 저장합니다. (날짜와 파일명은 URL 규칙과 일치시키면 좋습니다.)
- 이미지: 이미지 필드는 `image`에 상대 경로(예: `/img/2025/07/02/my-image.png`)나 빈 문자열을 넣을 수 있습니다. `static/` 아래에 이미지를 넣으면 빌드 시 `/img/...`로 접근 가능합니다.
- draft: 임시 글은 `draft: true`로 설정하세요. 로컬 미리보기 시 `hugo server -D`로 draft를 포함해 확인할 수 있습니다.

## frontmatter 필드 설명

- author: 작성자(고정: `Lionel.J`).
- title: 포스트 제목.
- subtitle: (선택) 제목 아래 보여줄 보조 문구.
- description: SEO/요약용 한 줄 설명.
- date: 작성/발행 일시. 형식: `YYYY-MM-DDTHH:MM:SS+09:00` (예: `2025-07-02T15:35:23+09:00`).
- publishDate: (선택) 공개할 날짜만 필요하면 사용.
- image: 대표 이미지 경로 또는 빈 문자열.
- tags: 태그 목록(작게, 핵심 단어 위주로). 예: `[linux, performance]`.
- categories: 주 카테고리(예: `Tech`, `Notes`).
- URL: 포스트의 퍼머링크(필요 시 수동 지정).
- draft: true/false (초기 draft 작성 시 true).

## Copilot 사용 예시 (프롬프트 템플릿)

아래 프롬프트를 Copilot(또는 이 리포지토리의 AI 보조 기능)에 사용하면 글 작성이 편합니다. 필요에 따라 문장/어조를 조정하세요.

- '이 주제에 대한 블로그 초안을 한국어로 800~1200자 분량으로 만들어줘. 기술적 세부사항(명령어, 예제 코드, 결과 설명 포함)을 포함해줘.'
- '위 초안을 기반으로 서론/본문/결론 구조로 나누고, 각 섹션에 소제목을 추가해줘.'
- '다음 YAML frontmatter를 생성해줘. title, subtitle, description, tags, categories, date(현재 시각)을 포함하고 draft는 false로 설정해줘.'
- '마크다운 코드블록에 들어갈 예제 명령어는 한 줄씩 주석으로 설명을 추가해줘.'

예시(한국어):

"Linux에서 버퍼와 캐시를 비우는 방법에 대한 블로그 포스트 초안을 한국어로 작성해줘. 약 1000자. 명령어 예제와 결과 확인 방법을 포함하고, 코드를 설명하는 간단한 주석을 달아줘."

## 작성 워크플로우 & 로컬 미리보기

- 새 포스트 생성: `content/post/YYYY-MM-DD-슬러그.md` (archetype이 있으면 `hugo new post/슬러그.md` 사용 가능).
- 로컬에서 확인: 프로젝트 루트에서

## 아키타입(archetypes) 활용

- `archetypes/post.md` 파일에는 포스트 생성 시 기본 frontmatter 템플릿이 들어있습니다. 새 글을 만들 때 일관된 메타데이터를 유지하려면 archetype을 수정/확인하세요.

## 태그/카테고리 규칙(권장)

- categories: 글의 상위 분류(예: `Tech`, `Notes`, `DevOps`) — 가능한 소수(1개 권장).
- tags: 검색 및 분류용 키워드 — 상세하지만 과도하지 않게(3~7개 권장).

## 커밋 메시지 권장 형식

- 새 글 추가: `post: add YYYY-MM-DD-슬러그.md - <짧은 설명>`
- 내용 수정: `post: update YYYY-MM-DD-슬러그.md - <간단한 변경사항>`

## 간단한 체크리스트(발행 전)

1. frontmatter의 `date`/`publishDate`가 정확한가?
2. `draft: false`로 설정되어 있는가?
3. 이미지 경로와 파일이 `static/` 또는 `public/`에 존재하는가?
4. 로컬에서 링크/이미지/코드블록이 정상 동작하는가?
