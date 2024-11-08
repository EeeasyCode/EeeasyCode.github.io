---
title: "싱글톤에 대한 오해"
description: "난 싱글톤이 그냥 만들어지는 줄 알았지"
date: 2024-11-09
update: 2024-11-09
tags:
  - 객체지향
series: "TIL"
---

### Prerequisite :
본 글에서 언급되지만, 직접적인 설명은 하지 않는 것들입니다.
- 객체
- 싱글톤
- 정적 팩토리 메서드 패턴
- DI/IoC

<br>

# 싱글톤에 대한 오해
최근에 프론트엔드 개발자 지인과 함께 커피챗을 했는데, 나왔던 이야기 중 "객체"와 "싱글톤" 에 관련된 주제로 이야기를 나눴다. 정확히는 내가 정적 팩토리 메서드에 관한 이야기를 하다가 잘못 이야기를 한 부분이 있었는데, 정적 팩토리 메서드 패턴으로 객체를 생성하면 객체들을 싱글톤으로 관리할 수 있다고 이야기를 했다.
그리고, 그 자리에서 지인이 JS로 내가 말한 내용이 맞는지 바로 테스트했다. 그때 작성했던 코드는 다음과 같다.

```javascript
class Latte {
    constructor() {
        return this.name = "Latte";
    }
}

class LatteFactory {
    static makeCoffee() {
        return new Latte();
    }
}

const factoryList = { LatteFactory };

class CoffeeFactory {
    static makeCoffee(type) {
        const factory = factoryList[type];

        return factory.makeCoffee();
    }
}

const coffee = CoffeeFactory.makeCoffee("LatteFactory");
const coffee2 = CoffeeFactory.makeCoffee("LatteFactory");

console.log(coffee==coffee2); // False
```

내가 말한대로라면, 정적 팩토리 메서드 패턴으로 생성된 두 객체는 싱글톤 객체니까, 비교했을 때 True가 나와야 했다. 근데, False가 나오게 되었다. 나는 '엥? 뭐지' 라고 생각을 했고, 그냥 서로 어찌저찌 이야기를 하다가 넘어가게 되었다.

## 이걸 그냥 넘어간다고?
커피챗이 끝나고 집으로 돌아가서 잠을 자려고 하는데, 아무리 생각해도 내가 뭔가를 잘못 설명한 기분이 들었다. 너무 찜찜한 기분이라 해결하고 자야겠다는 생각을 했다.

다시 돌아가보자. 내가 분명 "정적 팩토리 메서드 패턴을 사용하면, 객체는 싱글톤으로 관리돼" 라고 이야기를 했다. 그래서, 다시 나누어 생각해보기로 한다.

1. 정적 팩토리 메서드 패턴 -> 객체를 생성하는 디자인 패턴
2. 싱글톤 객체 -> 객체의 인스턴스를 한개만 생성되게 하는 패턴

### 정적 팩토리 메서드 패턴이 싱글톤을 보장하는가?
당연하게도 정적 팩토리 메서드 패턴만을 사용한다고 객체가 싱글톤으로 생성된다는 것은 말이 안된다. 그 당시에 무슨 생각으로 그렇게 말을 했을까? 어쨌든, 정적 팩토리 메서드에 인스턴스가 싱글톤으로 생성될 수 있도록 검증하는 로직이 필요하다. 아까, JS로 테스트한 코드에 추가해보자.

```javascript
class Latte {
    constructor() {
        return this.name = "Latte";
    }
}

class LatteFactory {
    static makeCoffee() {
        if (!LatteFactory.instance) {
            LatteFactory.instance = new Latte();
        }
        return LatteFactory.instance;
    }
}

const factoryList = { LatteFactory };

class CoffeeFactory {
    static makeCoffee(type) {
        const factory = factoryList[type];

        return factory.makeCoffee();
    }
}

const coffee = CoffeeFactory.makeCoffee("LatteFactory");
const coffee2 = CoffeeFactory.makeCoffee("LatteFactory");

console.log(coffee==coffee2); // True
```

LatteFactory -> makeCoffee 메서드 내부에 해당 객체가 이미 존재하는지를 검증하는 로직이 추가되었다. 그 결과, 객체를 최초로 생성한 이후 추가 생성에 대해서는 새로 객체를 생성하지 않는다. 

이로써, 싱글톤 객체를 보장하는 정적 팩토리 메서드 패턴을 코드로 구현해보았다.

지인에게 바로 연락해서 잘못된 내용을 바로 잡았다. 
![](https://i.imgur.com/zEDenOZ.png)

## 근데 왜 잘못 말했지?

지인에게 잘못된 내용에 대해 이야기하고 내가 왜 그렇게 생각했었는지 다시 고민해보았다. 우린, 객체 지향 프레임워크 (Spring, NestJS 등)을 사용하여 서비스를 구현한다. DI/IoC 기능으로 우리는 객체에 대한 생명 주기를 신경쓰지 않아도 되는데, 나는 이 부분과 혼동하여 무턱대고 "정적 팩토리 메서드 패턴을 사용하면 객체가 싱글톤으로 관리됨" 이라는 판단을 내린 것이다.

## 그럼 객체 지향 프레임워크에서는 싱글톤을 어떻게 관리할까?

갑자기, 객체 지향 프레임워크 내에서는 어떻게 객체를 싱글톤으로 관리하는지 궁금했다. 분명히, 내가 위에서 말한 싱글톤을 위한 검증 로직이 존재할텐데 어떤 식으로 구성을 하고 있는지 직접 두 눈으로 보고 싶다는 호기심이 생겼다.


### NestJS Core부터 까보자

우선, 내가 가장 잘 이해할 수 있는 NestJS 부터 까보기로 했다. 평소에도 NestJS의 Core를 뜯어봤기 때문에, 빠르게 확인할 수 있을 것 같았다. NestJS의 IoC 컨테이너를 바로 확인해봤다.

NestJS에서 싱글톤 객체를 생성하고 관리하는 부분은 다음 메소드들에서 이루어진다:

``` typescript
public async addModule(metatype: ModuleMetatype, scope: ModuleScope)
private async setModule({ token, dynamicMetadata, type }: ModuleFactory, scope: ModuleScope)
public addProvider(provider: Provider, token: string, enhancerSubtype?: EnhancerSubtype)
```

여기서, addModule 메서드를 살펴보면,
``` typescript
// NestContainer.ts
...
public async addModule(
    metatype: ModuleMetatype,
    scope: ModuleScope,
  ): Promise<
    | {
        moduleRef: Module;
        inserted: boolean;
      }
    | undefined
  > {
    // In DependenciesScanner#scanForModules we already check for undefined or invalid modules
    // We still need to catch the edge-case of `forwardRef(() => undefined)`
    if (!metatype) {
      throw new UndefinedForwardRefException(scope);
    }
    const { type, dynamicMetadata, token } =
      await this.moduleCompiler.compile(metatype);
    if (this.modules.has(token)) {
      return {
        moduleRef: this.modules.get(token),
        inserted: true,
      };
    }

    return {
      moduleRef: await this.setModule(
        {
          token,
          type,
          dynamicMetadata,
        },
        scope,
      ),
      inserted: true,
    };
  }
    ...
```

위 코드에서 객체가 이미 생성되어 존재하는지를 확인하는 로직이 if 문으로 구현되어 있는 것을 확인할 수 있다. token은 모듈의 고유 식별자로, 각 모듈마다 유일한 token이 생성되며 중복 생성 방지에 중요한 역할을 한다.

``` typescript
if (this.modules.has(token)) {
      return {
        moduleRef: this.modules.get(token),
        inserted: true,
      };
    }
```

이 코드에서는 모듈 token이 이미 존재할 경우 기존 모듈 인스턴스를 반환하여 싱글톤 패턴을 유지한다. 만약 존재하지 않는다면 setModule을 통해 새로 객체를 생성한다.

``` typescript
return {
      moduleRef: await this.setModule(
        {
          token,
          type,
          dynamicMetadata,
        },
        scope,
      ),
      inserted: true,
    };
  }
```

이처럼, NestJS에서는 addModule 메소드 내 token 확인을 통해 싱글톤 패턴을 유지하고 있다.

### Spring Core도 봐야지
자 그럼, 최근에 내가 사용하고 있는 Spring에서도 동일한 기능을 어떻게 지원하는지를 확인해보자.

Spring에서 싱글톤 객체 관리는 DefaultSingletonBeanRegistry 클래스의 getSingleton과 addSingleton 메서드를 통해 이루어진다. 이 과정에서 Spring은 싱글톤 패턴을 유지하기 위해 캐시 맵을 활용하며, 동일한 빈에 대한 중복 생성을 방지한다. 아래에서 Spring의 싱글톤 객체 관리 과정의 각 단계와 메서드를 설명한다.

getSingleton 메서드는 먼저 singletonObjects 캐시에 해당 빈이 존재하는지 확인한다. 빈이 이미 생성된 경우, 캐시에서 즉시 반환하여 불필요한 생성 과정을 피한다.

```java
// DefaultSingletonBeanRegistry.java
public Object getSingleton(String beanName, boolean allowEarlyReference) {
    Object singletonObject = singletonObjects.get(beanName);
    if (singletonObject == null && isSingletonCurrentlyInCreation(beanName)) {
        singletonObject = earlySingletonObjects.get(beanName);
    }
    ...
    return singletonObject;
}
```

이 메서드는 싱글톤 객체가 생성되지 않았다면, createBean 메서드를 호출해 객체를 생성하고 이를 캐시에 등록해준다. 이렇게 하면 동일한 빈에 대해 항상 같은 인스턴스를 반환하도록 보장한다.

싱글톤 객체가 singletonObjects에 없으면, createBean 메서드가 호출되어 새 객체를 인스턴스화하고 의존성을 주입한 후 초기화 과정을 거친다. 생성된 객체는 addSingleton을 통해 캐시에 등록된다.

```java
// AbstractAutowireCapableBeanFactory.java
protected Object doCreateBean(String beanName, RootBeanDefinition mbd, Object[] args) {
    BeanWrapper instanceWrapper = createBeanInstance(beanName, mbd, args);
    populateBean(beanName, mbd, instanceWrapper);
    ...
    return initializeBean(beanName, instanceWrapper.getWrappedInstance(), mbd);
}
```
registerSingleton 메서드도 외부 객체를 싱글톤으로 등록할 때 addSingleton을 호출한다.

```java
// DefaultSingletonBeanRegistry.java
public void registerSingleton(String beanName, Object singletonObject) {
    ...
    addSingleton(beanName, singletonObject);
}

protected void addSingleton(String beanName, Object singletonObject) {
    this.singletonObjects.put(beanName, singletonObject);
    this.singletonFactories.remove(beanName);
    this.earlySingletonObjects.remove(beanName);
    this.registeredSingletons.add(beanName);
}
```

이렇게 addSingleton은 빈을 싱글톤 객체로 캐시에 등록해, 이후 같은 빈 이름으로 요청이 들어오면 동일한 인스턴스를 반환하게 한다.

## 마무리

내가 잘못말한 내용이 프레임워크 코어까지 뜯어보게 한 트리거가 되었다. 궁금증이 생겼을 때 혹은 이해가 되지 않을 때 항상 끝까지 다이브하는 습관이 있는데, 나는 이 습관이 너무 잘 만들어 놓은 습관이라고 생각한다. 덕분에, 항상 새벽에 잠들긴하지만 몰랐던 부분에 대해서 그냥 넘어가는 것보다 훨씬 속편한 것 같다.

아무튼, 이렇게 "싱글톤에 대한 오해" 로 시작해서, 실제 우리가 사용하고 있는 프레임워크 내부까지 살펴보았다. 앞으로는 어디가서 똑같은 실수를 하지 않아야겠다..^^