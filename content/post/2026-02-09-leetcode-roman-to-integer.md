---
author: Lionel.J
title: "LeetCode 13. Roman to Integer 풀이 (Rust)"
subtitle: "로마 숫자를 정수로 변환하기 — Rust의 패턴 매칭을 활용한 풀이"
description: "LeetCode 13번 Roman to Integer 문제를 Rust로 풀어봤습니다. peekable iterator와 패턴 매칭을 활용한 깔끔한 풀이 방법을 정리합니다."
date: 2026-02-09T22:00:00+09:00
publishDate: 2026-02-09T22:00:00+09:00
image: ""
tags: [LeetCode, Rust, Algorithm, 코딩테스트]
categories: [ LeetCode ]
URL: "/2026/02/09/leetcode-roman-to-integer/"
draft: false
---

LeetCode의 Roman to Integer 문제를 Rust로 풀어봤습니다.

---

## 문제 설명

로마 숫자는 7개의 심볼로 표현됩니다:

| Symbol | Value |
|--------|-------|
| I | 1 |
| V | 5 |
| X | 10 |
| L | 50 |
| C | 100 |
| D | 500 |
| M | 1000 |

일반적으로 큰 값에서 작은 값 순서로 왼쪽에서 오른쪽으로 쓰지만, 다음 6가지 경우는 **뺄셈 규칙**이 적용됩니다:

- `IV` = 4, `IX` = 9
- `XL` = 40, `XC` = 90  
- `CD` = 400, `CM` = 900

---

## 풀이 접근법

핵심 아이디어는 **다음 문자를 미리 확인(peek)**해서 뺄셈 규칙에 해당하는지 판단하는 것입니다.

Rust의 `peekable()` iterator를 활용하면 현재 문자와 다음 문자를 동시에 확인할 수 있어서 이 문제에 딱 맞습니다.

---

## Rust 코드

```rust
impl Solution {
    pub fn roman_to_int(s: String) -> i32 {
        let mut iter = s.chars().peekable();
        let mut sum = 0;

        while let Some(cur_char) = iter.next() {
            sum += match (cur_char, iter.peek()) {
                // 뺄셈 규칙 처리 (두 문자를 소비)
                ('I', Some(&'V')) => { iter.next(); 4 },
                ('I', Some(&'X')) => { iter.next(); 9 },
                ('X', Some(&'L')) => { iter.next(); 40 },
                ('X', Some(&'C')) => { iter.next(); 90 },
                ('C', Some(&'D')) => { iter.next(); 400 },
                ('C', Some(&'M')) => { iter.next(); 900 },
                // 일반 규칙 처리 (한 문자만 소비)
                ('I', _) => 1,
                ('V', _) => 5,
                ('X', _) => 10,
                ('L', _) => 50,
                ('C', _) => 100,
                ('D', _) => 500,
                ('M', _) => 1000,
                _ => 0
            }
        }
        sum
    }
}
```

---

## 풀이 포인트

- **`peekable()`**: iterator에서 다음 요소를 소비하지 않고 미리 볼 수 있습니다
- **튜플 패턴 매칭**: `(현재문자, 다음문자)` 조합으로 뺄셈 규칙을 깔끔하게 처리
- **`iter.next()` 추가 호출**: 뺄셈 규칙일 때 다음 문자까지 소비해서 중복 처리 방지

시간 복잡도는 O(n), 공간 복잡도는 O(1)입니다.