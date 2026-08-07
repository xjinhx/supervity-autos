# app/models/insight.py
import uuid

from sqlalchemy import Column, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID

from ..core.database import Base


class Insight(Base):
    """A computed observation surfaced from real policy_evaluations / workbench_items data."""

    __tablename__ = "insights"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    insight_type = Column(String(30), nullable=False)  # pattern | anomaly | recommendation
    severity = Column(String(20), nullable=False, default="info")  # critical | warning | info
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    supporting_data = Column(JSONB, nullable=True)
    action_path = Column(Text, nullable=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
