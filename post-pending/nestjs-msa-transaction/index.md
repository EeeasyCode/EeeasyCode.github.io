## 문제 상황

MSA 프로젝트를 진행하던 중, 회원가입 과정에서 나는 소셜 로그인 정보를 저장하는 Auth Service와 guest 상태의 유저를 저장하는 User Service 로직을 하나의 단위로 묶어 구현했다.

<회원가입 flow>

1. 소셜 로그인 진행
2. User Server의 service에서 guest 상태 유저를 생성
3. 생성된 user의 id를 FK로 Auth Server의 service에서 소셜 로그인 정보를 저장

근데 만약, guest 상태의 유저가 생성되었지만, auth 서버와의 통신 에러로 인해 만들어진 유저와의 관계가 있는 auth 정보가 저장되지 못한 채 종료된다면 생성된 user는 어떻게 해야할까?

## 해결 방안

## 적용

## 결과
