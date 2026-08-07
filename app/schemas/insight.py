# app/schemas/insight.py
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class Insight(BaseModel):
    id: UUID
    insight_type: str
    severity: str
    title: str
    description: str
    supporting_data: dict | None = None
    action_path: str | None = None
    generated_at: datetime

    class Config:
        from_attributes = True
