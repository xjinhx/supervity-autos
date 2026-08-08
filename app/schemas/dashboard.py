# app/schemas/dashboard.py
from datetime import datetime

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_hires: int
    on_track_count: int
    at_risk_count: int
    tasks_completion_pct: float
    recent_workbench_resolutions: int
    active_policies: int
    last_run_at: datetime | None = None


class ActivityPoint(BaseModel):
    bucket: str  # ISO date label
    evaluations: int
    fired: int
    escalations: int


class DashboardActivity(BaseModel):
    points: list[ActivityPoint]
