# app/schemas/integration.py
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class IntegrationHealth(BaseModel):
    id: UUID
    system_name: str
    category: str
    used_for: str | None = None
    status: str
    detail: str | None = None
    last_checked: datetime

    class Config:
        from_attributes = True
