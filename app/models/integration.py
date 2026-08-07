# app/models/integration.py
import uuid

from sqlalchemy import Column, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from ..core.database import Base


class IntegrationHealth(Base):
    """Registry of external systems the Command Center depends on, with real health status."""

    __tablename__ = "integration_health"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    system_name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)  # system_of_record | channel | ai_model | orchestrator
    used_for = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="unknown")  # healthy | degraded | down | unknown
    detail = Column(Text, nullable=True)
    last_checked = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
