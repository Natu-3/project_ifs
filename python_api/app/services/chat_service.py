from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppError
from app.db.models import ChatMessage, ChatSession
from app.schemas.chat import ChatRequest
from app.services.openai_client import OpenAIChatClient


SYSTEM_PROMPT = (
    "You are a chatbot assistant for a scheduling and memo app. "
    "Prefer concise and accurate responses, and avoid unsupported claims."
)


class ChatService:
    def __init__(self, db: Session) -> None:
        # 서비스 인스턴스 단위로 DB 세션/설정/OpenAI 클라이언트를 묶어 사용한다.
        self.db = db
        self.settings = get_settings()
        self.openai: OpenAIChatClient | None = None

    def create_session(self, user_id: int, title: str | None = None) -> ChatSession:
        # 새 세션 생성 시 만료시각(expires_at)을 함께 기록한다.
        now = datetime.now(timezone.utc)
        session = ChatSession(
            user_id=user_id,
            title=(title or "New Chat").strip()[:255] or "New Chat",
            expires_at=now + timedelta(days=self.settings.chat_retention_days),
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def list_sessions(self, user_id: int, limit: int, offset: int) -> list[ChatSession]:
        stmt = (
            select(ChatSession)
            .where(ChatSession.user_id == user_id)
            .order_by(ChatSession.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(self.db.scalars(stmt).all())

    def get_messages(self, user_id: int, session_id: str, limit: int) -> list[ChatMessage]:
        session = self._get_owned_session(user_id, session_id)
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.created_at.asc())
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def chat(self, user_id: int, request: ChatRequest) -> tuple[ChatSession, ChatMessage]:
        # 입력 길이를 먼저 차단해 불필요한 DB/LLM 호출을 막는다.
        if len(request.message) > self.settings.max_message_length:
            raise AppError(
                status_code=400,
                code="MESSAGE_TOO_LONG",
                message=f"Message exceeds max length ({self.settings.max_message_length}).",
            )

        session = self._prepare_session(user_id, request)

        # 사용자 발화를 먼저 저장한 뒤, 최근 대화 문맥과 함께 모델에 전달한다.
        user_message = ChatMessage(session_id=session.id, role="user", content=request.message)
        self.db.add(user_message)
        self.db.flush()

        recent_stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.created_at.desc())
            .limit(self.settings.max_history_messages)
        )
        recent_messages = list(reversed(self.db.scalars(recent_stmt).all()))
        model_input = [{"role": "system", "content": SYSTEM_PROMPT}]
        model_input.extend({"role": item.role, "content": item.content} for item in recent_messages)

        # 모델 응답과 토큰 사용량을 저장해 추후 분석/관측에 활용한다.
        if self.openai is None:
            self.openai = OpenAIChatClient()
        answer, token_in, token_out = self.openai.complete(model_input)
        assistant_message = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=answer,
            token_in=token_in,
            token_out=token_out,
        )
        self.db.add(assistant_message)

        session.updated_at = datetime.now(timezone.utc)
        session.expires_at = datetime.now(timezone.utc) + timedelta(days=self.settings.chat_retention_days)
        # 기본 제목 상태라면 첫 사용자 메시지로 제목을 자동 생성한다.
        if session.title == "New Chat":
            session.title = request.message[:30].strip() or "New Chat"

        self.db.commit()
        self.db.refresh(session)
        self.db.refresh(assistant_message)
        return session, assistant_message

    def cleanup_expired(self) -> int:
        # 보관기간이 지난 세션을 일괄 삭제한다(메시지는 FK cascade로 함께 삭제).
        now = datetime.now(timezone.utc)
        result = self.db.execute(delete(ChatSession).where(ChatSession.expires_at < now))
        self.db.commit()
        return result.rowcount or 0

    def _prepare_session(self, user_id: int, request: ChatRequest) -> ChatSession:
        # session_id가 있으면 기존 세션을, 없으면 새 세션을 생성한다.
        if request.session_id:
            return self._get_owned_session(user_id, request.session_id)
        return self.create_session(user_id=user_id, title=None)

    def _get_owned_session(self, user_id: int, session_id: str) -> ChatSession:
        # 사용자 소유 세션만 조회해 타인 세션 접근을 방지한다.
        stmt = select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user_id)
        session = self.db.scalar(stmt)
        if not session:
            raise AppError(status_code=404, code="SESSION_NOT_FOUND", message="Chat session not found.")
        return session
