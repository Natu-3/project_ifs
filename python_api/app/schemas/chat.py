from datetime import datetime

from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    code: str
    message: str
    trace_id: str


class SessionCreateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=255)


class SessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    token_in: int | None = None
    token_out: int | None = None
    created_at: datetime


class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str = Field(min_length=1, max_length=4000)


class ChatResponse(BaseModel):
    session_id: str
    assistant_message_id: int
    answer: str
    token_in: int | None = None
    token_out: int | None = None
    model: str


class HealthResponse(BaseModel):
    status: str
    app: str

