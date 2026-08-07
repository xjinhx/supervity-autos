# app/models/policy.py
import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from ..core.database import Base


class Policy(Base):
    """A business rule that constrains Orchestrator behavior at runtime.

    config shape (threshold/rule types): {"metric": str, "operator": str, "value": Any, "action": str, "route": str|None}
    config shape (natural_language type): {"instruction": str, "action": str}
    """

    __tablename__ = "policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    policy_type = Column(String(30), nullable=False, default="threshold")  # threshold | rule | natural_language
    config = Column(JSONB, nullable=False)
    active = Column(Boolean, nullable=False, default=True)
    locked = Column(Boolean, nullable=False, default=False)  # hard compliance rule — not editable in UI
    flagged_for_review = Column(Boolean, nullable=False, default=False)  # bonus self-learning signal
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class PolicyEvaluation(Base):
    """Audit trail row for a single policy check against a single hire."""

    __tablename__ = "policy_evaluations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_id = Column(UUID(as_uuid=True), ForeignKey("policies.id", ondelete="CASCADE"), nullable=False, index=True)
    run_id = Column(UUID(as_uuid=True), ForeignKey("orchestrator_runs.id", ondelete="SET NULL"), nullable=True)
    employee_id = Column(String(50), nullable=False, index=True)
    input_value = Column(JSONB, nullable=True)
    fired = Column(Boolean, nullable=False, default=False)
    action_taken = Column(String(50), nullable=True)  # escalate | notify | suppress | none
    evaluated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
