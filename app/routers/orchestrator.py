# app/routers/orchestrator.py
"""
Orchestrator run endpoints.

In production, auto.supervity.ai's Orchestrator calls POST /api/policies/evaluate
directly (once per hire, per run) via an HTTP action step in your Operators —
that is the real live wiring described in the PRD.

POST /api/orchestrator/simulate-run exists so the full loop (new signal ->
policy evaluation -> workbench escalation -> dashboard/insights update) can be
demonstrated live without depending on Auto being reachable during the demo.
It advances each hire's onboarding state slightly (tasks complete, deadlines
approach, etc.) and then runs the exact same evaluate_employee() function Auto
would trigger — so "Run Orchestrator" in the UI exercises real code paths.
"""

import logging
import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models.hire import Hire
from ..models.run import OrchestratorRun
from ..schemas.hire import Hire as HireSchema
from ..services.policy_engine import evaluate_employee

log = logging.getLogger(__name__)

router = APIRouter(prefix="/orchestrator", tags=["Orchestrator"])


def _advance_hire_state(hire: Hire) -> None:
    """Simulates one onboarding tick of real-world signal drift for a hire."""
    if hire.tasks_completed < hire.tasks_total and random.random() < 0.55:
        hire.tasks_completed += 1
        if hire.overdue_task_count > 0 and random.random() < 0.5:
            hire.overdue_task_count -= 1
    elif random.random() < 0.2:
        hire.overdue_task_count += 1

    if hire.days_until_work_auth_expiry is not None:
        hire.days_until_work_auth_expiry = max(0, hire.days_until_work_auth_expiry - random.choice([0, 1, 1]))

    if hire.days_since_last_notification is not None:
        hire.days_since_last_notification += 1

    if hire.learning_milestone_overdue_days > 0 and random.random() < 0.4:
        hire.learning_milestone_overdue_days = max(0, hire.learning_milestone_overdue_days - 1)
    elif random.random() < 0.08:
        hire.learning_milestone_overdue_days += 1

    # Disclosures are rare, real events — do not manufacture new ones on every tick.


@router.post("/simulate-run")
def simulate_run(db: Session = Depends(get_db)):
    run = OrchestratorRun(trigger="manual", status="running")
    db.add(run)
    db.commit()
    db.refresh(run)

    hires = db.query(Hire).all()
    policies_fired = 0
    escalations_created = 0

    for hire in hires:
        _advance_hire_state(hire)
        db.add(hire)
        db.commit()
        db.refresh(hire)

        result = evaluate_employee(db, hire, run_id=run.id)
        policies_fired += sum(1 for r in result["results"] if r["fired"])
        escalations_created += len(result["workbench_item_ids"])

    run.status = "completed"
    run.hires_processed = len(hires)
    run.policies_fired = policies_fired
    run.escalations_created = escalations_created
    run.finished_at = datetime.now(timezone.utc)
    run.summary = (
        f"Processed {len(hires)} hires — {policies_fired} policy fire(s), "
        f"{escalations_created} new Workbench escalation(s)."
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    return {
        "run_id": run.id,
        "hires_processed": run.hires_processed,
        "policies_fired": run.policies_fired,
        "escalations_created": run.escalations_created,
        "summary": run.summary,
        "finished_at": run.finished_at,
    }


@router.get("/runs")
def list_runs(limit: int = 20, db: Session = Depends(get_db)):
    runs = db.query(OrchestratorRun).order_by(OrchestratorRun.started_at.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "trigger": r.trigger,
            "status": r.status,
            "hires_processed": r.hires_processed,
            "policies_fired": r.policies_fired,
            "escalations_created": r.escalations_created,
            "summary": r.summary,
            "started_at": r.started_at,
            "finished_at": r.finished_at,
        }
        for r in runs
    ]


@router.get("/hires", response_model=list[HireSchema])
def list_hires(risk_state: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Hire)
    if risk_state:
        query = query.filter(Hire.risk_state == risk_state)
    return query.order_by(Hire.start_date.desc()).all()
