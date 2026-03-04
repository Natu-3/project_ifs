# 관리자 대시보드 + 관리자 계정 생성/승격 가이드

## 1. 목적

이 문서는 다음 기능의 구현 계획과 실제 반영된 기능을 정리합니다.

- 관리자 전용 대시보드 (`/admin`)
- 관리자 계정 생성/승격 흐름 (부트스트랩 + 관리자 관리)
- 강제 비밀번호 변경 흐름 (`mustChangePassword`)
- 오늘 일정 문맥 요약 (하이브리드: 일정 데이터 + RAG 문서 컨텍스트)

기준 정책:

- 집계 범위: 전체 서비스 (개인 + 팀 캘린더)
- 오늘 기준 시간대: `Asia/Seoul`
- 마지막 ADMIN 보호: 활성화

---

## 2. 구현 개요

### 2.1 관리자 대시보드

관리자 페이지 `/admin`의 Dashboard 탭에서 제공:

- 사용자 수
- 오늘 생성된 일정 수
- 오늘 생성 일정의 문맥 요약

요약 생성 방식:

1. 오늘 생성 일정 목록(기본 컨텍스트) 생성
2. 해당 일정이 속한 캘린더의 READY 문서 조회
3. 캘린더별로 Python RAG Query 호출
4. 기본 일정 요약 + RAG 인사이트를 결합해 최종 요약 출력

요약 상태(`summaryStatus`):

- `FALLBACK`: 오늘 일정 0건
- `PARTIAL`: 일정은 있으나 문서/RAG 인사이트 부족
- `COMPLETED`: 일정 + RAG 인사이트 결합 성공
- `FAILED`: 예외 발생 시 (숫자 지표는 반환)

### 2.2 관리자 계정 생성/운영 (2단계 혼합)

1) 초기 1회 부트스트랩:

- ENV 값으로 첫 ADMIN 계정 생성
- 생성 시 `mustChangePassword=true`

2) 이후 운영:

- 기존 ADMIN이 관리자 Users 탭에서 사용자 권한 변경 (`USER` <-> `ADMIN`)
- 마지막 ADMIN은 USER로 내릴 수 없음

### 2.3 강제 비밀번호 변경

- 로그인/`me` 응답에 `mustChangePassword` 포함
- 값이 `true`이면 앱 주요 라우트 진입 전 `/force-password-change`로 이동
- 본인 비밀번호 변경 성공 시 `mustChangePassword=false`

---

## 3. 백엔드 API

## 3.1 관리자 API

### GET `/api/admin/dashboard/today`

관리자 대시보드 조회.

응답 필드:

- `generatedAt`
- `timezone`
- `userCount`
- `todayScheduleCount`
- `summary`
- `summaryStatus`
- `todayWindowStart`
- `todayWindowEnd`
- `calendarCount`
- `sourceCount`

### GET `/api/admin/users?page=0&size=20&keyword=...`

사용자 목록 조회(페이지네이션 + 검색).

응답:

- `items[]`: `id`, `userid`, `name`, `email`, `auth`, `createdAt`, `mustChangePassword`
- `page`, `size`, `totalElements`, `totalPages`

### PATCH `/api/admin/users/{userId}/role`

권한 변경.

요청:

```json
{
  "auth": "USER"
}
```

또는

```json
{
  "auth": "ADMIN"
}
```

제약:

- 마지막 ADMIN 계정은 USER로 변경 불가

### POST `/api/admin/users/{userId}/reset-password-required`

대상 계정의 `mustChangePassword=true` 설정.

## 3.2 인증 API 변경

### POST `/api/auth/login`

응답에 `mustChangePassword` 필드 추가.

### GET `/api/auth/me`

응답에 `mustChangePassword` 필드 추가.

### PUT `/api/auth/password`

본인 비밀번호 변경.

요청:

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password-8chars+"
}
```

성공 시 `mustChangePassword=false`로 전환.

---

## 4. 데이터 모델/저장소 변경

### 4.1 User

컬럼 추가:

- `must_change_password` (boolean, default false)

### 4.2 DatabaseInitializer 보강

- `auth` null/빈값 -> `USER` 보정
- `must_change_password` 컬럼 존재 보장

### 4.3 Repository 추가 메서드

- `UserRepository`
  - `countBy()`
  - `countByAuth(String auth)`
  - `searchUsers(keyword, pageable)`
- `ScheduleRepository`
  - `countByCreatedAtBetween(start, end)`
  - `findByCreatedAtBetweenWithCalendarAndOwner(start, end)`
- `RagDocumentRepository`
  - `findByCalendarIdInAndStatus(calendarIds, READY)`

---

## 5. Python RAG 계약 변경

`QueryRequest.owner_user_id`를 nullable로 확장.

- 값 존재: 기존처럼 owner 필터 적용
- 값 없음(`null`): owner 필터 생략
- 공통 필터 유지: `calendarId`, `status=active`, `documentId in (...)`

효과:

- 일반 사용자 흐름은 기존 동작 유지
- 관리자 집계 요약에서 캘린더 단위 요약 호출 가능

---

## 6. 프론트엔드 변경

### 6.1 라우트

- `/admin`: ADMIN 전용
- `/force-password-change`: 강제 비밀번호 변경 페이지

### 6.2 TopBar

- 로그인 사용자가 ADMIN이면 `Admin` 버튼 노출

### 6.3 Admin 페이지

탭 구성:

- Dashboard 탭: 지표 카드 + 요약 + 새로고침
- Users 탭: 사용자 검색/페이지네이션/권한 변경/비밀번호 변경 요구

### 6.4 mustChangePassword 가드

- 전역 라우트 가드(`MustChangePasswordRoute`)로 강제 이동 처리

---

## 7. 부트스트랩 환경 변수

다음 ENV를 설정하면 앱 시작 시 부트스트랩 관리자 로직이 동작합니다.

- `BOOTSTRAP_ADMIN_USERID`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `BOOTSTRAP_ADMIN_EMAIL` (옵션)
- `BOOTSTRAP_ADMIN_NAME` (옵션)

동작 규칙:

- 동일 userid가 없으면 새 ADMIN 생성 + 개인 캘린더 생성
- 동일 userid가 있으면 `auth=ADMIN`, `mustChangePassword=true` 보장
- 기존 비밀번호는 자동 덮어쓰기하지 않음

---

## 8. 권한/보안 정책

- 관리자 API는 세션 로그인 + `auth=ADMIN` 검증 필수
- 권한 변경/비번 변경 요구는 감사 로그 출력
- 마지막 ADMIN 보호 적용

주의:

- 기존 메모/일정 API의 `permitAll` 하드닝은 별도 작업으로 분리됨

---

## 9. 검증 방법

### 9.1 빌드/컴파일

- Backend: `./gradlew.bat compileJava -x test`
- Python API: `python -m compileall python_api\app`
- Frontend: `npm run build` (in `reactwork`)

### 9.2 기능 확인 시나리오

1. 부트스트랩 ENV 설정 후 서버 기동
2. 부트스트랩 ADMIN 로그인
3. `/force-password-change` 이동 확인 및 비밀번호 변경
4. `/admin` 접근 후 Dashboard 수치/요약 확인
5. Users 탭에서 USER -> ADMIN 승격 확인
6. 마지막 ADMIN 강등 시도 시 차단 확인
7. 특정 사용자에 비밀번호 변경 요구 설정 후 재로그인 시 강제 변경 확인

---

## 10. 주요 파일

백엔드:

- `backwork/src/main/java/com/example/backwork/admin/*`
- `backwork/src/main/java/com/example/backwork/config/BootstrapAdminInitializer.java`
- `backwork/src/main/java/com/example/backwork/auth/AuthController.java`
- `backwork/src/main/java/com/example/backwork/auth/AuthService.java`
- `backwork/src/main/java/com/example/backwork/member/User.java`
- `backwork/src/main/java/com/example/backwork/config/DatabaseInitializer.java`

파이썬:

- `python_api/app/schemas/rag.py`
- `python_api/app/services/vector_store_adapter.py`

프론트:

- `reactwork/src/pages/AdminPage.jsx`
- `reactwork/src/pages/ForcePasswordChange.jsx`
- `reactwork/src/routes/AdminRoute.jsx`
- `reactwork/src/routes/MustChangePasswordRoute.jsx`
- `reactwork/src/App.jsx`
- `reactwork/src/components/TopBar.jsx`

