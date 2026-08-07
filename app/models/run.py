# app/models/run.py
import uuid

from sqlalchemy import Column, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from ..core.database import Base


class OrchestratorRun(Base):
    """One row per Orchestrator batch pass (live Auto webhook or local simulation)."""

    __tablename__ = "orchestrator_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trigger = Column(String(50), nullable=False, default="manual")  # manual | auto_webhook | scheduled
    status = Column(String(20), nullable=False, default="completed")
    hires_processed = Column(Integer, nullable=False, default=0)
    policies_fired = Column(Integer, nullable=False, default=0)
    escalations_created = Column(Integer, nullable=False, default=0)
    summary = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    finished_at = Column(DateTime(timezone=True), nullable=True)
