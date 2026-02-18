import logging

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.rate_limit import InMemoryRateLimiter
from app.db.session import get_db
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    HealthResponse,
    MessageResponse,
    SessionCreateRequest,
    SessionResponse,
)
from app.services.auth_client import AuthUser, resolve_current_user
from app.services.chat_service import ChatService


router = APIRouter(prefix="/chat-api/v1", tags=["chat"])
logger = logging.getLogger(__name__)
rate_limiter = InMemoryRateLimiter()


def get_current_user(request: Request) -> AuthUser:
    # 요청 쿠키를 전달해 Spring 세션 인증 결과를 사용자 정보로 변환한다.
    return resolve_current_user(request)


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    # 컨테이너/로드밸런서 헬스체크 용도.
    settings = get_settings()
    return HealthResponse(status="ok", app=settings.app_name)


@router.post("/sessions", response_model=SessionResponse)
def create_session(
    payload: SessionCreateRequest,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionResponse:
    session = ChatService(db).create_session(user_id=user.id, title=payload.title)
    return SessionResponse.model_validate(session, from_attributes=True)


@router.get("/sessions", response_model=list[SessionResponse])
def list_sessions(
    limit: int = 20,
    offset: int = 0,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SessionResponse]:
    # 과도한 조회를 막기 위해 limit/offset 범위를 강제한다.
    limit = min(max(limit, 1), 100)
    offset = max(offset, 0)
    sessions = ChatService(db).list_sessions(user_id=user.id, limit=limit, offset=offset)
    return [SessionResponse.model_validate(item, from_attributes=True) for item in sessions]


@router.get("/sessions/{session_id}/messages", response_model=list[MessageResponse])
def get_messages(
    session_id: str,
    limit: int = 100,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MessageResponse]:
    # 메시지 조회량 상한을 둬 과도한 페이로드를 방지한다.
    limit = min(max(limit, 1), 200)
    messages = ChatService(db).get_messages(user_id=user.id, session_id=session_id, limit=limit)
    return [MessageResponse.model_validate(item, from_attributes=True) for item in messages]


@router.post("/chat", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    request: Request,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatResponse:
    settings = get_settings()
    # 사용자 단위 분당 요청 수를 제한해 남용을 방지한다.
    if not rate_limiter.allow(user.id, settings.rate_limit_per_minute):
        raise AppError(status_code=429, code="RATE_LIMIT_EXCEEDED", message="Rate limit exceeded.")

    session, assistant_message = ChatService(db).chat(user_id=user.id, request=payload)
    logger.info(
        "chat completed",
        extra={
            "trace_id": getattr(request.state, "trace_id", None),
            "token_in": assistant_message.token_in,
            "token_out": assistant_message.token_out,
        },
    )
    return ChatResponse(
        session_id=session.id,
        assistant_message_id=assistant_message.id,
        answer=assistant_message.content,
        token_in=assistant_message.token_in,
        token_out=assistant_message.token_out,
        model=settings.openai_model,
    )
