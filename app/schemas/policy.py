# app/schemas/policy.py
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class PolicyField(BaseModel):
    key: str
    label: str
    value: str | None = None


class PolicyOut(BaseModel):
    name: str
    description: str
    fields: list[PolicyField]


class PolicyFieldUpdate(BaseModel):
    value: str


class PolicyEvaluationOut(BaseModel):
    evaluation_id: UUID
    run_id: str | None = None
    employee_id: str
    policy_name: str
    threshold_used: str | None = None
    actual_value: str | None = None
    passed: bool
    contributed_to_escalation: bool
    evaluated_at: datetime

    class Config:
        from_attributes = True
