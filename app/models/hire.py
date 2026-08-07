# app/models/hire.py
import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID

from ..core.database import Base


class Hire(Base):
    """A new hire in the 90-day onboarding cohort this Command Center tracks."""

    __tablename__ = "hires"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    location = Column(String(100), nullable=True)
    job_family = Column(String(100), nullable=True)
    manager = Column(String(100), nullable=True)
    cohort = Column(String(50), nullable=True)
    start_date = Column(Date, nullable=False)
    day90_date = Column(Date, nullable=False)

    tasks_total = Column(Integer, nullable=False, default=0)
    tasks_completed = Column(Integer, nullable=False, default=0)
    overdue_task_count = Column(Integer, nullable=False, default=0)
    days_until_work_auth_expiry = Column(Integer, nullable=True)
    disclosure_found = Column(Boolean, nullable=False, default=False)
    days_since_last_notification = Column(Integer, nullable=True)
    learning_milestone_overdue_days = Column(Integer, nullable=False, default=0)

    # on_track | at_risk | escalated
    risk_state = Column(String(20), nullable=False, default="on_track")
    retained = Column(Boolean, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
