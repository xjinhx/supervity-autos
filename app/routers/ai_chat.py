# app/routers/ai_chat.py
"""AI Manager — grounded chat over the Command Center, backed by Claude tool use."""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..schemas.ai_chat import AIChatRequest, AIChatResponse
from ..services.ai_chat import run_chat

log = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Manager"])


@router.post("/chat", response_model=AIChatResponse)
def chat(payload: AIChatRequest, db: Session = Depends(get_db)):
    history = [{"role": m.role, "content": m.content} for m in payload.history]
    text, tool_calls = run_chat(payload.message, history, payload.context, db)
    return AIChatResponse(response=text, tool_calls=tool_calls)
