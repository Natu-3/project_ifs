from pydantic import BaseModel, Field


class AssistantConversationMessage(BaseModel):
    role: str
    content: str


class AssistantParseRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation: list[AssistantConversationMessage] = Field(default_factory=list)
    timezone: str = "Asia/Seoul"
    now: str | None = None


class AssistantParseResponse(BaseModel):
    intent: str
    title: str | None = None
    content: str | None = None
    start_at: str | None = Field(default=None, alias="startAt")
    end_at: str | None = Field(default=None, alias="endAt")
    all_day: bool = Field(default=True, alias="allDay")
    missing_fields: list[str] = Field(default_factory=list, alias="missingFields")
    needs_calendar_selection: bool = Field(default=True, alias="needsCalendarSelection")
