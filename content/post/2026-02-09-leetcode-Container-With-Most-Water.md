---
author: Lionel.J
title: "LeetCode 11. Container With Most Water 풀이 (Rust)"
subtitle: "물을 가장 많이 담을 수 있는 컨테이너 찾기 — Two Pointer 기법 활용"
description: "LeetCode 11번 Container With Most Water 문제를 Rust로 풀어봤습니다. Two Pointer 기법을 활용한 O(n) 풀이 방법을 정리합니다."
date: 2026-02-09T22:25:00+09:00
publishDate: 2026-02-09T22:25:00+09:00
image: ""
tags: [LeetCode, Rust, Algorithm, 코딩테스트, Two Pointer]
categories: [ LeetCode ]
URL: "/2026/02/09/leetcode-container-with-most-water/"
draft: false
---

LeetCode의 Container With Most Water 문제를 Rust로 풀어봤습니다.  
[문제 링크](https://leetcode.com/problems/container-with-most-water/description/)

---

## 문제 설명

길이가 `n`인 정수 배열 `height`가 주어집니다. 각 요소는 `(i, 0)`부터 `(i, height[i])`까지 이어지는 수직선의 높이를 나타냅니다.

두 개의 수직선과 x축으로 이루어진 컨테이너가 **가장 많은 물을 담을 수 있는 경우**를 찾아 그 넓이를 반환하면 됩니다.

**Example 1:**
```
Input: height = [1,8,6,2,5,4,8,3,7]
Output: 49
```

**Example 2:**
```
Input: height = [1,1]
Output: 1
```

---

## 풀이 접근법

브루트 포스로 모든 조합을 확인하면 O(n²)이 되므로, **Two Pointer** 기법을 사용해서 O(n)으로 해결합니다.

핵심 아이디어:
1. 양 끝에서 시작하는 두 개의 포인터를 사용
2. 현재 넓이 = `min(height[left], height[right]) × (right - left)`
3. **더 낮은 쪽의 포인터를 안쪽으로 이동** — 높은 쪽을 움직이면 폭만 줄어들고 높이는 절대 커지지 않음

---

## Rust 코드

```rust
use std::cmp;

impl Solution {
    pub fn max_area(height: Vec<i32>) -> i32 {
        let mut result = 0;
        let (mut left, mut right) = (0, height.len() - 1);

        while left < right {
            let width = (right - left) as i32;
            let h = cmp::min(height[left], height[right]);
            result = cmp::max(result, width * h);

            if height[left] < height[right] {
                left += 1;
            } else {
                right -= 1;
            }
        }
        result
    }
}
```

---

## 풀이 포인트

- **Two Pointer**: 양 끝에서 시작해서 범위를 좁혀가며 최적해를 탐색
- **Greedy 선택**: 높이가 낮은 쪽을 이동시키는 이유는, 높은 쪽을 이동시키면 폭은 줄어들고 높이는 기존 낮은 높이로 제한되어 넓이가 절대 증가할 수 없기 때문
- **`std::cmp`**: `min`과 `max`를 활용해 간결하게 표현

시간 복잡도는 O(n), 공간 복잡도는 O(1)입니다.