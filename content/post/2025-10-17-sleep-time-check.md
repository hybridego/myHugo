---
author: Lionel.J
title: Time 해상도 체크
subtitle: usleep, sleep으로 time 해상도를 체크 해봅니다
description: usleep, sleep으로 time 해상도를 체크 해봅니다. 시스템에서 최대 시간 해상도를 확인해봅니다.
date: 2025-10-17T09:55:15+09:00
publishDate: 2025-10-17T10:10:05+09:00
image: ""
tags: [usleep, sleep, chrono, nanoseconds, microseconds, milliseconds]
categories:  [ Tech ]
URL: "/2025/10/17/sleep-time-check/"
draft: false
---


```c
#include <iostream>
#include <unistd.h>
#include <ctime>
#include <chrono>

int main() {
    // 현재 시간을 마이크로초 단위로 가져오는 함수
    auto getCurrentMicros = []() {
        return std::chrono::duration_cast<std::chrono::microseconds>(
            std::chrono::high_resolution_clock::now().time_since_epoch()
        ).count();
    };

    // 여러 대기 시간을 테스트
    int waitTimes[] = {100000, 500000, 1000000}; // 0.1초, 0.5초, 1초

    for (int waitTime : waitTimes) {
        std::cout << "대기 시작: " << waitTime << " 마이크로초" << std::endl;

        // 시작 시간 기록
        long long startTime = getCurrentMicros();

        // usleep 호출
        usleep(waitTime);

        // 종료 시간 기록
        long long endTime = getCurrentMicros();

        // 실제 경과 시간 계산
        long long elapsedTime = endTime - startTime;

        std::cout << "예상 대기 시간: " << waitTime << " 마이크로초" << std::endl;
        std::cout << "실제 대기 시간: " << elapsedTime << " 마이크로초" << std::endl;
        std::cout << "차이: " << elapsedTime - waitTime << " 마이크로초" << std::endl;
        std::cout << "------------------------" << std::endl;
    }

    return 0;
}
```

## 좀 더 개선

```c
#include <iostream>
#include <chrono>
#include <thread>
#include <iomanip>

// 시간 측정을 위한 헬퍼 함수
template<typename Func>
long long measureTime(Func func) {
    auto start = std::chrono::high_resolution_clock::now();
    func();
    auto end = std::chrono::high_resolution_clock::now();
    return std::chrono::duration_cast<std::chrono::nanoseconds>(end - start).count();
}

void testSleep(const std::string& name, auto duration) {
    long long elapsed = measureTime([&]() {
        std::this_thread::sleep_for(duration);
    });

    std::cout << std::left << std::setw(15) << name
              << " 요청 시간: " << std::setw(10) << duration.count()
              << " 실제 시간: " << std::setw(10) << elapsed
              << " ns (차이: " << elapsed - duration.count() << " ns)"
              << std::endl;
}

int main() {
    std::cout << "Sleep 시간 테스트 시작...\n" << std::endl;

    // 나노초 테스트 (100ns, 500ns, 1000ns)
    testSleep("100 ns", std::chrono::nanoseconds(100));
    testSleep("500 ns", std::chrono::nanoseconds(500));
    testSleep("1000 ns", std::chrono::nanoseconds(1000));
    std::cout << std::endl;

    // 마이크로초 테스트 (1μs, 10μs, 100μs)
    testSleep("1 μs", std::chrono::microseconds(1));
    testSleep("10 μs", std::chrono::microseconds(10));
    testSleep("100 μs", std::chrono::microseconds(100));
    std::cout << std::endl;

    // 밀리초 테스트 (1ms, 10ms, 100ms)
    testSleep("1 ms", std::chrono::milliseconds(1));
    testSleep("10 ms", std::chrono::milliseconds(10));
    testSleep("100 ms", std::chrono::milliseconds(100));

    return 0;
}
```