+++
author = "Lionel.J"
title = 'linux debugging'
date = '2025-05-23T07:42:23+09:00'
description = "Linux debugging skil"
draft = false
tags = [
    "linux",
    "debugging", "debug", "valgind", "ASAN", "LD_PRELOAD", "RAII"
]
+++

# 리눅스 환경에서의 메모리 디버깅 스킬

이 교육 자료는 리눅스 환경에서 메모리 관련 문제를 디버깅하는 데 필요한 핵심 개념과 도구를 다룹니다. 페이지, 페이지 폴트, 신호(SIGSEGV, SIGBUS), 댕글링 포인터, `/proc` 파일, OOM Killer, Shadow Memory, LD_PRELOAD, RAII를 기반으로 디버깅 스킬을 정리했습니다.

## 1. 메모리 관리 기본 개념

### 1.1 페이지와 가상 메모리
- **페이지**: 리눅스 메모리 관리의 기본 단위(보통 4KB). 가상 메모리와 물리 메모리를 페이지 단위로 매핑.
- **가상 메모리**:
  - 32비트: 프로세스당 최대 4GB(사용자 공간 ~3GB, 커널 ~1GB).
  - 64비트: 최대 256TB(실제 48비트, 사용자 공간 ~128TB).
- **디버깅 팁**: `/proc/[pid]/status`에서 `VmSize`(가상 메모리), `VmRSS`(물리 메모리) 확인.

### 1.2 페이지 폴트
- **정의**: 프로세스가 접근하려는 가상 페이지가 물리 메모리에 없거나 권한이 없을 때 발생.
- **원인**: 
  - 페이지가 스왑 공간에 있음.
  - 읽기/쓰기/실행 권한 위반.
  - 요구 페이징(Demand Paging).
- **디버깅 팁**: 페이지 폴트가 빈번하면 `/proc/meminfo`의 `SwapFree` 확인, 스왑 사용량 증가 점검.

### 1.3 SIGSEGV와 SIGBUS
- **SIGSEGV (Segmentation Fault)**:
  - 유효하지 않은 메모리 접근(예: 댕글링 포인터, 권한 위반).
  - 예: `int *p = NULL; *p = 10;` → SIGSEGV.
- **SIGBUS (Bus Error)**:
  - 하드웨어 수준 오류(예: 정렬 문제, `mmap` 파일 손상).
- **디버깅 팁**: `/proc/[pid]/maps`로 오류 주소(PC, LR) 확인, 세그먼트 분석.

### 1.4 댕글링 포인터
- **정의**: 이미 해제된 메모리를 가리키는 포인터.
- **문제**: 정의되지 않은 동작, SIGSEGV 발생 가능.
- **디버깅 팁**: `free(p); p = NULL;`로 방지, Valgrind 또는 AddressSanitizer 사용.

## 2. 주요 디버깅 파일과 도구

### 2.1 `/proc/[pid]/status`
- **주요 항목**:
  - `VmSize`: 가상 메모리 크기(전체 주소 공간).
  - `VmRSS`: 물리 메모리 사용량(RAM).
- **디버깅 시나리오**:
  - **VmSize만 증가**: 과도한 메모리 예약, 스파스 메모리 사용. 설계 최적화 필요.
  - **VmRSS만 증가**: 메모리 누수, 캐시 과다 사용. Valgrind로 점검.
- **확인 명령**:
  ```bash
  cat /proc/[pid]/status | grep -E 'VmSize|VmRSS'
  ```

### 2.2 `/proc/[pid]/maps`
- **내용**: 프로세스의 가상 메모리 매핑(코드, 힙, 스택, 라이브러리 등).
- **디버깅 활용**:
  - 스택 덤프의 **PC**(오류 명령어 주소)를 확인해 세그먼트 파악.
  - **LR**(반환 주소)로 호출 문맥 분석.
  - **SP**(스택 포인터)로 스택 오버플로우 점검.
- **명령**:
  ```bash
  cat /proc/[pid]/maps
  addr2line -e /path/to/binary -a 0x7f8b12345678
  ```

### 2.3 `/proc/slabinfo`
- **내용**: 커널 슬랩 할당자의 캐시 정보.
- **주요 항목**:
  - `SReclaimable`: 회수 가능한 슬랩 메모리(예: 파일 캐시).
  - `SUnreclaim`: 회수 불가능한 슬랩 메모리(커널 필수 데이터).
- **디버깅 팁**: `SUnreclaim` 증가 시 커널 메모리 누수 의심, `/proc/slabinfo`와 `slabtop`으로 분석.

### 2.4 `/proc/meminfo`
- **주요 항목**:
  - `MemTotal`, `MemFree`, `MemAvailable`: 메모리 부족 여부.
  - `SwapTotal`, `SwapFree`: 스왑 사용량, 성능 저하 원인.
  - `SReclaimable`, `SUnreclaim`: 커널 메모리 상태.
  - `Dirty`: 디스크 쓰기 지연, I/O 병목.
  - `Committed_AS`: 오버커밋 상태.
- **디버깅 팁**: `MemAvailable` 낮거나 `SwapFree` 감소 시 OOM 위험, `SUnreclaim` 증가로 커널 누수 점검.
- **명령**:
  ```bash
  cat /proc/meminfo | grep -E 'Mem|Swap|Slab|SReclaimable|SUnreclaim|Dirty|Committed_AS'
  ```

### 2.5 OOM Killer
- **정의**: 메모리 부족 시 프로세스 종료.
- **기준**: `oom_score` 기반, `VmRSS`와 `VmSize` 고려, `oom_score_adj`로 조정.
- **디버깅 팁**:
  - `/proc/[pid]/oom_score`로 종료 대상 우선순위 확인.
  - `MemAvailable`과 `Committed_AS`로 OOM 트리거 분석.
- **명령**:
  ```bash
  cat /proc/[pid]/oom_score
  ```

## 3. 디버깅 도구와 기법

### 3.1 Shadow Memory Scheme
- **정의**: 메모리 상태를 추적하기 위해 주 메모리에 매핑된 메타데이터 저장.
- **도구**:
  - **Valgrind (Memcheck)**: 댕글링 포인터, 메모리 누수 탐지.
  - **AddressSanitizer (ASan)**: 빠른 메모리 오류 탐지.
- **메모리 영향**: `VmSize`, `VmRSS` 증가, `/proc/meminfo`의 `MemAvailable` 감소.
- **명령**:
  ```bash
  valgrind --tool=memcheck ./program
  LD_PRELOAD=/usr/lib/libasan.so ./program
  ```

### 3.2 LD_PRELOAD
- **정의**: 동적 링커가 우선 로드할 공유 라이브러리 지정.
- **용도**: 메모리 디버깅(예: ASan), 함수 후킹.
- **디버깅 팁**: `/proc/[pid]/maps`로 로드된 라이브러리 확인, `VmRSS` 증가 점검.
- **명령**:
  ```bash
  export LD_PRELOAD=/path/to/libasan.so
  ./program
  ```

### 3.3 RAII (C++ 전용)
- **정의**: 자원(메모리, 파일, 뮤텍스)을 객체 생명주기로 관리.
- **주요 클래스**:
  - `std::unique_ptr`, `std::shared_ptr`: 메모리 관리, 댕글링 포인터 방지.
  - `std::lock_guard`, `std::unique_lock`: 뮤텍스 관리.
  - `std::fstream`: 파일 자원 관리.
- **디버깅 팁**: RAII 사용으로 SIGSEGV, 메모리 누수 방지. ASan과 함께 사용 권장.
- **예시**:
  ```cpp
  #include <memory>
  std::unique_ptr<int> ptr = std::make_unique<int>(42); // 자동 해제
  ```

## 4. 디버깅 워크플로우
1. **문제 증상 확인**:
   - SIGSEGV/SIGBUS: `/proc/[pid]/maps`로 PC/LR 주소 분석.
   - 메모리 누수: `/proc/[pid]/status`에서 `VmRSS` 증가 확인.
   - OOM: `/proc/meminfo`로 `MemAvailable`, `SwapFree` 점검.
2. **도구 활용**:
   - Valgrind: 댕글링 포인터, 메모리 누수.
   - ASan: 빠른 오류 탐지, `LD_PRELOAD`로 활성화.
   - `gdb`: 스택 트레이스 분석.
3. **커널 메모리 점검**:
   - `/proc/slabinfo`: `SUnreclaim` 증가로 커널 누수 확인.
   - `slabtop`으로 슬랩 캐시 모니터링.
4. **최적화**:
   - RAII로 자원 관리 개선.
   - 불필요한 캐시 정리: `echo 3 > /proc/sys/vm/drop_caches`.

## 5. 실습 예제
### 예제 1: 댕글링 포인터 디버깅
```cpp
#include <stdlib.h>
int main() {
    int *p = malloc(sizeof(int));
    *p = 42;
    free(p);
    *p = 10; // 댕글링 포인터
    return 0;
}
```
- **디버깅**:
  ```bash
  valgrind --tool=memcheck ./program
  ```
  - `/proc/[pid]/maps`로 오류 주소 확인.
  - ASan: `LD_PRELOAD=/usr/lib/libasan.so ./program`.

### 예제 2: 메모리 사용량 확인
```bash
cat /proc/[pid]/status | grep -E 'VmSize|VmRSS'
cat /proc/meminfo | grep -E 'MemAvailable|SwapFree'
```

## 6. 결론
- 리눅스 메모리 디버깅은 페이지, 페이지 폴트, 신호, `/proc` 파일을 이해하는 것이 핵심.
- Valgrind, ASan, LD_PRELOAD, RAII를 활용해 메모리 오류를 효과적으로 탐지.
- `/proc/meminfo`, `/proc/[pid]/status`, `/proc/[pid]/maps`로 시스템/프로세스 상태 분석.
- 지속적인 모니터링과 최적화로 안정적인 프로그램 개발 가능.

---
**참고**: `/proc/slabinfo`, `slabtop`, `gdb`, `addr2line` 활용으로 커널 및 사용자 메모리 문제 심층 분석 권장.

