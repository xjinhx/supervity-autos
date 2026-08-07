# app/services/policy_engine.py
"""
The AI Policies engine.

This is what turns the `policies` table from a static config read into a real,
business-editable rules engine: `evaluate_employee()` is the function an Auto
Operator (via POST /api/policies/evaluate) or the local Orchestrator simulator
calls once per hire, per run. It:

  1. Pulls all ACTIVE policies from Postgres (no hardcoded thresholds).
  2. Compares each policy's condition against the hire's live metrics.
  3. Logs every fire / no-fire decision to `policy_evaluations` (the audit trail).
  4. For policies whose action is "escalate", opens a `workbench_items` row
     (deduped against an existing pending item) instead of silently acting.
  5. Recomputes the hire's risk_state from the fired policies.
"""

import logging
import operator as op
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.hire import Hire
from ..models.policy import Policy, PolicyEvaluation
from ..models.workbench import WorkbenchCorrection, WorkbenchItem

log = logging.getLogger(__name__)

_OPERATORS = {
    ">": op.gt,
    "<": op.lt,
    ">=": op.ge,
    "<=": op.le,
    "==": op.eq,
    "!=": op.ne,
}

# metric -> workbench item_type when a policy on that metric escalates
_ITEM_TYPE_BY_METRIC = {
    "disclosure_found": "disclosure",
    "days_until_work_auth_expiry": "validation_failure",
}
_DEFAULT_ITEM_TYPE = "at_risk_escalation"


def hire_metrics(hire: Hire) -> dict[str, Any]:
    """The live metric snapshot a policy can be evaluated against."""
    return {
        "overdue_task_count": hire.overdue_task_count,
        "days_until_work_auth_expiry": hire.days_until_work_auth_expiry,
        "disclosure_found": hire.disclosure_found,
        "days_since_last_notification": hire.days_since_last_notification,
        "learning_milestone_overdue_days": hire.learning_milestone_overdue_days,
        "tasks_total": hire.tasks_total,
        "tasks_completed": hire.tasks_completed,
    }


def _compare(actual: Any, operator_symbol: str, expected: Any) -> bool:
    if actual is None:
        return False
    fn = _OPERATORS.get(operator_symbol)
    if fn is None:
        log.warning("Unknown policy operator '%s' — treating as no-fire", operator_symbol)
        return False
    try:
        return bool(fn(actual, expected))
    except TypeError:
        return False


def _recommendation_text(policy: Policy, metric: str, actual: Any) -> str:
    cfg = policy.config or {}
    if metric == "disclosure_found":
        return (
            f"Confidentiality routing fired for this hire. Route directly to "
            f"{cfg.get('route', '#hr-disclosures')} only — never to manager or aggregate views."
        )
    if metric == "days_until_work_auth_expiry":
        return f"Work authorization expires in {actual} day(s) — below the '{policy.name}' threshold. Escalate for compliance review."
    if metric == "overdue_task_count":
        return f"{actual} overdue onboarding task(s) — breaches '{policy.name}' ({cfg.get('operator')} {cfg.get('value')}). Recommend escalation to manager."
    return f"Policy '{policy.name}' fired ({metric}={actual}). Recommend review."


def _existing_open_item(db: Session, employee_id: str, item_type: str, policy_id: UUID) -> WorkbenchItem | None:
    return (
        db.query(WorkbenchItem)
        .filter(
            WorkbenchItem.employee_id == employee_id,
            WorkbenchItem.item_type == item_type,
            WorkbenchItem.policy_id == policy_id,
            WorkbenchItem.status == "pending",
        )
        .first()
    )


def evaluate_employee(
    db: Session,
    hire: Hire,
    run_id: UUID | None = None,
    metrics_override: dict[str, Any] | None = None,
) -> dict:
    """Evaluate every active policy against one hire. Returns a summary dict.

    Writes policy_evaluations rows and opens workbench_items for escalations —
    this function IS the "Fetch Configuration" + "Step 5 Policy Evaluation"
    wiring point described in the PRD.
    """
    metrics = hire_metrics(hire)
    if metrics_override:
        metrics.update(metrics_override)

    policies = db.query(Policy).filter(Policy.active.is_(True)).all()

    results = []
    escalated = False
    at_risk = False
    new_workbench_ids: list[UUID] = []

    for policy in policies:
        cfg = policy.config or {}
        metric = cfg.get("metric")
        operator_symbol = cfg.get("operator", ">")
        threshold = cfg.get("value")
        action = cfg.get("action", "escalate")

        actual = metrics.get(metric)
        fired = _compare(actual, operator_symbol, threshold)
        action_taken = "none"

        if fired:
            if action == "escalate":
                action_taken = "escalate"
                item_type = _ITEM_TYPE_BY_METRIC.get(metric, _DEFAULT_ITEM_TYPE)
                if item_type == "disclosure":
                    escalated = True
                else:
                    at_risk = True

                if not _existing_open_item(db, hire.employee_id, item_type, policy.id):
                    item = WorkbenchItem(
                        employee_id=hire.employee_id,
                        item_type=item_type,
                        policy_id=policy.id,
                        context={
                            "hire": {
                                "full_name": hire.full_name,
                                "location": hire.location,
                                "job_family": hire.job_family,
                                "manager": hire.manager,
                                "cohort": hire.cohort,
                                "start_date": hire.start_date.isoformat() if hire.start_date else None,
                            },
                            "metric": metric,
                            "actual_value": actual,
                            "threshold": {"operator": operator_symbol, "value": threshold},
                            "policy_name": policy.name,
                        },
                        ai_recommendation=_recommendation_text(policy, metric, actual),
                        status="pending",
                    )
                    db.add(item)
                    db.flush()
                    new_workbench_ids.append(item.id)
            elif action == "notify":
                action_taken = "notify"
            elif action == "suppress":
                action_taken = "suppress"

        db.add(
            PolicyEvaluation(
                policy_id=policy.id,
                run_id=run_id,
                employee_id=hire.employee_id,
                input_value={"metric": metric, "actual": actual, "operator": operator_symbol, "threshold": threshold},
                fired=fired,
                action_taken=action_taken,
            )
        )
        results.append(
            {
                "policy_id": policy.id,
                "policy_name": policy.name,
                "fired": fired,
                "action_taken": action_taken,
                "route": cfg.get("route") if fired and metric == "disclosure_found" else None,
            }
        )

    if escalated:
        hire.risk_state = "escalated"
    elif at_risk:
        hire.risk_state = "at_risk"
    else:
        hire.risk_state = "on_track"

    db.add(hire)
    db.commit()

    return {
        "employee_id": hire.employee_id,
        "run_id": run_id,
        "results": results,
        "risk_state": hire.risk_state,
        "workbench_item_ids": new_workbench_ids,
    }


def check_and_flag_policy_for_review(db: Session, policy_id: UUID, window_days: int = 7, min_corrections: int = 3) -> bool:
    """Bonus self-learning: if humans have manually downgraded/modified this
    policy's recommendations 3+ times in the last 7 days, flag it for review.
    """
    since = datetime.now(timezone.utc) - timedelta(days=window_days)
    count = (
        db.query(func.count(WorkbenchCorrection.id))
        .filter(WorkbenchCorrection.policy_id == policy_id, WorkbenchCorrection.created_at >= since)
        .scalar()
    )
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    if not policy:
        return False
    should_flag = count is not None and count >= min_corrections
    if policy.flagged_for_review != should_flag:
        policy.flagged_for_review = should_flag
        db.add(policy)
        db.commit()
    return should_flag
