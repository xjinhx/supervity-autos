# app/routers/dashboard.py
"""Dashboard aggregates — real numbers computed from hires / policies / workbench data."""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models.hire import Hire
from ..models.policy import Policy, PolicyEvaluation
from ..models.run import OrchestratorRun
from ..models.workbench import WorkbenchItem
from ..schemas.dashboard import ActivityPoint, DashboardActivity, DashboardSummary

log = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary(db: Session = Depends(get_db)):
    total_hires = db.query(func.count(Hire.id)).scalar() or 0
    on_track = db.query(func.count(Hire.id)).filter(Hire.risk_state == "on_track").scalar() or 0
    at_risk = db.query(func.count(Hire.id)).filter(Hire.risk_state == "at_risk").scalar() or 0
    escalated = db.query(func.count(Hire.id)).filter(Hire.risk_state == "escalated").scalar() or 0

    tasks_total = db.query(func.coalesce(func.sum(Hire.tasks_total), 0)).scalar() or 0
    tasks_completed = db.query(func.coalesce(func.sum(Hire.tasks_completed), 0)).scalar() or 0
    completion_pct = round((tasks_completed / tasks_total) * 100, 1) if tasks_total else 0.0

    day90_due = db.query(Hire).filter(Hire.day90_date <= datetime.now(timezone.utc).date()).all()
    if day90_due:
        retained_count = sum(1 for h in day90_due if h.retained)
        retention_rate = round((retained_count / len(day90_due)) * 100, 1)
    else:
        retention_rate = 100.0

    open_items = db.query(func.count(WorkbenchItem.id)).filter(WorkbenchItem.status == "pending").scalar() or 0
    active_policies = db.query(func.count(Policy.id)).filter(Policy.active.is_(True)).scalar() or 0
    total_runs = db.query(func.count(OrchestratorRun.id)).scalar() or 0
    last_run = db.query(func.max(OrchestratorRun.started_at)).scalar()

    return DashboardSummary(
        total_hires=total_hires,
        on_track_count=on_track,
        at_risk_count=at_risk,
        escalated_count=escalated,
        tasks_completion_pct=completion_pct,
        day90_retention_rate=retention_rate,
        open_workbench_items=open_items,
        active_policies=active_policies,
        total_runs=total_runs,
        last_run_at=last_run,
    )


@router.get("/activity", response_model=DashboardActivity)
def get_activity(days: int = 14, db: Session = Depends(get_db)):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Bucket in Python rather than SQL to stay dialect-agnostic (SQLite in tests, Postgres in prod).
    eval_counts: dict[str, int] = {}
    fired_counts: dict[str, int] = {}
    for pe in db.query(PolicyEvaluation).filter(PolicyEvaluation.evaluated_at >= since).all():
        key = pe.evaluated_at.date().isoformat()
        eval_counts[key] = eval_counts.get(key, 0) + 1
        if pe.fired:
            fired_counts[key] = fired_counts.get(key, 0) + 1

    escalation_counts: dict[str, int] = {}
    for item in db.query(WorkbenchItem).filter(WorkbenchItem.created_at >= since).all():
        key = item.created_at.date().isoformat()
        escalation_counts[key] = escalation_counts.get(key, 0) + 1

    all_days = sorted(set(eval_counts) | set(escalation_counts))
    points = [
        ActivityPoint(
            bucket=day,
            evaluations=eval_counts.get(day, 0),
            fired=fired_counts.get(day, 0),
            escalations=escalation_counts.get(day, 0),
        )
        for day in all_days
    ]

    return DashboardActivity(points=points)
