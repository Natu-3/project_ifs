import time

from openai import APIError, APITimeoutError, OpenAI, RateLimitError

from app.core.config import get_settings
from app.core.errors import AppError


class OpenAIChatClient:
    def __init__(self) -> None:
        settings = get_settings()
        # 키 누락 시 서버 시작 직후 명확하게 실패하도록 강제한다.
        if not settings.openai_api_key:
            raise AppError(status_code=500, code="MISSING_OPENAI_KEY", message="OPENAI_API_KEY is not configured.")
        self.settings = settings
        self.client = OpenAI(api_key=settings.openai_api_key)

    def complete(self, messages: list[dict[str, str]]) -> tuple[str, int | None, int | None]:
        # timeout/rate-limit/5xx 계열 오류에 대해 제한된 횟수만 재시도한다.
        attempts = self.settings.openai_max_retries + 1
        last_error: Exception | None = None

        for idx in range(attempts):
            try:
                response = self.client.responses.create(
                    model=self.settings.openai_model,
                    input=messages,
                    timeout=self.settings.openai_timeout_seconds,
                )
                text = self._extract_output_text(response)
                if not text:
                    raise AppError(status_code=502, code="OPENAI_EMPTY_RESPONSE", message="Model returned an empty response.")

                usage = getattr(response, "usage", None)
                # 토큰 사용량은 응답 객체에 없을 수 있어 안전하게 추출한다.
                token_in = getattr(usage, "input_tokens", None) if usage else None
                token_out = getattr(usage, "output_tokens", None) if usage else None
                return text, token_in, token_out
            except (RateLimitError, APITimeoutError, APIError) as exc:
                last_error = exc
                is_retryable = isinstance(exc, (RateLimitError, APITimeoutError))
                if isinstance(exc, APIError) and (exc.status_code is None or exc.status_code >= 500):
                    is_retryable = True

                if idx + 1 < attempts and is_retryable:
                    time.sleep(0.5 * (idx + 1))
                    continue
                break

        if isinstance(last_error, RateLimitError):
            raise AppError(status_code=429, code="OPENAI_RATE_LIMITED", message="Rate limited by OpenAI. Try again later.")
        raise AppError(status_code=502, code="OPENAI_ERROR", message="Failed to generate assistant response.")

    @staticmethod
    def _extract_output_text(response: object) -> str:
        # SDK 버전에 따라 output_text 또는 output[].content[] 경로를 모두 지원한다.
        direct = getattr(response, "output_text", None)
        if isinstance(direct, str) and direct.strip():
            return direct.strip()

        parts: list[str] = []
        for item in getattr(response, "output", []) or []:
            for content in getattr(item, "content", []) or []:
                text = getattr(content, "text", None)
                if isinstance(text, str) and text.strip():
                    parts.append(text.strip())
        return "\n".join(parts).strip()
