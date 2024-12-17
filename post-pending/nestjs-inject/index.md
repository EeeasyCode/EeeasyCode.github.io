---
title: "NestJS에서의 "
description: "객체 지향 컨셉 DIP와 OCP를 지키기 위한 노력"
date: 2024-08-27
update: 2024-08-27
tags:
  - NestJS
series: "NestJS"
---

UserController 는 UserService의 구체 클래스에 의존하지 않고, 인터페이스에 의존하는 것을 볼 수 있다.
이 결과로 UserController는 추상화된 인터페이스를 의존하기 때문에 만약 비즈니스 방향성의 변경으로 인해 구현체가 변경되어도 Controller의 로직에는 아무런 변화가 없다.

더 큰 효과는 Service가 Repository 구현체에 직접 의존하게 될 경우, Repository가 mysql -> mongodb로 변경된다면 service 로직에서의 DI된 부분도 수정이 되어야 한다는 것이다. 서비스가 커지고 의존 관계가 복잡해질수록 작은 side-effect 가 걷잡을 수 없이 커져 유지보수 및 확장성에 걸림돌이 될 가능성이 높다.

가장 중요한 것 -> DIP, OCP
