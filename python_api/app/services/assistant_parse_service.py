import json
from datetime import datetime

from openai import OpenAI

from app.core.config import get_settings
from app.schemas.assistant import AssistantParseRequest, AssistantParseResponse


SYSTEM_PROMPT = (
    "You are an intent and datetime parser for a calendar assistant. "
    "Return only valid JSON with keys: "
    "intent, title, content, startAt, endAt, allDay, missingFields, needsCalendarSelection. "
    "intent must be one of CREATE_SCHEDULE, SUMMARY_SCHEDULE, GENERAL, CLARIFY. "
    "Ignore clock time even if user mentions it; this calendar assistant stores date-only schedules. "
    "For CREATE_SCHEDULE: if one date is provided, set startAt to 00:00:00 and endAt to 23:59:59 of that date. "
    "If two dates are provided, set an inclusive date range: first date 00:00:00 to second date 23:59:59. "
    "If date order is reversed, normalize so startAt <= endAt. "
    "Always set allDay true for CREATE_SCHEDULE. "
    "Use ISO local datetime format yyyy-MM-ddTHH:mm:ss for startAt/endAt."
)


class AssistantParseService:
    def __init__(self) -> None:
        settings = get_settings()
        self.settings = settings
        self.client: OpenAI | None = None
        if settings.openai_api_key:
            # OpenAI 키가 있을 때만 LLM 기반 파서를 활성화
            self.client = OpenAI(api_key=settings.openai_api_key)

    def parse(self, payload: AssistantParseRequest) -> AssistantParseResponse:
        if self.client is None:
            # 키가 없거나 비활성 환경에서는 규칙 기반 폴백 사용
            return self._fallback(payload.message)

        conversation_lines = []
        for item in payload.conversation[-8:]:
            conversation_lines.append(f"{item.role}: {item.content}")
        conversation_text = "\n".join(conversation_lines)
        now = payload.now or datetime.now().isoformat()

        prompt = (
            f"[timezone]\n{payload.timezone}\n\n"
            f"[now]\n{now}\n\n"
            f"[conversation]\n{conversation_text}\n\n"
            f"[latest_user_message]\n{payload.message}\n"
        )

        try:
            # 모델 출력은 JSON 고정 계약으로 받아 Java 오케스트레이터가 그대로 사용
            response = self.client.responses.create(
                model=self.settings.openai_model,
                input=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                timeout=self.settings.openai_timeout_seconds,
            )
            text = getattr(response, "output_text", "") or ""
            parsed = json.loads(self._strip_code_fence(text))
            return AssistantParseResponse.model_validate(parsed)
        except Exception:
            # 모델 오류/파싱 오류는 사용자 기능 중단 없이 폴백 처리
            return self._fallback(payload.message)

    def _fallback(self, message: str) -> AssistantParseResponse:
        # 최소 보장 분류기: 등록/요약 키워드만 빠르게 분기
        lower = message.lower()
        intent = "GENERAL"
        if "요약" in message or "summary" in lower:
            intent = "SUMMARY_SCHEDULE"
        if any(token in message for token in ["일정", "등록", "추가"]) or "schedule" in lower:
            intent = "CREATE_SCHEDULE"
        return AssistantParseResponse(
            intent=intent,
            title=None,
            content=None,
            start_at=None,
            end_at=None,
            all_day=True,
            missing_fields=["startAt"] if intent == "CREATE_SCHEDULE" else [],
            needs_calendar_selection=True,
        )

    def _strip_code_fence(self, text: str) -> str:
        value = text.strip()
        if value.startswith("```"):
            lines = value.splitlines()
            if len(lines) >= 3:
                return "\n".join(lines[1:-1]).strip()
        return value
