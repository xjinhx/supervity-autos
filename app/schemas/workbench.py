# app/schemas/workbench.py
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class WorkbenchResolutionOut(BaseModel):
    resolution_id: UUID
    item_type: str
    employee_id: str | None = None
    form_url: str | None = None
    decision: str
    reviewer_notes: str | None = None
    resolved_by: str | None = None
    resolved_at: datetime
    raw_payload: dict | None = None

    class Config:
        from_attributes = True
