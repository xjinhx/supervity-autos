# app/schemas/workbench.py
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class WorkbenchItem(BaseModel):
    id: UUID
    employee_id: str
    item_type: str
    policy_id: UUID | None = None
    context: dict
    ai_recommendation: str | None = None
    status: str
    resolution_notes: str | None = None
    resolved_by: str | None = None
    resolved_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class WorkbenchResolveRequest(BaseModel):
    action: str  # approve | reject | modify
    notes: str | None = None
    resolved_by: str = "operator"
    corrected_action: str | None = None  # required context when action == "modify"
