---
title: "nestjs 빌드 속도 개선"
description: "nestjs에서 package manager 마이그레이션과 swc를 통한 빌드 속도 개선하기"
date: 2024-06-18
update: 2024-06-18
tags:
  - nestjs
  - package manager
  - 성능 개선
series: "NestJS"
---

# Feature

빌드 속도를 개선하기 위해, **yarn classic -> yarn berry (zero install) -> pnpm**으로 마이그레이션 하는 과정과 **docker multi-stage** 적용, nestjs에서 **swc**를 통한 컴파일 속도 최적화를 진행했습니다.

## Situation

현재 저희는 **AWS ECS**를 통해 서버를 배포하고 있습니다. github의 코드가 **docker image**로 빌드되고, **AWS ECR**을 거쳐 **AWS ECS**의 인스턴스로 생성되는 파이프라인이 구성되어 있습니다.

## Task

- package 설치 속도 및 의존성 관리 개선
- docker 빌드 속도 개선
- nestjs 빌드 · 컴파일 속도 개선

## Action

### package manager 마이그레이션

기존 yarn classic에서 yarn berry (zero-install)을 업그레이드한 뒤, 다양한 고려사항으로 인해 pnpm으로 최종 마이그레이션을 진행했습니다.

실제 pacakge 설치 속도 및 크기를 크게 개선할 수 있었습니다.
| yarn classic | pnpm |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 153.4s | 49.0s |

> package manager 마이그레이션 과정은 해당 포스팅에서 확인할 수 있습니다.

### docker multi-stage 적용

### nestjs에서 swc 적용

## Result

해당 작업 결과로 docker 이미지 빌드 시간은 301.6s -> 112.6s 로 개선했고,
이미지 용량도 1GB -> 830MB로 감소시킬 수 있었다.
| yarn classic | pnpm |
| ------------------------------------ | ------------------------------------ |
| [+] Building 301.6s (12/12) FINISHED | [+] Building 112.6s (17/17) FINISHED |

<img width="1157" alt="upload_test" src="https://imgur.com/zJUQ9n9.png">
