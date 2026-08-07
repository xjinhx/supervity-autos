#!/usr/bin/env python3
"""
Command Center seed script.

Populates:
  - hires: a synthetic 90-day onboarding cohort to demo against
  - policies: the 5 policies described in the PRD (3 required + 2 bonus)
  - integration_health: an initial live health check of each registered system
  - one orchestrator_run: so Dashboard/Workbench/Insights aren't empty on first load

Run with: python scripts/seed_command_center.py
(or: docker-compose exec backend python scripts/seed_command_center.py)
"""

import logging
import os
import random
import sys
from datetime import date, datetime, timedelta, timezone

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.core.database import engine  # noqa: E402
from app.models.hire import Hire  # noqa: E402
from app.models.policy import Policy  # noqa: E402
from app.models.run import OrchestratorRun  # noqa: E402
from app.services.integrations import run_health_checks  # noqa: E402
from app.services.policy_engine import evaluate_employee  # noqa: E402

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

LOCATIONS = ["Kuala Lumpur", "Singapore", "Jakarta", "Manila", "Remote"]
JOB_FAMILIES = ["Engineering", "Sales", "Customer Success", "Finance", "Marketing"]
MANAGERS = ["Aisha Rahman", "David Tan", "Priya Nair", "Marco Reyes", "Wei Lin"]

POLICIES = [
    {
        "name": "Overdue Task Escalation",
        "description": "Escalate a hire to Workbench when their overdue onboarding task count breaches this threshold.",
        "policy_type": "threshold",
        "config": {"metric": "overdue_task_count", "operator": ">", "value": 3, "action": "escalate"},
        "locked": False,
    },
    {
        "name": "Compliance Deadline — Work Authorization",
        "description": "Escalate when a hire's work authorization is about to expire, for compliance review.",
        "policy_type": "threshold",
        "config": {"metric": "days_until_work_auth_expiry", "operator": "<", "value": 14, "action": "escalate"},
        "locked": False,
    },
    {
        "name": "Confidentiality Routing — Disclosure",
        "description": (
            "Hard compliance rule: any confidential disclosure routes directly to #hr-disclosures. "
            "Never to a manager or aggregate dashboard view. This rule cannot be edited from the UI."
        ),
        "policy_type": "rule",
        "config": {"metric": "disclosure_found", "operator": "==", "value": True, "action": "escalate", "route": "#hr-disclosures"},
        "locked": True,
    },
    {
        "name": "Nudge Cadence Suppression",
        "description": "Suppress a new reminder notification if one was already sent in the last 7 days.",
        "policy_type": "threshold",
        "config": {"metric": "days_since_last_notification", "operator": "<", "value": 7, "action": "suppress"},
        "locked": False,
    },
    {
        "name": "Learning Milestone Overdue",
        "description": "Escalate when a required learning milestone is overdue by more than 5 days.",
        "policy_type": "threshold",
        "config": {"metric": "learning_milestone_overdue_days", "operator": ">", "value": 5, "action": "escalate"},
        "locked": False,
    },
]


def _make_hire(i: int) -> Hire:
    start_date = date.today() - timedelta(days=random.randint(5, 85))
    tasks_total = random.randint(10, 20)
    tasks_completed = random.randint(0, tasks_total)
    overdue = max(0, random.choice([0, 0, 0, 1, 2, 3, 4, 5]))
    work_auth_days = random.choice([None, None, None, 9, 12, 20, 45, 90])
    disclosure = i == 3  # exactly one seeded disclosure case, to demo the locked routing rule
    days_since_notif = random.choice([1, 2, 4, 6, 8, 10, 15])
    milestone_overdue = random.choice([0, 0, 0, 2, 6, 9])
    quarter = (start_date.month - 1) // 3 + 1

    return Hire(
        employee_id=f"EMP-{1000 + i}",
        full_name=f"Hire {i:02d}",
        location=random.choice(LOCATIONS),
        job_family=random.choice(JOB_FAMILIES),
        manager=random.choice(MANAGERS),
        cohort=f"{start_date.year}-Q{quarter}",
        start_date=start_date,
        day90_date=start_date + timedelta(days=90),
        tasks_total=tasks_total,
        tasks_completed=tasks_completed,
        overdue_task_count=overdue,
        days_until_work_auth_expiry=work_auth_days,
        disclosure_found=disclosure,
        days_since_last_notification=days_since_notif,
        learning_milestone_overdue_days=milestone_overdue,
        risk_state="on_track",
        retained=random.random() > 0.12 if start_date + timedelta(days=90) <= date.today() else None,
    )


def seed():
    db = SessionLocal()
    try:
        if db.query(Hire).count() == 0:
            log.info("Seeding hires...")
            hires = [_make_hire(i) for i in range(1, 25)]
            db.add_all(hires)
            db.commit()
            log.info("Seeded %d hires.", len(hires))
        else:
            log.info("Hires table is not empty, skipping hire seeding.")

        if db.query(Policy).count() == 0:
            log.info("Seeding policies...")
            for p in POLICIES:
                db.add(Policy(**p, active=True))
            db.commit()
            log.info("Seeded %d policies.", len(POLICIES))
        else:
            log.info("Policies table is not empty, skipping policy seeding.")

        log.info("Running initial integration health checks...")
        run_health_checks(db)
        log.info("Integration health checks complete.")

        if db.query(OrchestratorRun).count() == 0:
            log.info("Running an initial Orchestrator pass so the demo isn't empty on first load...")
            run = OrchestratorRun(trigger="seed", status="running")
            db.add(run)
            db.commit()
            db.refresh(run)

            hires = db.query(Hire).all()
            fired = 0
            escalations = 0
            for hire in hires:
                result = evaluate_employee(db, hire, run_id=run.id)
                fired += sum(1 for r in result["results"] if r["fired"])
                escalations += len(result["workbench_item_ids"])

            run.status = "completed"
            run.hires_processed = len(hires)
            run.policies_fired = fired
            run.escalations_created = escalations
            run.summary = f"Seed run — {len(hires)} hires, {fired} policy fires, {escalations} escalations."
            run.finished_at = datetime.now(timezone.utc)
            db.add(run)
            db.commit()
            log.info("Initial run complete: %s", run.summary)
        else:
            log.info("Orchestrator runs already exist, skipping initial run.")

        log.info("✅ Command Center seed complete.")
    except Exception as e:  # noqa: BLE001
        log.error("❌ An error occurred during Command Center seeding: %s", e)
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    log.info("--- Seeding Command Center data ---")
    seed()
