---
title: "NestJS에서 인터페이스 DI"
description: "NestJS에서 인터페이스를 DI하면 어떻게 될까?"
date: 2024-08-24
update: 2024-08-24
tags:
  - NestJS
series: "NestJS"
---

# NestJS에서의 DI와 인터페이스

## SpringBoot

우선 SpringBoot에서 OCP와 DIP를 지키기 위해, DI하는 경우 인터페이스를 사용하는 것을 볼 수 있다.

```java
interface UserService {
	void signUp(..);
}

@Service
public class UserServiceImpl implements UserService {
    @Override
    public void signUp(..) {
    	...
	}
}
@RestController
public class UserController {
	private final UserService userService;
        ...
{
```

간단하게, DI 받는 부분에서 <code>private final UserService: userService</code> 로 명시하는 것을 볼 수 있다.


## NestJS

그럼 NestJS도 SpringBoot와 같은 개념이니까, 그대로 따라하면 정상적으로 동작할까?
```ts
export interface UserService {
    signUp(..);
}

@Injectable()
export class UserServiceImpl implements UserService {
    signUp(..) {
        ...
    }
}

@Controller()
export class UserController {
    constructor(
        private readonly userService: UserService; 
    )
    ...
}
```

결과는  Nest can't resolve dependencies ~ 에러를 뱉어낸다. 의존성을 해결하지 못해 발생하는 에러인데, 왜 발생하는걸까? 

### TS의 interface
Typescript에서 제공하는 interface는 런타임 시, 사라지게 된다. DI는 런타임 시점에서 동작하게 되는데, 해당 interface를 찾지 못해 의존성을 해결하지 못하는 것이다.

그럼 그냥 사용하지 못하는걸까?

### Provider 설정

그건 아니다. 다행히, NestJS의 provider 설정을 직접 해주면 된다.

```ts
@Module({
  controllers: [UserController],
  providers: [
    {
      provide: 'USER_SERVICE',
      useClass: UserServiceImpl,
    },
  ],
})
export class UserModule {}

@Controller()
export class UserController {
    constructor(
        @Inject('USER_SERVICE')
        private readonly userService: UserService; 
    )
    ...
}
```

먼저, module의 providers에 Inject Token과 실제 구현 클래스를 명시해준다.
그 뒤, DI 하는 부분에서 내가 명시한 Inject Token으로 Inject 받으면 문제 없이 인터페이스를 DI할 수 있게 된다.

---

추가 설명 필요 (Inject와 Providers)