# app/models/workbench.py
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from ..core.database import Base


class WorkbenchItem(Base):
    """An exception routed from the Orchestrator to a human for review."""

    __tablename__ = "workbench_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(String(50), nullable=False, index=True)
    item_type = Column(String(50), nullable=False)  # at_risk_escalation | disclosure | validation_failure
    policy_id = Column(UUID(as_uuid=True), ForeignKey("policies.id", ondelete="SET NULL"), nullable=True)
    context = Column(JSONB, nullable=False)
    ai_recommendation = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="pending", index=True)  # pending | approved | rejected | modified
    resolution_notes = Column(Text, nullable=True)
    resolved_by = Column(String(255), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class WorkbenchCorrection(Base):
    """Records a human 'modify' decision so the system can learn from repeated overrides."""

    __tablename__ = "workbench_corrections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workbench_item_id = Column(UUID(as_uuid=True), ForeignKey("workbench_items.id", ondelete="CASCADE"), nullable=False)
    policy_id = Column(UUID(as_uuid=True), ForeignKey("policies.id", ondelete="SET NULL"), nullable=True)
    original_recommendation = Column(Text, nullable=True)
    corrected_action = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
