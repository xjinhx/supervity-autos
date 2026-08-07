# app/schemas/hire.py
from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class Hire(BaseModel):
    id: UUID
    employee_id: str
    full_name: str
    location: str | None = None
    job_family: str | None = None
    manager: str | None = None
    cohort: str | None = None
    start_date: date
    day90_date: date
    tasks_total: int
    tasks_completed: int
    overdue_task_count: int
    days_until_work_auth_expiry: int | None = None
    disclosure_found: bool
    days_since_last_notification: int | None = None
    learning_milestone_overdue_days: int
    risk_state: str
    retained: bool | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
