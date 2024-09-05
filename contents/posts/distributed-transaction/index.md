---
title: "분산 트랜잭션"
description: "MSA 환경에서 트랜잭션은 어떻게 관리해야할까?"
date: 2024-09-05
update: 2024-09-05
tags:
  - Database
  - MSA
series: "Database"
---

# 분산 트랜잭션
분산 트랜잭션은 쉽게 설명해서 데이터베이스의 트랜잭션이 하나가 아닌, 분산으로 발생하는 것을 말한다.
가령, 하나의 서버에서 서로 다른 DB를 사용하여 하나의 작업을 묶는 등 여러 리소스에 영향을 주는 트랜잭션처럼 말이다.

우선, 두 가지의 케이스를 고려해본다. 

**Monolithic 환경에서 DB 리소스가 1개인 경우**
![img](https://eeeasycode.github.io/src/images/monolithic.png)

대부분 Monolithic 구조에서 1개의 DB 만을 사용하는 경우가 대부분이다. 그래서 각 서비스가 접근해 발생하는 트랜잭션을 하나의 단위로 묶어서 처리한다.

예를 들어, order service에서 order 관련 데이터를 저장하고, stock service에서 특정 재고를 감소시킨 뒤, payment service에서 PG사와 통신 후 결제가 정상적으로 이루어지면 결제 정보를 저장한다.

만약, payment service에서 PG사 간 네트워크 통신 에러로 인해, 결제가 이루어지지 않는다면 대부분 DB에 write 한 작업들을 하나의 단위로 묶어 rollback 처리를 하도록 data manager에서 처리할 수 있다.

<br>

**MSA 환경에서 DB 리소스가 여러 개인 경우**
![img](https://eeeasycode.github.io/src/images/msa.png)
문제는 위와 같이 각각의 server도 분리되고, DB도 각 server마다 사용되는 MSA 환경의 폴리그랏 형태라면 transaction 들에 대한 관리는 어떻게 해야할까?

## 문제 상황
MSA 프로젝트를 진행하던 중, 회원가입 과정에서 나는 소셜 로그인 정보를 저장하는 Auth Service와 guest 상태의 유저를 저장하는 User Service 로직을 하나의 단위로 묶어 구현했다.

<회원가입 flow>
1. 소셜 로그인 진행
2. User Server의 service에서 guest 상태 유저를 생성 
3. 생성된 user의 id를 FK로 Auth Server의 service에서 소셜 로그인 정보를 저장

근데 만약, guest 상태의 유저가 생성되었지만, auth 서버와의 통신 에러로 인해 예외 처리가 된다면 생성된 user는 어떻게 해야할까?

## 해결 방안

## 적용

## 결과 
