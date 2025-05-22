---
title: "NestJS에서 class-validator와 class-transformer는 어떻게 동작할까?"
description: "왜? 라는 질문을 일주일동안 해본 결과물"
date: 2025-05-22
tags: [nestjs, validation, class-validator, class-transformer, 데코레이터]
series: "NestJS"
---

NestJS를 사용하다 보면 DTO를 통해 API 요청 데이터를 검증하거나 변환할 일이 많습니다. 이때 자주 사용하는 두 가지 핵심 라이브러리가 바로 `class-validator`와 `class-transformer`입니다. 이 글에서는 이 두 도구가 **어떤 순서로**, **어떻게 동작하는지**, 그리고 제가 자주 헷갈렸던 `@ValidateIf`와 `@IsOptional`의 처리 방식까지 함께 정리해보겠습니다.

## 1. class-validator와 class-transformer란?

### 📌 class-validator

`class-validator`는 클래스 기반의 유효성 검증 도구입니다. `@IsEmail`, `@IsNotEmpty`, `@MinLength` 등의 데코레이터를 통해 클래스 프로퍼티에 유효성 조건을 정의할 수 있습니다. NestJS의 `ValidationPipe`와 함께 사용되며, 유효하지 않은 요청은 자동으로 예외를 발생시킵니다.

### 🔁 class-transformer

`class-transformer`는 평범한 JavaScript 객체를 지정한 클래스 인스턴스로 변환하거나 그 반대를 수행합니다. 예를 들어 `plainToInstance()`를 통해 API 요청 본문 데이터를 DTO 클래스로 변환해줄 수 있습니다.

## 2. 실행 순서: Transform → Validate

    Type (class-transformer) → (ValidateIf + IsOptional) → IsDefined → ETC

NestJS의 `ValidationPipe` 내부를 보면 다음과 같은 흐름으로 동작하는 것을 확인할 수 있습니다.

```ts
// validation.pipe.ts

public async transform(value: any, metadata: ArgumentMetadata) {
    ...
    // class-transformer
    let entity = classTransformer.plainToInstance(
      metatype,
      value,
      this.transformOptions,
    );

    ...

    // class-validator
    const errors = await this.validate(entity, this.validatorOptions);

    ...
  }
```

즉, class-transformer가 먼저, 그 다음 class-validator가 동작합니다.

이 순서가 중요한 이유는 다음과 같습니다.

- "123" 같은 문자열 숫자가 먼저 number로 변환된 후에 @IsInt() 같은 데코레이터가 정상 동작되어야 합니다.
- 변환이 잘못되면 검증도 제대로 되지 않습니다.

## 3. 데코레이터 평가 순서

validator 데코레이터의 내부 동작을 살펴보면, 다음과 같은 순서로 실행됩니다.

    (ValidateIf + IsOptional) → IsDefined → 기타 class-validator 데코레이터들

이 순서를 결정하는 것은`class-validator`의 핵심 클래스인 `ValidationExecutor`의 내부 코드입니다.

```ts
// class-validator/ValidationExcutor.js

performValidations(object, value, propertyName, definedMetadatas, metadatas, validationErrors) {
    const customValidationMetadatas = metadatas.filter(metadata => metadata.type === ValidationTypes_1.ValidationTypes.CUSTOM_VALIDATION);
    const nestedValidationMetadatas = metadatas.filter(metadata => metadata.type === ValidationTypes_1.ValidationTypes.NESTED_VALIDATION);
    const conditionalValidationMetadatas = metadatas.filter(metadata => metadata.type === ValidationTypes_1.ValidationTypes.CONDITIONAL_VALIDATION);
    const validationError = this.generateValidationError(object, value, propertyName);

    validationErrors.push(validationError);

    const canValidate = this.conditionalValidations(object, value, conditionalValidationMetadatas);
    if (!canValidate) {
        return; // 조건이 만족되지 않으면 나머지 검증은 건너뜀
    }

    // handle IS_DEFINED validation type the special way - it should work no matter skipUndefinedProperties/skipMissingProperties is set or not
    this.customValidations(object, value, definedMetadatas, validationError);
    this.mapContexts(object, value, definedMetadatas, validationError);

    if (value === undefined && this.validatorOptions && this.validatorOptions.skipUndefinedProperties === true) {
        return;
    }

    if (value === null && this.validatorOptions && this.validatorOptions.skipNullProperties === true) {
        return;
    }

    if ((value === null || value === undefined) &&
        this.validatorOptions &&
        this.validatorOptions.skipMissingProperties === true) {
        return;
    }

    this.customValidations(object, value, customValidationMetadatas, validationError);
    this.nestedValidations(value, nestedValidationMetadatas, validationError);
    this.mapContexts(object, value, metadatas, validationError);
    this.mapContexts(object, value, customValidationMetadatas, validationError);
}
```

## 4. @ValidateIf와 @IsOptional의 관계

두 데코레이터는 둘 다 조건부 검증에 사용됩니다. 차이점은 다음과 같습니다.

- @ValidateIf(fn) : fn이 true를 반환할 때만 이후 데코레이터를 적용합니다.
- @IsOptional() : 값이 undefined 또는 null이면 이후 검증을 건너뜁니다.

### 💡 평가 순서는 중요하지 않다?

@ValidateIf 와 @IsOptional 의 평가 순서에 대해서 처음에 이해하기 어려웠지만, 내부 구현 코드를 보며 어느정도 이해할 수 있었습니다.

우선, 두 데코레이터의 평가 순서는 데코레이터 선언 순서에 따라 달라집니다. 하지만, 결국 두 데코레이터는 AND 연산으로 평가되기 때문에 평가 순서에 따라 평가 결과가 달라지지는 않습니다.

즉, 아래의 두 코드는 서로 다른 순서로 데코레이터가 선언되어 있어도 **검증 결과는 항상 동일**합니다.

```ts
@ValidateIf((obj) => obj.price !== undefined)
@IsOptional()
@IsNotEmpty()
price?: number;
```

```ts
@IsOptional()
@ValidateIf((obj) => obj.price !== undefined)
@IsNotEmpty()
price?: number;
```

그 이유는 `class-validator` 내부적으로 `@ValidateIf`와 `@IsOptional`은 둘 다 `CONDITIONAL_VALIDATION` 타입으로 처리되며, 아래처럼 **AND 연산**으로 평가되기 때문입니다.

```ts
private conditionalValidations(object: object, value: any, metadatas: ValidationMetadata[]): ValidationMetadata[] {
    return metadatas
      .map(metadata => metadata.constraints[0](object, value))
      .reduce((resultA, resultB) => resultA && resultB, true);
  }
```

## 6. 마무리

class-transformer는 "변환", class-validator는 "검증"의 책임을 가지고 있으며, NestJS의 ValidationPipe 내부에서는 이 둘이 유기적으로 동작합니다.

자주 헷갈릴 수 있는 @ValidateIf와 @IsOptional은 둘 다 조건부 검증을 수행하며, 내부적으로는 순서에 상관없이 AND 조건으로 평가된다는 사실을 실제 내부 코드를 직접 뜯어보며 알아볼 수 있었습니다.

console.log를 찍거나 테스트 코드를 작성해도 충분히 확인할 수 있었지만, 결국 core 레벨의 코드를 직접 확인해야 마음이 놓이는 것 같네요.

## 참고 자료

- [class-validator GitHub](https://github.com/typestack/class-validator)
- [class-transformer GitHub](https://github.com/typestack/class-transformer)
- [NestJS 공식문서 - Pipes](https://docs.nestjs.com/pipes)
