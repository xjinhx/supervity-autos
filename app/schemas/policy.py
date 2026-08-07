# app/schemas/policy.py
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class PolicyConfig(BaseModel):
    metric: str
    operator: str  # > | < | >= | <= | == | !=
    value: Any
    action: str = "escalate"  # escalate | notify | suppress
    route: str | None = None  # e.g. "#hr-disclosures"


class PolicyBase(BaseModel):
    name: str
    description: str | None = None
    policy_type: str = "threshold"
    config: dict
    active: bool = True


class PolicyCreate(PolicyBase):
    locked: bool = False


class PolicyUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    config: dict | None = None
    active: bool | None = None


class Policy(PolicyBase):
    id: UUID
    locked: bool
    flagged_for_review: bool
    created_at: datetime
    updated_at: datetime
    execution_count: int = 0
    fired_count: int = 0
    last_evaluated_at: datetime | None = None

    class Config:
        from_attributes = True


class PolicyEvaluationOut(BaseModel):
    id: UUID
    policy_id: UUID
    run_id: UUID | None = None
    employee_id: str
    input_value: dict | None = None
    fired: bool
    action_taken: str | None = None
    evaluated_at: datetime

    class Config:
        from_attributes = True


class EvaluateRequest(BaseModel):
    """What an Auto Operator (or the local simulator) posts per hire, per run."""

    employee_id: str
    run_id: UUID | None = None
    metrics: dict[str, Any] | None = None  # override/augment hire metrics for this evaluation


class EvaluateResultItem(BaseModel):
    policy_id: UUID
    policy_name: str
    fired: bool
    action_taken: str | None = None
    route: str | None = None


class EvaluateResponse(BaseModel):
    employee_id: str
    run_id: UUID | None = None
    results: list[EvaluateResultItem]
    risk_state: str
    workbench_item_ids: list[UUID] = []
