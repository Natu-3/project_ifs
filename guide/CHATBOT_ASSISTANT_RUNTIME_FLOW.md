# 챗봇 Assistant 가동 흐름

이 문서는 현재 구현된 챗봇(일정 등록/요약 + 일반 질의) 런타임 흐름을 정리한다.

## 1. 엔드포인트 진입
- 프론트: `reactwork/src/pages/ChatbotPage.jsx`
- 호출 API: `POST /api/chat/assistant`
- 컨트롤러: `backwork/src/main/java/com/example/backwork/rag/ChatRagController.java`

요청 본문:
- `message`: 사용자 최신 발화
- `conversation`: 최근 대화 히스토리
- `activeCalendar`: 현재 UI 활성 캘린더 (`PERSONAL` 또는 `TEAM`)
- `timezone`: 기본 `Asia/Seoul`

## 2. Java 오케스트레이션
- 서비스: `backwork/src/main/java/com/example/backwork/assistant/AssistantChatService.java`

처리 순서:
1. 입력 검증
2. 캘린더 후보 목록 조회
   - `CalendarService.getAssistantCalendarOptions(userId)`
3. Python 내부 파서 호출
   - `PythonAssistantClient.parse(...)`
   - 내부 API: `POST /internal/assistant/parse`
4. 의도별 분기
   - `CREATE_SCHEDULE`
   - `SUMMARY_SCHEDULE`
   - `GENERAL` (RAG 폴백)

## 3. Python 파서
- 라우트: `python_api/app/api/routes.py`
- 서비스: `python_api/app/services/assistant_parse_service.py`

동작:
1. OpenAI 사용 가능 시 LLM으로 JSON 파싱
2. 실패/비활성 시 키워드 기반 폴백 파싱
3. 반환 계약(JSON):
   - `intent`
   - `title`, `content`
   - `startAt`, `endAt`, `allDay`
   - `missingFields`
   - `needsCalendarSelection`

## 4. 일정 등록 플로우
조건: `intent=CREATE_SCHEDULE`

1. 사용자 발화에서 캘린더 명시 여부 검사
2. 미선택 시 `NEEDS_CALENDAR_SELECTION` 반환
   - `calendarOptions` 포함
3. 캘린더 선택 후 날짜/시간 파싱 확인
4. 시간 미지정(`allDay=true`)이면 종일 일정으로 변환
   - `00:00:00 ~ 23:59:59`
5. 저장
   - 개인: `ScheduleService.createFromAssistant(...)`
   - 팀: `TeamScheduleService.createFromAssistant(...)`
6. `COMPLETED` 응답 + `createdSchedule` 포함

## 5. 일정 요약 플로우
조건: `intent=SUMMARY_SCHEDULE`

1. 요약 대상 캘린더 결정
   - 메시지 명시 > 활성 캘린더 > 개인 캘린더
2. 기간 결정
   - 명시 기간 우선
   - 미지정 시 현재 월(타임존 기준)
3. 조회
   - 개인: `ScheduleService.findByRange(...)`
   - 팀: `TeamScheduleService.findByRange(...)`
4. 일자별 텍스트 요약 생성 후 응답

## 6. 일반 질의(RAG) 플로우
조건: `intent=GENERAL` 또는 기타

1. 대상 캘린더 결정
2. `RagDocumentService.query(...)` 호출
   - `documentIds`는 빈 리스트 전달
   - 서버가 접근 가능한 문서를 자동 대상으로 사용
3. 응답 실패 시 사용자 친화 오류 메시지 반환

## 7. 프론트 표시 동작
- `calendarOptions`가 오면 quick reply 버튼 렌더링
- 버튼 클릭 시 해당 텍스트를 새 사용자 발화로 재전송
- 기존 RAG 입력 UI(`Calendar ID`, `Document IDs`, 업로드/인덱싱)는 제거됨

## 8. 보안/운영 포인트
- Python 내부 API는 `X-Internal-Token` 필수
- 세션 미인증 요청은 Java 컨트롤러에서 `401` 처리
- 파서 장애 시 Java/Python 양쪽에 폴백이 있어 기능이 완전 중단되지 않음
