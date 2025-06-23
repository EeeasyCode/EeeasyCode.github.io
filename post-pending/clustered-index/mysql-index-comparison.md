---
title: "Clustered vs Non-Clustered 차이와 선택 기준"
description: "MySQL에서 인덱스 설계를 제대로 이해해보자"
date: 2025-06-22
tags: [mysql, index, database]
series: "database"
---

느려터진 쿼리, 도대체 왜일까요?

많은 경우, 적절하지 않은 인덱스 구조가 원인입니다.  
특히 InnoDB를 사용하는 MySQL에서는 **Clustered Index와 Non-Clustered Index**의 차이를 제대로 이해하지 않으면, 성능을 개선하기 어렵습니다.

이번 글에서는 두 인덱스의 구조적 차이, 장단점, 그리고 실제 쿼리 설계 시 어떤 기준으로 선택해야 하는지를 정리해보겠습니다.

---

## Clustered Index란?

Clustered Index는 **데이터가 인덱스 자체에 포함되어 물리적으로 정렬**되는 방식입니다.  
InnoDB에서는 테이블당 하나만 가질 수 있으며, 보통 **기본 키(PK)** 가 해당 역할을 합니다.

### 특징

- **하나만 생성 가능**: 데이터 자체가 인덱스의 일부이기 때문에 테이블당 1개만 설정 가능
- **데이터 정렬 포함**: 인덱스의 순서 = 데이터 정렬 순서
- **빠른 범위 쿼리**에 유리: 연속된 값을 조회하는 쿼리에 매우 빠름

### 예시

```sql
CREATE TABLE user (
  id BIGINT PRIMARY KEY, -- id가 자동으로 Clustered Index가 됨
  name VARCHAR(100),
  created_at DATETIME
);
```

이 경우, `id` 기준으로 데이터가 디스크에 정렬되어 저장됩니다.

---

## Non-Clustered Index란?

Non-Clustered Index는 **인덱스와 데이터가 분리되어 저장**됩니다.  
보조 인덱스로서 사용되며, **데이터 위치를 가리키는 포인터를 포함**합니다.

### 특징

- **여러 개 생성 가능**: 다양한 쿼리 조건에 맞게 인덱스 생성 가능
- **데이터 참조 필요**: 인덱스만으로 값을 조회할 수 없으면 테이블을 한 번 더 읽어야 함
- **정렬 없음**: 물리적 정렬이 없으므로 삽입/삭제가 빠름

### 예시

```sql
CREATE INDEX idx_user_name ON user(name);
```

이 인덱스는 `name`을 기준으로 정렬된 인덱스 트리를 만들지만, 실제 데이터는 Clustered Index에 위치해 있으므로 **데이터를 추가로 참조해야** 합니다.

---

## EXPLAIN으로 보는 차이

아래 쿼리를 `EXPLAIN`으로 실행해보면 차이를 확인할 수 있습니다:

```sql
-- Clustered Index를 사용하는 쿼리
SELECT * FROM user WHERE id BETWEEN 1 AND 100;

-- Non-Clustered Index를 사용하는 쿼리
SELECT * FROM user WHERE name = 'Alice';
```

- 첫 번째 쿼리는 데이터 자체가 `id`로 정렬되어 있어 빠른 접근이 가능합니다.
- 두 번째 쿼리는 `name` 인덱스를 따라가서 `id`를 찾아야 하므로, **인덱스 → 테이블** 두 번 접근합니다.

---

## 비교표: Clustered vs Non-Clustered

| 항목           | Clustered Index                 | Non-Clustered Index                 |
| -------------- | ------------------------------- | ----------------------------------- |
| 정렬 방식      | 데이터가 인덱스 기준으로 정렬됨 | 정렬된 인덱스 구조, 데이터는 별도   |
| 생성 가능 개수 | 1개만 생성 가능                 | 여러 개 생성 가능                   |
| 저장 공간      | 추가 공간 거의 없음             | 인덱스 공간 외에도 데이터 참조 필요 |
| 조회 속도      | 빠름 (범위 조회에 특히 유리)    | 조건에 따라 느릴 수 있음            |
| 삽입/삭제 성능 | 느릴 수 있음 (정렬 유지 필요)   | 빠름 (정렬 없음)                    |

---

## 언제 어떤 인덱스를 써야 할까?

- **Clustered Index 추천**

  - PK 기반으로 데이터 조회가 대부분일 때
  - 범위 쿼리(`BETWEEN`, `ORDER BY`)가 자주 사용될 때
  - 정렬된 데이터 저장이 이점이 될 때

- **Non-Clustered Index 추천**
  - 다양한 검색 조건을 대응해야 할 때
  - 여러 필드에 대해 인덱스를 걸어야 할 때
  - 삽입/삭제가 자주 일어나는 테이블일 때

---

## 결론

Clustered Index와 Non-Clustered Index는 단순히 "있으면 좋은" 것이 아니라, **성능에 직결되는 중요한 설계 요소**입니다.

쿼리 성능이 고민이라면, 지금 사용하는 인덱스 구조가 쿼리 목적에 맞는지 꼭 점검해보세요.

> 여러분은 어떤 기준으로 인덱스를 설계하시나요?
