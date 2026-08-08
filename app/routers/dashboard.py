# app/routers/dashboard.py
"""Dashboard aggregates — real numbers computed from Supabase (Workers,
hire_risk_state, Onboarding_Tasks, policy_evaluations, workbench_resolutions)."""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter

from ..routers.policies import ALL_KEYS, POLICY_DEFS
from ..schemas.dashboard import ActivityPoint, DashboardActivity, DashboardSummary
from ..services import supabase_client

log = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary():
    total_hires = supabase_client.count_workers()
    on_track = supabase_client.count_hire_risk_state("on_track")
    at_risk = supabase_client.count_hire_risk_state("at_risk")

    tasks_total = supabase_client.count_onboarding_tasks()
    tasks_completed = supabase_client.count_onboarding_tasks(completed=True)
    completion_pct = round((tasks_completed / tasks_total) * 100, 1) if tasks_total else 0.0

    since = datetime.now(timezone.utc) - timedelta(days=7)
    recent_resolutions = supabase_client.count_recent_workbench_resolutions(since)

    config_values = supabase_client.get_config_values(ALL_KEYS)
    active_policies = sum(
        1 for policy in POLICY_DEFS if all(config_values.get(field["key"]) is not None for field in policy["fields"])
    )

    last_run_at = supabase_client.latest_policy_evaluation_at()

    return DashboardSummary(
        total_hires=total_hires,
        on_track_count=on_track,
        at_risk_count=at_risk,
        tasks_completion_pct=completion_pct,
        recent_workbench_resolutions=recent_resolutions,
        active_policies=active_policies,
        last_run_at=last_run_at,
    )


@router.get("/activity", response_model=DashboardActivity)
def get_activity(days: int = 14):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Bucket in Python rather than SQL to stay dialect-agnostic (matches the
    # style used everywhere else this app aggregates time-series data).
    eval_counts: dict[str, int] = {}
    fired_counts: dict[str, int] = {}
    escalation_counts: dict[str, int] = {}
    for pe in supabase_client.list_policy_evaluations_since(since):
        key = datetime.fromisoformat(pe["evaluated_at"]).date().isoformat()
        eval_counts[key] = eval_counts.get(key, 0) + 1
        if not pe.get("passed", True):
            fired_counts[key] = fired_counts.get(key, 0) + 1
        if pe.get("contributed_to_escalation"):
            escalation_counts[key] = escalation_counts.get(key, 0) + 1

    all_days = sorted(set(eval_counts) | set(fired_counts) | set(escalation_counts))
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
