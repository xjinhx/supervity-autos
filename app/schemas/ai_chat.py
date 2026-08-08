# app/schemas/ai_chat.py
from pydantic import BaseModel


class AIChatMessage(BaseModel):
    role: str
    content: str


class AIChatRequest(BaseModel):
    message: str
    history: list[AIChatMessage] = []
    context: dict = {}


class AIChatToolCall(BaseModel):
    id: str
    name: str
    args: dict
    result: str | None = None


class AIChatResponse(BaseModel):
    response: str
    tool_calls: list[AIChatToolCall] = []
