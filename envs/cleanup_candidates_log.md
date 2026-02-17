# Cleanup Candidates Log

- 범위: `.dat` 제외
- 목적: 불필요 로직 후보 식별 결과 로그(미적용 상태)

## 즉시 삭제 가능 (리스크 매우 낮음)

`reactwork/src/components/Sidebar.jsx.rej`
- 이유: merge reject 산출물(실행 코드 아님), 런타임 참조 없음

`git`
- 이유: 루트 0-byte 빈 파일, 프로젝트 동작과 무관

`backwork/src/main/java/com/example/backwork/teamsch/ScheduleTeam.java`
- 이유: 빈 클래스, 참조 없음

`backwork/src/main/java/com/example/backwork/teamsch/ScheduleTeamService.java`
- 이유: 사용처 참조 없음(서비스 정의만 존재)

## 삭제 전 1회 확인 후 삭제 (리스크 낮음)

`reactwork/src/context/TeamCalendarContext.jsx`
- 이유: `TeamCalendarProvider` 중복 구현, 실제 wiring은 `reactwork/src/components/TeamCalendarContext.jsx` 사용
- 확인 포인트: 동적 로딩/alias import 경로 숨김 여부 1회 점검

`reactwork/src/components/TeamCalendar.jsx`
- 이유: `TeamCalendarProvider/useTeamCalendar` 중복 구현, 참조 없음
- 확인 포인트: 단기 재사용 계획(브랜치/태스크) 여부 팀 확인

`reactwork/src/context/schedule/ScheduleProvider.jsx`
- 이유: `reactwork/src/context/ScheduleContext.jsx`와 역할 중복, 실제 앱은 후자 사용
- 확인 포인트: 문서/스크립트에서 구 경로 import 여부 점검

`reactwork/src/context/schedule/useSchedulePersistence.js`
- 이유: 미사용 `context/schedule/ScheduleProvider.jsx` 내부 전용 의존
- 확인 포인트: 단독 import 참조 없음 재확인

`reactwork/src/context/schedule/useScheduleServer.js`
- 이유: 미사용 `context/schedule/ScheduleProvider.jsx` 내부 전용 의존
- 확인 포인트: 단독 import 참조 없음 재확인

`reactwork/src/hooks/useTeamCalendarLock.js`
- 이유: export만 있고 호출부 없음
- 확인 포인트: 최근 릴리즈 도입 예정 기능 여부 확인

## 삭제 후보에서 제외 (보류 유지)

`backwork/src/main/java/com/example/backwork/auth/AuthLoginSecurityContextIntegrationTest.java`
- 이유: placeholder 테스트 클래스이나 `src/main` 경로에 위치
- 확인 포인트: 삭제보다 `src/test` 이동/재작성 판단 필요

`backwork/src/main/java/com/example/backwork/auth/TestController.java`
- 이유: `/ping` 테스트성 엔드포인트
- 확인 포인트: 로컬 헬스체크/운영 점검 용도 사용 여부 확인

`backwork/src/main/java/com/example/backwork/memo/MemoController.java`
- 이유: TODO/임시 주석 신호는 있으나 실제 호출 중
- 확인 포인트: 미사용 삭제 대상이 아닌 개선(인증 연동) 항목으로 별도 관리
