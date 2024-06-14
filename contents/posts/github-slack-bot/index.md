---

title: "github slack bot 만들기"
description: "github-action으로 PR 리뷰어 할당 slack 봇 만들기"
date: 2024-02-27
update: 2024-02-27
tags:
- github-action
- 자동화
  series: "automation"

---

## Tech Environment

- Python v3.12
- actions/checkout@v3
- actions/setup-python@v3
- python code의 의존성을 위해 requirements.txt로 라이브러리 설치

## member_list.json

해당 파일에 멤버 리스트를 등록하여 사용합니다.

```json
[
  {
    "githubName": "CEethan",
    "slackUserId": "U069RPHRU95"
  },
  {
    "githubName": "EeeasyCode",
    "slackUserId": "U069RPHRU95"
  }
]
```

이와 같은 형식으로 등록합니다.

---

## PR notificaiton bot

> 지정한 레포지토리의 PR이 남아있는지 확인 후, 평일 지정한 시간에 Slack을 통해 알림을 전송하는 Bot 입니다.

### Code Description

### pr-notification.py

- python 코드로 slack, github 연동
- github repository 정보를 가져와 slack 메시지 형태로 가공
- 가공된 메시지를 지정한 slack 채널로 전송

### pr-notification-bot.yml

- schedule -> cron 표현식을 통해 지정한 시간마다 동작하도록
  스케줄링
- 이후, github secret을 사용해 env 값 설정
- github action을 활용하여 pr-notification.py를 실행

---

## assign reviewer bot

> PR을 올리면 랜덤으로 리뷰어가 할당되어 Slack을 통해 알림받을 수 있습니다.

### Code Description

### assign-reviewer.py

- python 코드로 slack, github 연동
- python 내부 로직에 의해, 자동으로 리뷰어를 할당하여 등록함
- 리뷰어로 할당된 멤버에게 Slack 메시지 전송

### assign-reviewer-bot.yml

- PR 이벤트를 감지하여 PR이 올라올 경우 해당 action 트리거
- 이후, github secret을 사용해 env 값 설정
- github action을 활용하여 assign-reviewer.py를 실행

---

## review check bot

> 리뷰어가 PR에 대한 리뷰를 완료하면 PR 담당자에게 Slack 메시지를 전송합니다.

### Code Description

### review-check.py

- python 코드로 slack, github 연동
- python 내부 로직에 의해 PR 담당자에게 리뷰가 되었음을 알림

### review-check-bot.yml

- PR의 리뷰 이벤트를 감지하여 리뷰가 등록된 경우 해당 action
  트리거
- 이후, github secret을 사용해 env 값 설정
- github action을 활용하여 review-check.py를 실행
