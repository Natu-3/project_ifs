import httpx
from fastapi import Request
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.errors import AppError


class AuthUser(BaseModel):
    id: int
    userid: str
    auth: str | None = None
    name: str | None = None
    email: str | None = None


def resolve_current_user(request: Request) -> AuthUser:
    # 전달받은 Cookie 헤더를 그대로 Spring /api/auth/me에 전달해 인증을 위임한다.
    settings = get_settings()
    cookie_header = request.headers.get("cookie")
    if not cookie_header:
        raise AppError(status_code=401, code="UNAUTHORIZED", message="Authentication required.")

    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.get(
                f"{settings.backend_base_url}/api/auth/me",
                headers={"cookie": cookie_header},
            )
    except httpx.HTTPError:
        raise AppError(status_code=503, code="AUTH_SERVICE_UNAVAILABLE", message="Auth service unavailable.")

    if response.status_code == 401:
        raise AppError(status_code=401, code="UNAUTHORIZED", message="Session expired.")
    if response.status_code >= 400:
        raise AppError(status_code=503, code="AUTH_SERVICE_ERROR", message="Auth validation failed.")

    # 백엔드 응답을 타입 객체로 변환해 이후 서비스에서 일관되게 사용한다.
    payload = response.json()
    return AuthUser(
        id=payload["id"],
        userid=payload["userid"],
        auth=payload.get("auth"),
        name=payload.get("name"),
        email=payload.get("email"),
    )
