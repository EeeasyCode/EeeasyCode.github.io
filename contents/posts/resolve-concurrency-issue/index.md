---
title: "Redis를 통한 동시성 이슈 해결하기"
description: "동시성 이슈를 Redis의 분산 락을 통해 해결한 과정"
date: 2025-06-22
update:
tags: [redis, concurrency, blocking, single-thread]
series: "database"
---

실제 운영 중인 서비스에서 가장 당황스러운 순간 중 하나는 **"어? 중복 결제 처리된 것 같은데요?"** 라는 제보를 받을 때입니다.

분명히 로직상으로는 문제가 없어 보이는데, 동시에 여러 요청이 들어오면서 발생하는 **동시성 이슈**는 예상치 못한 곳에서 터져 나오곤 합니다.

저 역시 과거에 서비스 개발 중 이런 동시성 문제를 마주쳤고, **Redis를 활용한 분산 락**으로 해결한 경험을 공유해보려고 합니다. 문제 상황부터 단계별 해결 과정에 대한 내용들을 담았습니다.

먼저 Redis의 특징부터 간단히 살펴보겠습니다.

## Redis 특징 살펴보기

Redis는 다음과 같은 특징을 가지고 있습니다.

- **인메모리 NoSQL 데이터베이스**로 빠른 응답 속도 제공
- 초당 약 **10만회의 명령 실행** (CPU에 따라 5만 ~ 25만회)
- 기본적으로 **Key-Value 저장 구조**이며, List/Set/Hash 등 다양한 자료구조 지원
- **싱글 스레드** 기반으로 한번에 하나의 명령어만 실행

이러한 특징들 덕분에 DB Layer의 부하 분산과 빠른 응답을 위한 **Cache Layer**로 널리 사용되고 있습니다.

## Redis Strings 명령어

Redis는 기본적으로 Key-Value 구조입니다. Value에 사용되는 자료구조에 따라 다양한 기능을 제공하며, 모든 데이터에 **유효기간(TTL)을 설정**할 수 있어 효율적인 메모리 관리가 가능합니다.

동시성 이슈 해결에 핵심이 되는 **String 명령어**들을 살펴보겠습니다.

### SET / GET / DEL 명령어

```bash
# key-value 구조로 string 정보 저장
SET key value [NX | XX] [GET] [EX seconds | PX milliseconds |
  EXAT unix-time-seconds | PXAT unix-time-milliseconds | KEEPTTL]

# 옵션 설명
# NX: 이전에 저장된 내용이 없는 경우에만 저장
# XX: 이전에 저장된 경우에만 저장
# GET: 해당 key에 대한 이전 value를 반환
# EX: 해당 정보가 유지되는 시간 (second 단위)
# PX: 해당 정보가 유지되는 시간 (millisecond 단위)
```

```bash
# 저장한 value값 가져오기
GET key
```

```bash
# 저장한 정보 삭제하기
DEL key [key ...]
```

### 활용 예시

- SET으로 단순 값 저장 후 GET으로 불러오기
- 기존에 존재하지 않는 key인지 확인 후, 존재하지 않으면 value 저장
- 기존에 존재하는 key인지 확인 후, 존재하면 value 저장
- color라는 key의 red라는 value를 3초간 유지하도록 저장

위 명령어들을 이해했다면, 이제 본격적으로 **Redis를 통한 동시성 이슈 해결**에 도전해보겠습니다.

## 동시성 이슈 상황 재현

예시 시나리오로 가상의 **온라인 쇼핑몰 재고 관리 시스템**을 활용해 설명해보겠습니다.

### 시나리오

- 한정판 스니커즈의 현재 재고: **10개**
- 고객이 주문하려는 수량: **1개**
- 예상 결과: 주문 완료 후 재고 **9개**

### 서버 로직 흐름

```
1. DB에서 상품의 현재 재고 조회 (10개 확인)
2. 현재 재고 >= 주문 수량이면 주문 테이블에 주문 정보 insert
3. 재고 테이블에서 주문 수량만큼 차감 (-1개)
4. 나머지 주문 처리 로직 진행
```

### 문제 상황 코드

DB Select와 Insert는 `setTimeout()`을 통한 더미 로직으로 구현했습니다.

```ts
const productInventory = {
  // DB의 재고 정보
  stock: 10,
}

const wait = timeToDelay =>
  new Promise(resolve => setTimeout(resolve, timeToDelay))

const getCurrentStock = async () => {
  await wait(200) // select에 0.2초 소요된다고 가정
  return productInventory.stock
}

const decreaseStock = async quantity => {
  await wait(300) // update에 0.3초 소요된다고 가정
  productInventory.stock -= quantity
}

async function order(quantity, req) {
  try {
    console.log("Starting... Req", req)

    if ((await getCurrentStock()) >= quantity) {
      await decreaseStock(quantity)
      console.log(`Req ${req}, currentStock: ${await getCurrentStock()}`)
    } else {
      console.log(`Req ${req}, failed - insufficient stock`)
    }
  } catch (err) {
    console.error("There was an error:", err.message)
  }
}

// 중복 Request 시뮬레이션
for (let i = 1; i <= 2; i++) {
  order(1, i)
}
```

### 문제 발생!

앱에서 구매 버튼 클릭 시 **중복 요청**이 발생하면서 다음과 같은 상황이 벌어졌습니다.

![]()

![]()

**결과**: 한정판 스니커즈 재고가 10개였는데 동시 주문으로 인해 재고가 **8개**가 되어버렸습니다! 즉, 실제로는 2개의 주문이 처리된 상황입니다.

이런 **재고 부족 상황**을 어떻게 해결할 수 있을까요?

## 해결 방법 1 - NX 옵션 활용

Redis의 **싱글 스레드** 특성과 SET 명령어의 **NX 옵션**을 활용해 간단한 락을 구현할 수 있습니다.

### 기본 아이디어

```bash
# key는 상품 ID와 주문 프로세스 조합
# value는 더미값 "lock", 유효기간은 1초
SET product:sneakers:order-lock "lock" NX EX 1
```

**NX 옵션**: 해당 key가 존재하지 않을 때만 값을 저장합니다.

### 구현 코드

```ts
const Redis = require("ioredis"); // version: 4.27.9

const redis = new Redis({
  port: 16...,
  host: "redis-...",
  family: 4, // ipv4
  password: "83z...",
  db: 0
});

const productInventory = {
    stock: 10
}

const wait = (timeToDelay) => new Promise((resolve) => setTimeout(resolve, timeToDelay));

const getCurrentStock = async () => {
    await wait(200);
    return productInventory.stock;
}

const decreaseStock = async (quantity) => {
    await wait(300);
    productInventory.stock -= quantity;
}

async function order(quantity, req) {
  try {
      console.log("Starting... Req", req);
      const result = await redis.set('product:sneakers:order-lock', 'lock', 'NX', 'EX', 1);

      if (result === 'OK' && await getCurrentStock() >= quantity) {
          await decreaseStock(quantity);
          console.log(`Req ${req}, currentStock: ${await getCurrentStock()}`);
      } else {
          console.log(`Req ${req}, failed - insufficient stock`);
      }
  } catch (err) {
        console.error("There was an error:", err.message);
  } finally {
      await redis.disconnect();
  }
}

for (let i = 1; i <= 2; i++) {
    order(1, i);
}
```

### 결과

![]()

![]()

두 번의 동일한 요청에 대해 **NX 옵션을 통한 락**이 정상적으로 동작함을 확인할 수 있습니다!

### 하지만 문제가 있습니다...

안타깝게도 위 방식은 **불완전한 해결책**입니다. 중복 요청이 너무 많이 발생하여 **락의 유효기간 이후**에 들어오는 요청들은 막을 수 없기 때문입니다.

![]()

## 해결 방법 2 - Redlock 적용

Redis에서는 **Expire 기능**을 활용하여 안정성이 보장된 **분산 락 프로토콜(Distributed Locking Protocol)**인 **Redlock**을 제공합니다.

### Redlock의 특징

- **SPOF(Single Point of Failure) 방지**를 위해 최소 3개 이상의 독립적인 Redis 인스턴스 구성 권장
- 더 안정적이고 신뢰할 수 있는 분산 락 구현

### Redlock 알고리즘

1. **현재 시간**을 밀리초 단위로 가져옵니다
2. **모든 Redis 인스턴스**에서 동일한 key와 난수값으로 순차적으로 락을 획득합니다
3. **락 획득 소요 시간**을 계산하여, 대부분의 인스턴스에서 락을 획득하고 소요 시간이 유효시간보다 짧은 경우에만 락 획득으로 간주합니다
4. **락 유효시간**은 초기 설정 시간에서 경과 시간을 뺀 값으로 계산합니다
5. 락 획득에 실패하면 **모든 Redis 인스턴스**에서 락을 해제합니다

### 구현 코드

```ts
const Redis = require("ioredis"); // version: 4.27.9
const Redlock = require("redlock"); // version: 4.2.0

const redis1 = new Redis({
  port: 16...,
  host: "redis-...",
  family: 4, // ipv4
  password: "83z...",
  db: 0
});
const redis2 = new Redis({ ... });
const redis3 = new Redis({ ... });

const redlock = new Redlock(
  [redis1, redis2, redis3],
  {
    driftFactor: 0.01, // clock drift 보상을 위한 driftTime 계산 요소
    retryCount: 10, // 에러 전까지 재시도 최대 횟수
    retryDelay: 200, // 각 시도 간 간격(ms)
    retryJitter: 200, // 재시도 시 추가되는 최대 시간(ms)
    automaticExtensionThreshold: 500, // 락 연장 전 최소 남아야 할 시간(ms)
  }
);

const productInventory = {
    stock: 10
}

const wait = (timeToDelay) => new Promise((resolve) => setTimeout(resolve, timeToDelay));

const getCurrentStock = async () => {
    await wait(200);
    return productInventory.stock;
}

const decreaseStock = async (quantity) => {
    await wait(300);
    productInventory.stock -= quantity;
}

async function order(quantity) {
  try {
      console.log("redlock Starting...");
      let lock = await redlock.acquire(["product-order-lock"], 5000);

      if (await getCurrentStock() >= quantity) {
          await decreaseStock(quantity);
          console.log('currentStock: ', await getCurrentStock());
      }

      await lock.unlock();
  } catch (err) {
        console.error("There was an error:", err.message);
  } finally {
      await redis1.disconnect();
      await redis2.disconnect();
      await redis3.disconnect();
  }
}

for (let i = 0; i < 10; i++) {
    order(1);
}
```

### 결과

![]()

성공적으로 동시성 이슈를 해결할 수 있게 되었습니다. 10번의 중복 요청에도 불구하고 한 번만 실행되는 것을 확인할 수 있습니다.

## 적용 가이드

### 언제 어떤 방법을 선택할까?

| **상황**                     | **추천 방법** | **이유**                    |
| ---------------------------- | ------------- | --------------------------- |
| **간단한 중복 방지**         | NX 옵션       | 구현이 단순하고 성능이 좋음 |
| **중요한 비즈니스 로직**     | Redlock       | 높은 안정성과 신뢰성 보장   |
| **고가용성이 필요한 서비스** | Redlock       | SPOF 방지 및 장애 대응 가능 |

### 적용 시 주의사항

#### 1. **락 타임아웃 설정**

```ts
// 너무 짧으면 - 정상 처리 중에도 락이 해제될 수 있음
// 너무 길면 - 장애 시 복구가 늦어짐
const LOCK_TIMEOUT = 5000 // 5초 정도가 적절
```

#### 2. **락 키 설계**

```ts
// 사용자별, 액션별로 세분화하여 락의 범위를 최소화
const lockKey = `lock:user:${userId}:action:${actionType}:${resourceId}`
```

#### 3. **예외 처리**

```ts
async function businessLogic() {
  let lock
  try {
    lock = await redlock.acquire([lockKey], LOCK_TIMEOUT)
    // 비즈니스 로직 실행
  } catch (error) {
    if (error.name === "LockError") {
      throw new Error("이미 처리 중인 요청입니다.")
    }
    throw error
  } finally {
    if (lock) {
      await lock.unlock().catch(console.error)
    }
  }
}
```

### 성능 고려사항

#### Redis 인스턴스 개수

- **단일 인스턴스**: 빠르지만 SPOF 존재
- **3개 인스턴스**: 안정성과 성능의 균형점
- **5개 이상**: 과도한 네트워크 오버헤드 발생 가능

#### 네트워크 지연

```ts
// 각 Redis 인스턴스별 타임아웃 설정
const redis = new Redis({
  host: "redis-host",
  connectTimeout: 1000, // 연결 타임아웃
  lazyConnect: true, // 지연 연결
  maxRetriesPerRequest: 2, // 재시도 횟수
})
```

## 마무리하며

이번 글에서는 실제 서비스에서 발생할 수 있는 **동시성 이슈**를 **Redis를 활용한 분산 락**으로 해결하는 과정을 살펴봤습니다.

> **핵심 포인트** <br/>
>
> - 단순한 NX 옵션도 많은 경우에 충분히 효과적
> - 중요한 비즈니스 로직에서는 Redlock을 활용한 안정적인 분산 락 구현
> - 락 타임아웃과 키 설계, 예외 처리까지 고려한 완전한 구현이 중요

동시성 이슈는 서비스가 성장하면서 필연적으로 마주치게 되는 문제입니다. 미리 대비하고 적절한 해결책을 준비해둔다면, 사용자 경험을 해치지 않으면서도 안정적인 서비스를 제공할 수 있을 것입니다.

특히 **포인트, 재고, 쿠폰** 등 정확성이 중요한 도메인에서는 이런 분산 락 패턴이 매우 유용하니, 실무에서 적극 활용해볼 필요가 있습니다.

## 참고 자료

- [Redis 공식 문서 - SET 명령어](https://redis.io/commands/set/)
- [Redlock 공식 문서](https://redis.io/docs/manual/patterns/distributed-locks/)
- [ioredis GitHub](https://github.com/luin/ioredis)
- [node_redis Redlock](https://github.com/mike-marcacci/node-redlock)
