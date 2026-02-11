# 프론트엔드 파일 구조 및 기능 정리

## 📁 전체 디렉토리 구조

```
reactwork/src/
├── api/                    # 백엔드 API 통신
├── assets/                 # 정적 리소스
├── components/             # 재사용 가능한 컴포넌트
├── componentsCss/          # 컴포넌트별 CSS 파일
├── context/                # 전역 상태 관리 (Context API)
├── pages/                  # 페이지 컴포넌트
├── routes/                 # 라우팅 관련
├── styles/                 # 전역 스타일
└── utils/                  # 유틸리티 함수
```

---

## 🔌 API 레이어 (`/api`)

### `axios.js`
- **역할**: Axios 인스턴스 설정 및 전역 인터셉터
- **기능**:
  - Base URL 설정 (`http://localhost:8080/api`)
  - 요청 인터셉터: localStorage의 `accessToken`을 자동으로 헤더에 추가
  - 모든 API 호출의 기본 설정

### `auth.js`
- **역할**: 인증 관련 API 호출
- **기능**:
  - `login(userid, password)`: 로그인
  - `signup(userid, password, email, name)`: 회원가입
  - `updateUserProfile(userId, data)`: 프로필 수정
  - `logout()`: 로그아웃

### `memo.js`
- **역할**: 메모 CRUD API
- **기능**:
  - `getMemos(userId)`: 메모 목록 조회
  - `createMemo(userId, content, pinned)`: 메모 생성
  - `updateMemo(userId, id, content, pinned)`: 메모 수정
  - `deleteMemo(userId, id)`: 메모 삭제

### `scheduleApi.js`
- **역할**: 일정(Schedule) API
- **기능**:
  - `getMonthSchedules(year, month)`: 월별 일정 조회

### `teamCalendar.js`
- **역할**: 팀 캘린더 API
- **기능**:
  - `getTeamCalendars(userId)`: 팀 캘린더 목록 조회
  - `createTeamCalendar(userId, name)`: 팀 캘린더 생성
  - `deleteTeamCalendar(userId, teamId)`: 팀 캘린더 삭제

---

## 🎨 전역 상태 관리 (`/context`)

### `AuthContext.jsx`
- **역할**: 사용자 인증 상태 관리
- **상태**:
  - `user`: 현재 로그인한 사용자 정보
- **기능**:
  - `fetchMe()`: `/api/auth/me`로 현재 사용자 정보 조회
  - `logout()`: 로그아웃 처리
  - 앱 시작 시 자동으로 사용자 정보 확인

### `PostContext.jsx`
- **역할**: 메모(Post) 전역 상태 관리
- **상태**:
  - `posts`: 메모 목록 배열
  - `selectedPostId`: 현재 선택된 메모 ID
  - `loading`: 로딩 상태
  - `hydrated`: 초기 데이터 로드 완료 여부
- **기능**:
  - `loadMemos()`: 서버에서 메모 목록 불러오기
  - `addPost(content, pinned)`: 새 메모 추가
  - `updatePost(id, updated)`: 메모 수정
  - `deletePost(id)`: 메모 삭제
  - `togglePinned(id)`: 메모 고정 토글
  - `resetPosts()`: 메모 상태 초기화
  - 로그인 상태 변경 시 자동으로 메모 목록 갱신

### `CalendarContext.jsx`
- **역할**: 캘린더 이벤트 전역 상태 관리
- **상태**:
  - `calendarEvents`: 캘린더별 이벤트 저장소
    - 구조: `{ personal: {...}, 'team-1': {...}, 'team-2': {...} }`
  - `currentDate`: 현재 선택된 날짜
  - `activeCalendarId`: 활성화된 캘린더 ID (null = 개인, 문자열 = 팀)
- **기능**:
  - `getCurrentEvents()`: 현재 활성 캘린더의 이벤트 반환
  - `getPersonalEvents()`: 개인 캘린더 이벤트 반환 (MiniCalendar용)
  - `addEvent(date, event)`: 일정 추가
  - `updateEvent(oldDate, eventId, updatedEvent)`: 일정 수정
  - `deleteEvent(date, eventId)`: 일정 삭제
  - `replaceRangeEvent()`: 범위 일정 교체
  - `deleteEventsByPostId(postId)`: 특정 메모와 연결된 모든 일정 삭제
  - `getScheduleColor(event)`: 일정 색상 계산 (메모/직접추가 구분)
  - `getEventColor(postId)`: postId 기반 색상 반환
  - `initializeTeamCalendar(teamId)`: 팀 캘린더 초기화
  - `removeTeamCalendar(teamId)`: 팀 캘린더 삭제
  - localStorage에 자동 저장/복원 (사용자별)
  - guest → user 마이그레이션 지원

### `SettingsContext.jsx`
- **역할**: 앱 설정 전역 상태 관리
- **상태**:
  - `theme`: 테마 (light/dark)
  - `fontSize`: 폰트 크기 (small/medium/large)
  - `language`: 언어 (ko/en)
  - `compactMode`: 컴팩트 모드 (true/false)
- **기능**:
  - `updateSetting(key, value)`: 단일 설정 변경
  - `updateSettings(newSettings)`: 여러 설정 일괄 변경
  - `resetSettings()`: 설정 초기화
  - localStorage에 자동 저장/복원
  - CSS 변수로 실시간 스타일 적용

### `TeamCalendarContext.jsx`
- **역할**: 팀 캘린더 목록 관리
- **상태**:
  - `teams`: 팀 목록 배열
- **기능**:
  - `addTeam(name)`: 팀 생성
  - `removeTeam(teamId)`: 팀 삭제
  - 서버와 동기화

---

## 🧩 컴포넌트 (`/components`)

### `TopBar.jsx`
- **역할**: 상단 네비게이션 바
- **기능**:
  - 햄버거 메뉴 버튼 (사이드바 토글)
  - 로고 클릭 시 홈으로 이동
  - 로그인 상태에 따른 UI:
    - 로그인 시: "My Page", 사용자명, "Logout" 버튼
    - 비로그인 시: "Login" 버튼
  - 클릭 애니메이션 (ripple effect)

### `Sidebar.jsx`
- **역할**: 왼쪽 메모 목록 사이드바
- **기능**:
  - 메모 검색 (한글 초성 검색 지원)
  - 메모 목록 표시 (고정된 메모 우선)
  - 메모 드래그 앤 드롭 (캘린더로 이동)
  - 메모 고정/해제 (별 버튼)
  - 메모 삭제
  - 새 메모 추가 버튼
  - 캘린더에 등록된 메모는 색상 표시

### `MainNote.jsx`
- **역할**: 중앙 메모 편집 영역
- **기능**:
  - 선택된 메모 내용 표시/편집
  - 메모 카드 시스템 (드래그 앤 드롭으로 메모 추가)
  - 카드 삭제 기능
  - AI 메모 기능 (준비 중)
  - localStorage에 카드 상태 저장/복원
  - guest → user 마이그레이션

### `CalendarPanel.jsx`
- **역할**: 오른쪽 캘린더 패널
- **기능**:
  - 개인 캘린더 섹션
  - MiniCalendar 컴포넌트 표시
  - 팀 캘린더 목록 표시
  - 팀 캘린더 생성 버튼
  - 팀 캘린더 삭제 버튼 (팀 캘린더 페이지에서만)
  - 활성 캘린더 하이라이트

### `calendars/CalendarGrid.jsx`
- **역할**: 큰 캘린더 그리드 (월별 뷰)
- **기능**:
  - 월별 캘린더 그리드 렌더링
  - 일정 표시 (메모 드래그/직접 추가)
  - 날짜 범위 선택 (드래그)
  - 일정 클릭 시 팝업 열기
  - 메모 드롭 처리
  - 범위 일정 연결 표시
  - 색상 계산 및 적용
  - 서버 일정 조회 (`getMonthSchedules`)

### `calendars/MiniCalendar.jsx`
- **역할**: 작은 미니 캘린더 (오른쪽 패널)
- **기능**:
  - 현재 월 캘린더 표시
  - 오늘 날짜 하이라이트 (파란 원)
  - 공휴일 표시
  - 일정이 있는 날짜에 색상 막대 표시
  - 날짜 클릭 시 큰 캘린더로 이동

### `calendars/CalendarHeader.jsx`
- **역할**: 캘린더 헤더 (월 네비게이션)
- **기능**:
  - 이전/다음 월 이동 버튼
  - 현재 년/월 표시

### `calendars/CalendarPopup.jsx`
- **역할**: 일정 추가/수정 팝업
- **기능**:
  - 일정 제목 입력
  - 일정 내용 입력
  - 날짜 범위 선택
  - 일정 저장/수정
  - 일정 삭제

---

## 📄 페이지 (`/pages`)

### `Login.jsx`
- **역할**: 로그인 페이지
- **기능**:
  - 아이디/비밀번호 입력
  - 로그인 API 호출
  - 에러 메시지 표시
  - 로그인 성공 시 홈으로 이동

### `Signup.jsx`
- **역할**: 회원가입 페이지
- **기능**:
  - 아이디, 비밀번호, 비밀번호 확인, 이메일, 이름 입력
  - 클라이언트 사이드 유효성 검사:
    - 비밀번호 일치 확인
    - 이메일 형식 검증
  - 회원가입 API 호출
  - 성공 시 로그인 페이지로 이동

### `MyPage.jsx`
- **역할**: 마이페이지
- **기능**:
  - **프로필 탭**:
    - 이름, 이메일 수정
    - 유효성 검사 및 저장
  - **설정 탭**:
    - 테마 변경 (라이트/다크)
    - 폰트 크기 조정
    - 언어 변경 (한국어/영어)
    - 컴팩트 모드 토글
    - 설정 초기화

### `CalendarPage.jsx`
- **역할**: 캘린더 페이지 (전체 화면)
- **기능**:
  - CalendarHeader, CalendarGrid, CalendarPopup 조합
  - 개인/팀 캘린더 전환
  - 날짜 클릭 시 팝업 열기
  - 날짜 범위 선택 처리
  - 일정 클릭 시 수정 팝업

---

## 🛠️ 유틸리티 (`/utils`)

### `calendar.js`
- **기능**:
  - `getMonthDays(year, month)`: 특정 년/월의 날짜 배열 생성
    - 빈 날짜(null) 포함하여 42개 배열 반환 (6주)
    - 첫 주의 빈 칸과 마지막 주의 빈 칸 포함

### `i18n.js`
- **기능**:
  - 다국어 지원 (한국어/영어)
  - `getTranslation(key, language)`: 번역 텍스트 반환
  - 설정에서 언어 변경 시 자동 적용

---

## 🛣️ 라우팅 (`/routes`)

### `ProtectedRoute.jsx`
- **역할**: 인증이 필요한 페이지 보호
- **기능**:
  - localStorage의 `accessToken` 확인
  - 토큰이 없으면 로그인 페이지로 리다이렉트

---

## 🎨 스타일 (`/styles`, `/componentsCss`)

### `styles/design-tokens.css`
- **역할**: 디자인 시스템 토큰 정의
- **내용**:
  - 색상 팔레트 (노션 스타일)
  - 간격 (spacing)
  - Border Radius
  - 그림자
  - 전환 효과
  - 폰트 크기/두께
  - 공통 버튼 스타일 (.btn, .btn-primary, .btn-secondary, .btn-danger)

### `componentsCss/*.css`
- 각 컴포넌트별 전용 CSS 파일
- 디자인 토큰을 활용한 일관된 스타일

---

## 🚀 진입점

### `main.jsx`
- **역할**: React 앱 진입점
- **기능**:
  - Context Provider 계층 구조 설정:
    1. SettingsProvider (최상위)
    2. AuthProvider
    3. PostProvider
    4. TeamCalendarProvider
    5. CalendarProvider
  - BrowserRouter 설정
  - StrictMode 활성화

### `App.jsx`
- **역할**: 메인 라우팅 컴포넌트
- **라우트**:
  - `/`: 메인 페이지 (Sidebar + MainNote + CalendarPanel)
  - `/login`: 로그인 페이지
  - `/signup`: 회원가입 페이지
  - `/mypage`: 마이페이지
  - `/calendar`: 개인 캘린더 페이지
  - `/calendar/team/:teamId`: 팀 캘린더 페이지
- **상태**:
  - `sidebarOpen`: 사이드바 열림/닫힘 상태

---

## 🔄 데이터 흐름

### 메모 시스템
1. **생성**: `PostContext.addPost()` → `api/memo.js.createMemo()` → 서버 저장
2. **조회**: 앱 시작 시 `PostContext.loadMemos()` → 서버에서 목록 가져오기
3. **수정**: `PostContext.updatePost()` → `api/memo.js.updateMemo()` → 서버 업데이트
4. **삭제**: `PostContext.deletePost()` → `api/memo.js.deleteMemo()` → 서버 삭제

### 캘린더 시스템
1. **메모 드래그**: `Sidebar`에서 드래그 → `CalendarGrid`에서 드롭 → `CalendarContext.addEvent()` → localStorage 저장
2. **직접 추가**: `CalendarPopup`에서 입력 → 서버 저장 → `CalendarGrid`에서 조회
3. **색상 계산**: `CalendarContext.getScheduleColor()` → postId 있으면 메모 색상, 없으면 고정 파란색

### 인증 시스템
1. **로그인**: `Login` 페이지 → `api/auth.js.login()` → `AuthContext.fetchMe()` → 사용자 정보 저장
2. **로그아웃**: `TopBar` → `AuthContext.logout()` → `api/auth.js.logout()` → 상태 초기화

---

## 📝 주요 특징

1. **로컬 스토리지 활용**: 메모 카드, 캘린더 이벤트, 설정 등 클라이언트 상태 저장
2. **Guest → User 마이그레이션**: 비로그인 상태에서 생성한 데이터를 로그인 시 자동 이전
3. **색상 시스템**: 메모별 고유 색상 할당 (postId 기반)
4. **다국어 지원**: 한국어/영어 전환
5. **다크 모드**: 테마 전환 지원
6. **반응형 디자인**: Notion 스타일의 일관된 UI

