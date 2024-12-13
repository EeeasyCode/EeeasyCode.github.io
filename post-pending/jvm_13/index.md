# JVM 밑바닥까지 파헤치기

## 13.2 스레드 안전성

스레드 안전성이라는 것에 대한 정의로 여러 스레드가 한 객체에 동시에 접근할 때, 어떤 런타임 환경에서든 아래의 조건을 모두 충족하며 객체를 호출하는 행위가 올바른 결과를 얻을 수 있다면, 이를 스레드 안전하다고 말합니다.

- 특별한 스레드 스케줄링이나 대체 실행 수단을 고려할 필요가 없다.
- 추가적인 동기화 수단이나 호출자 측에서 조율이 필요 없다.

### 자바 언어의 스레드 안전성

#### 불변

불변 객체는 생성된 이후 값이 변경되지 않도록 보장됩니다.

모든 필드가 final로 선언되고, 객체 상태가 생성 시점에 완전히 결정되기 때문에 여러 스레드에서 동시에 접근하더라도 안전합니다.

```java
public final class ImmutableExample {
    private final int value;

    public ImmutableExample(int value) {
        this.value = value;
    }

    public int getValue() {
        return value;
    }
}
```

특징

- 필드 값이 변경되지 않으므로 동기화가 필요 없음.
- String, BigDecimal, BigInteger 등은 불변 객체의 대표적인 예.

#### 절대적 스레드 안전

절대적 스레드 안전은 어떤 상황에서도 추가 동기화 없이도 안전하게 동작할 수 있는 객체를 의미합니다.

대표적인 예로, java.util.concurrent.atomic 패키지의 클래스들이 있습니다.

```java
import java.util.concurrent.atomic.AtomicInteger;

public class AbsoluteThreadSafeExample {
    private final AtomicInteger count = new AtomicInteger(0);

    public void increment() {
        count.incrementAndGet(); // 원자적 연산으로 동기화 불필요
    }

    public int getCount() {
        return count.get(); // 항상 최신 값을 읽음
    }
}
```

특징

- AtomicInteger는 동기화 없이도 스레드 안전한 연산을 제공.
- 내부적으로 CAS(Compare-And-Swap) 연산을 사용하여 데이터 충돌 방지.

#### 조건부 스레드 안전

조건부 스레드 안전은 객체가 일반적으로 스레드 안전하지만, 특정 상황에서는 동기화가 필요한 상태를 의미합니다.

대표적인 예로, Collections.synchronizedList 등이 있습니다.

```java
import java.util.*;

public class ConditionalThreadSafeExample {
    private final List<String> list = Collections.synchronizedList(new ArrayList<>());

    public void addItem(String item) {
        synchronized (list) {
            list.add(item); // 명시적으로 동기화 필요
        }
    }

    public void printItems() {
        synchronized (list) {
            for (String item : list) {
                System.out.println(item);
            }
        }
    }
}
```

특징

- 동기화를 보장하지만, 반복문과 같은 작업에서는 명시적인 동기화가 필요.
- Hashtable, Vector도 조건부 스레드 안전에 해당.

#### 스레드 호환

스레드 호환 객체는 스레드 안전하지 않지만, 외부에서 적절히 동기화하면 안전하게 사용할 수 있는 객체를 의미합니다.

대부분의 자바 클래스는 기본적으로 스레드 호환입니다.

```java
import java.util.*;

public class ThreadCompatibleExample {
    private final List<String> list = new ArrayList<>();

    public synchronized void addItem(String item) {
        list.add(item); // 외부에서 동기화 처리
    }

    public synchronized String getItem(int index) {
        return list.get(index); // 외부에서 동기화 처리
    }
}
```

특징

- 동기화를 호출자 측에서 직접 처리해야 함.
- 기본적으로 자바 컬렉션(ArrayList, HashMap 등)은 스레드 호환.

#### 스레드 적대적

스레드 적대적 객체는 멀티스레드 환경에서 안전하게 사용할 수 없는 객체를 의미합니다.

설계나 구현의 결함으로 인해 항상 동시 접근 시 문제가 발생합니다.

```java
public class DeadlockExample {
    private final Object lock1 = new Object();
    private final Object lock2 = new Object();

    public void method1() {
        synchronized (lock1) {
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) { }
            synchronized (lock2) {
                System.out.println("Method1 executed");
            }
        }
    }

    public void method2() {
        synchronized (lock2) {
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) { }
            synchronized (lock1) {
                System.out.println("Method2 executed");
            }
        }
    }
}
```

특징

- 교착 상태(Deadlock), 경쟁 상태(Race Condition)가 자주 발생.
- 반드시 재설계가 필요.

### 스레드 안전성 구현

#### 상호 배제 동기화

상호 배제는 한 번에 하나의 스레드만 공유 자원에 접근하도록 제한하는 방식입니다.

대표적으로 synchronized 키워드와 ReentrantLock이 사용됩니다.

```java
public class SynchronizedExample {
    private int count = 0;

    public synchronized void increment() {
        count++;
    }

    public synchronized int getCount() {
        return count;
    }
}
```

#### 논블로킹 동기화

논블로킹 동기화는 스레드 간 충돌 없이 동시 작업을 처리하도록 설계된 방식입니다.

CAS(Compare-And-Swap) 연산이 대표적인 구현 방식이며, Atomic 클래스를 통해 사용할 수 있습니다.

```java
import java.util.concurrent.atomic.AtomicInteger;

public class NonBlockingExample {
    private final AtomicInteger count = new AtomicInteger(0);

    public void increment() {
        count.incrementAndGet(); // 원자적 연산
    }
}
```

#### 동기화가 필요 없는 메커니즘

불변 객체나 스레드 로컬(ThreadLocal)을 사용하여 동기화를 완전히 피할 수 있습니다.

```java
public class ThreadLocalExample {
    private static final ThreadLocal<Integer> threadLocal = ThreadLocal.withInitial(() -> 0);

    public void setThreadLocalValue(int value) {
        threadLocal.set(value);
    }

    public int getThreadLocalValue() {
        return threadLocal.get();
    }
}
```

## 마무리

스레드 안전성은 효율적인 동시성 프로그래밍의 핵심인데요.

자바는 다양한 수준의 스레드 안전성을 제공하며, 개발자는 애플리케이션의 요구 사항에 맞는 적절한 방법을 선택해야 할 것 같습니다.

동기화 비용을 최소화하면서도 안전한 코드를 작성하는 것이 중요해보이네요!
