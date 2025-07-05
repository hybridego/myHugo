---
author: Lionel.J
title: High-Performance I/O in Unix Systems
subtitle: Exploring Efficient Data Transfer with System Calls
description: "Understanding high-performance I/O functions like readv(), writev(), splice(), sendfile(), and more in Linux and BSD"
date: 2025-07-04T12:49:23+09:00
publishDate: 2025-07-04
image: ""
tags: [linux, bsd, io, system-calls, performance]
categories: Tech
draft: false
URL: "/2025/07/04/High-Performance-IO-in-Unix-Systems/"
---
# 고성능 I/O를 위한 유닉스 시스템 호출 가이드

유닉스 계열 운영 체제(리눅스, BSD 등)에서 고성능 I/O 작업은 대용량 데이터 전송, 네트워크 서버, 데이터 스트리밍 등에서 필수적입니다. 이번 포스팅에서는 `readv()`, `writev()`, `splice()`, `sendfile()`, `funopen()`, `sendmsg()`, `io_uring`, 그리고 `shm_open` 같은 함수들의 기능과 사용 예시를 정리하며, 리눅스와 BSD에서의 차이점을 살펴봅니다.

## 1. `readv()` / `writev()`: Scatter-Gather I/O
- **기능**: 여러 버퍼를 단일 시스템 호출로 읽거나 쓰는 scatter-gather I/O.
- **특징**:
  - 리눅스와 BSD 모두 지원.
  - 메모리 복사(`memcpy`)가 필요하며, zero-copy는 아님.
  - BSD에서 파이프 데이터 전송에 효율적.
- **사용 예시**:
  ```c
  #include <sys/uio.h>
  #include <fcntl.h>
  #include <stdio.h>

  int main() {
      int fd = open("input.txt", O_RDONLY);
      char buf1[100], buf2[100];
      struct iovec iov[2] = {
          { .iov_base = buf1, .iov_len = 100 },
          { .iov_base = buf2, .iov_len = 100 }
      };
      ssize_t n = readv(fd, iov, 2);
      printf("Read %zd bytes\n", n);
      close(fd);
      return 0;
  }
  ```

## 2. `splice()`: Zero-Copy 파이프 전송
- **기능**: 파이프나 유닉스 소켓 간 데이터를 사용자 공간 복사 없이 전송.
- **특징**:
  - 리눅스 전용, BSD 미지원.
  - 대용량 데이터 전송에 최적.
- **사용 예시**:
  ```c
  #include <fcntl.h>
  #include <stdio.h>

  int main() {
      int fd_in = open("input.txt", O_RDONLY);
      int fd_out = open("output.txt", O_WRONLY | O_CREAT, 0644);
      ssize_t n = splice(fd_in, NULL, fd_out, NULL, 1024, SPLICE_F_MOVE);
      printf("Spliced %zd bytes\n", n);
      close(fd_in);
      close(fd_out);
      return 0;
  }
  ```

## 3. `sendfile()`: 파일에서 소켓으로 Zero-Copy 전송
- **기능**: 파일 데이터를 소켓으로 직접 전송.
- **특징**:
  - 리눅스와 BSD 모두 지원.
  - 파일→소켓 전용, 웹 서버에서 주로 사용.
- **사용 예시**:
  ```c
  #include <sys/sendfile.h>
  #include <fcntl.h>
  #include <sys/socket.h>

  int main() {
      int file_fd = open("file.txt", O_RDONLY);
      int sock_fd = socket(AF_INET, SOCK_STREAM, 0);
      // 소켓 연결 설정 생략
      ssize_t n = sendfile(sock_fd, file_fd, NULL, 1024);
      printf("Sent %zd bytes\n", n);
      close(file_fd);
      close(sock_fd);
      return 0;
  }
  ```

## 4. `funopen()`: 사용자 정의 스트림
- **기능**: 사용자 정의 읽기/쓰기 함수로 커스텀 I/O 스트림 생성.
- **특징**:
  - BSD 전용, 리눅스에서는 `fopencookie()` 사용.
  - 비표준 I/O 작업에 유연.
- **사용 예시**:
  ```c
  #include <stdio.h>
  #include <stdlib.h>

  int my_read(void *cookie, char *buf, int n) {
      // 사용자 정의 읽기 로직
      return n;
  }

  int main() {
      FILE *fp = funopen(NULL, my_read, NULL, NULL, NULL);
      fclose(fp);
      return 0;
  }
  ```

## 5. `sendmsg()`: 소켓 메시지 전송
- **기능**: 소켓을 통해 복잡한 메시지(다중 버퍼, 제어 정보) 전송.
- **특징**:
  - 리눅스, BSD 지원.
  - 소켓 전용, 파이프에는 사용 불가.
- **사용 예시**:
  ```c
  #include <sys/socket.h>
  #include <string.h>

  int main() {
      int sock_fd = socket(AF_UNIX, SOCK_DGRAM, 0);
      struct msghdr msg = {0};
      char buf[] = "Hello";
      struct iovec iov = { .iov_base = buf, .iov_len = strlen(buf) };
      msg.msg_iov = &iov;
      msg.msg_iovlen = 1;
      sendmsg(sock_fd, &msg, 0);
      close(sock_fd);
      return 0;
  }
  ```

## 6. `io_uring`: 비동기 I/O 프레임워크
- **기능**: 비동기 I/O 작업을 위한 고성능 프레임워크.
- **특징**:
  - 리눅스 5.1 이상 전용.
  - `splice()`와 비슷하거나 더 나은 성능.
- **사용 예시**:
  ```c
  #include <liburing.h>
  #include <stdio.h>

  int main() {
      struct io_uring ring;
      io_uring_queue_init(8, &ring, 0);
      // 비동기 I/O 작업 추가
      io_uring_queue_exit(&ring);
      return 0;
  }
  ```

## 7. `shm_open`: 공유 메모리
- **기능**: 프로세스 간 공유 메모리 객체 생성.
- **특징**:
  - 리눅스, BSD 지원, 높은 포터블성.
  - 동기화 필요.
- **사용 예시**:
  ```c
  #include <sys/mman.h>
  #include <fcntl.h>
  #include <stdio.h>

  int main() {
      int fd = shm_open("/myshm", O_CREAT | O_RDWR, 0666);
      ftruncate(fd, 1024);
      void *ptr = mmap(NULL, 1024, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
      sprintf(ptr, "Shared data");
      printf("Wrote: %s\n", (char *)ptr);
      munmap(ptr, 1024);
      shm_unlink("/about");
      close(fd);
      return 0;
  }
  ```

## BSD vs 리눅스
- **BSD**: `splice()` 미지원으로 `readv()`/`writev()`가 파이프 전송에 효율적. 공유 메모리(`shm_open`)는 더 빠른 대안.
- **리눅스**: `splice()`와 `io_uring`이 대용량 데이터 전송에 최적. `sendfile()`은 파일→소켓 전송에 강력.

## 결론
고성능 I/O 작업은 사용 사례와 운영 체제에 따라 적합한 함수를 선택해야 합니다. 리눅스에서는 `splice()`와 `io_uring`이 뛰어난 성능을 제공하며, BSD에서는 `readv()`/`writev()`와 `shm_open`이 좋은 대안입니다. 각 함수의 특성과 예제를 참고해 최적의 솔루션을 선택하세요!

**참고 자료**:
- [GeekNews: Fast Pipes](https://news.hada.io/topic?id=21623)
- [mazzo.li: Fast Pipes](https://mazzo.li/posts/fast-pipes.html)
