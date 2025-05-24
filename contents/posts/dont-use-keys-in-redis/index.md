---
title: "Redis KEYS 명령어가 위험한 이유"
description: "Redis의 싱글 스레드 구조에서 KEYS 명령어가 어떻게 전체 시스템을 블로킹하는지 실험을 통해 확인해봅니다."
date: 2025-05-24
tags: [redis, performance, database, keys, blocking, single-thread]
series: "database"
---

## 들어가며

Redis는 빠른 속도와 단순한 구조 덕분에 캐시, 세션 저장소, 실시간 데이터 처리 등 다양한 분야에서 널리 사용되는 인메모리 데이터베이스입니다.

하지만 Redis는 **싱글 스레드(single-threaded)** 구조이기 때문에, 하나의 **무거운 명령어**가 실행 중이면 다른 요청도 **모두 대기**하게 됩니다.

이러한 구조적 특징은 잘못된 명령어 사용 시, 전체 서비스의 응답성을 크게 저하시킬 수 있습니다.

그 대표적인 명령어가 바로 **KEYS**입니다.

이번 글에서는 **KEYS 명령어**가 얼마나 위험한지, 실제 코드 실험을 통해 그 문제를 직접 확인해보려고 합니다.

## 실험 설계

---

### 목적

> Redis에서 KEYS 명령어가 실행될 때, 동시에 요청되는 **단순한 GET 명령어도 지연되는가?**
> 즉, 싱글 스레드 구조에서 모든 명령어가 **순차적으로 처리되는지**를 확인합니다.

이를 위해 Redis에 약 **1,000만 개의 key-value 데이터를 미리 세팅**한 후, KEYS와 GET을 **동시에 요청**해 처리 시간을 측정했습니다.

### 테스트 데이터 생성 코드

```ts
async function fillTestData(count) {
  const batchSize = 10000

  for (let i = 0; i < count; i += batchSize) {
    const pipeline = redis.pipeline()
    for (let j = i; j < i + batchSize && j < count; j++) {
      pipeline.set(`key:${j}`, `value:${j}`)
    }
    await pipeline.exec()
  }
}
```

### 실험 코드 (Node.js + ioredis)

```ts
async function concurrentRequests() {
  const slowCommandPromise = benchmark(slowCommand) // KEYS
  const fastCommandPromise = benchmark(fastCommand) // GET

  const [slowCommandTime, fastCommandTime] = await Promise.all([
    slowCommandPromise,
    fastCommandTime,
  ])
}
```

- slowCommand: `KEYS key:*` 실행
- fastCommand: `GET key:1` 실행
- 두 명령어를 동시에 실행한 후 소요 시간을 비교합니다.

## 실험 결과

---

```bash
slowCommand 시작
fastCommand 시작
slowCommand 완료
fastCommand 완료
slowCommand 소요 시간: 6690.167ms
fastCommand 소요 시간: 6689.897ms
```

> 단순한 GET 명령어 하나가 **무려 6.6초 동안 지연됨**
> 즉, KEYS 명령이 실행 중일 때, 아무리 단순한 명령어라도 모두 블로킹됨

### 왜 이런 현상이 발생할까?

Redis는 기본적으로 싱글 스레드 기반으로 동작합니다.

즉, 한 번에 하나의 명령어만 처리할 수 있으며, 나머지 명령어는 큐에서 대기하게 됩니다.

```
Client A: KEYS key:*
Client B: GET key:1
 → Client B는 A가 끝날 때까지 대기
```

> 아무리 다른 클라이언트라도, Redis는 명령어를 병렬 처리하지 않습니다.

### **SLOWLOG 확인**

```bash
[
  [
    211,
    1747990094,
    3170315,
    [ 'keys', 'key:*' ],
    '172.18.0.1:65392',
    ''
  ]
]
```

- KEYS 명령어가 3초 이상 걸린 기록이 남아 있음
- 키의 개수가 많아질수록, 블로킹 시간은 더 늘어날 수 있음

## KEYS 명령어의 위험성

---

### 위험한 이유

| **항목**           | **설명**                                                      |
| ------------------ | ------------------------------------------------------------- |
| 전체 키 탐색       | 모든 키를 순회하므로 **시간 복잡도 O(N)**                     |
| 블로킹 발생        | **단일 스레드 구조**라 다른 요청도 모두 대기                  |
| 슬로우 명령어      | SLOWLOG에 기록될 만큼 성능 저하 유발                          |
| 실시간 서비스 중단 | 실제 서비스에서는 **전체 시스템 지연**으로 이어질 가능성 있음 |

### **실무에서 대안은?**

| **잘못된 방식**                   | **대안**                                        |
| --------------------------------- | ----------------------------------------------- |
| KEYS user:\*                      | 사용 금지                                       |
| SCAN 명령어 사용                  | 커서 기반 탐색                                  |
| 위험 명령어 실행 제한 (운영 환경) | rename-command KEYS "" 등을 통해 아예 사용 금지 |

## **마무리하며**

---

이번 실험을 통해 Redis의 싱글 스레드 구조에서 KEYS 명령어 같은 **O(N)** 명령어가 실시간 서비스에 얼마나 큰 영향을 줄 수 있는지 **직접 눈으로 확인**할 수 있었습니다.

> 하나의 단순하고 편리한 명령어가 전체 시스템을 블로킹시킬 수 있다는 점
> 운영 환경에서 Redis 명령어를 실행할 때, 단순함과 편리함 뒤의 위험성도 반드시 고려해야 합니다.

## **📁 참고**

- Redis 공식 문서: https://redis.io/commands/keys/
