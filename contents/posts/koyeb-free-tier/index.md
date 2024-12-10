---
title: "Koyeb에 NodeJS(Express) 서버 배포하기"
description: "간단한 프로젝트에 편리하게 서버 배포 해볼까?"
date: 2024-11-27
update:
tags:
  - koyeb
  - node.js
---

최근 프로젝트에서 백오피스를 만들게 되었는데, **React**로 Front 구현, **NodeJS(Express)**로 서버 개발을 진행하게 되었다. 백오피스 환경은 전부 무료 클라우드를 사용하고 싶어, React는 Netlify로 배포를 진행했고 NodeJS는 Koyeb로 배포를 진행했다. React는 성공적으로 배포가 되었지만, NodeJS는 배포 과정에서 에러를 계속 뱉어냈다.

# NodeJS 배포

Koyeb에서 지원하는 배포 방식에는 크게 두 가지가 있다.

    1. GitHub Repository를 통한 배포
    2. Docker를 통한 배포

## GitHub Repository 배포

나는 처음에 GitHub Repository를 통해 배포를 시도했다. 배포를 시켜놓고 잠깐 볼 일을 보고오니 에러가 발생해 있었다.
![](https://velog.velcdn.com/images/eeeasy-code/post/2c8da60d-73d4-47ae-9a7a-4bf8d0ce4db9/image.png)

무슨 문제로 에러가 발생했는지 확인하기 위해서 로그를 확인했다.
![](https://velog.velcdn.com/images/eeeasy-code/post/e59e0b62-954b-4bb8-ac31-c9dad982c4cd/image.png)

확인 결과, node_modules를 찾지 못해 발생한 에러였다. 기존 런타임 command를 <code> npm start</code>로만 지정해주어 발생한 것으로, <code> npm install; npm start</code>를 입력하면 정상적으로 배포가 수행된다.
![](https://velog.velcdn.com/images/eeeasy-code/post/090f718f-2025-4efb-8633-0836d00834ea/image.png)

## Docker 배포

GitHub로 배포를 하고나니 시간이 어느정도 여유가 생겨서 Docker Image로 배포하는 방법도 궁금해졌다. 클라우드에 배포를 진행할 때 거의 대부분 github repository로만 배포하다보니까 다른 배포 방식은 어떻게 진행되는지 알아보고자 docker로도 배포를 해보았다.

### Docker 배포 flow

    1. Dockerfile을 통해 NodeJS 서버를 이미지로 변환
    2. 생성된 이미지를 Docker Repository에 push
    3. Docker Repository 주소를 사용하여 클라우드에 배포

Docker로 배포하게 되면 위와같은 flow로 진행된다. Docker에 대한 기본적인 지식과 학습이 선행되어야 매끄럽게 진행될 것 같다.

**[Dockerfile]**

```
FROM node:20

WORKDIR "/app"

COPY ./package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

Dockerfile은 위와 같은 형태로 작성했다.

이후, <code>docker build .</code> 명령어로 이미지를 빌드하고 나의 docker repository에 push하면 된다.

![](https://velog.velcdn.com/images/eeeasy-code/post/63aa54f4-8afe-4719-884a-1d72ea448fc3/image.png)

마지막으로 koyeb 배포 설정에서 docker-repository 주소를 입력 후 배포하면 된다.
![](https://velog.velcdn.com/images/eeeasy-code/post/8147f915-c502-4a48-866a-7c37dd1ebd75/image.png)
