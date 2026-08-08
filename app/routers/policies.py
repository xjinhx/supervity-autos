# app/routers/policies.py
"""
AI Policies — a curated, labeled view over specific Supabase `config` keys.

Real thresholds live in Supabase `config` (key/value), read by the Operators
on every run. This router never owns a "policies" table: it just exposes the
4 keys below with display labels, lets the UI edit their values, and reads
back the real evaluation log the Operators already write.
"""

import logging

from fastapi import APIRouter, HTTPException

from ..schemas.policy import PolicyEvaluationOut, PolicyField, PolicyFieldUpdate, PolicyOut
from ..services import supabase_client

log = logging.getLogger(__name__)

router = APIRouter(prefix="/policies", tags=["AI Policies"])

# Shared with dashboard.py's "active policies" aggregate — the full set of
# curated policy defs is intentionally public, not router-private.
POLICY_DEFS = [
    {
        "name": "Compliance Deadline Policy",
        "description": "Drives the Compliance Operator's warning/critical escalation timing.",
        "fields": [
            {"key": "compliance_warning_days", "label": "Warning threshold (days before deadline)"},
            {"key": "compliance_critical_days", "label": "Critical threshold (days before deadline)"},
        ],
    },
    {
        "name": "Learning Milestone Grace Policy",
        "description": "Drives the Learning Milestone Operator's grace period before escalating overdue courses.",
        "fields": [
            {"key": "learning_grace_days", "label": "Grace period (days)"},
        ],
    },
    {
        "name": "Engagement Risk Policy",
        "description": "Drives the Pulse Trend v2 Operator's low-score and early-milestone detection.",
        "fields": [
            {"key": "pulse_low_score_threshold", "label": "Low engagement score threshold"},
            {"key": "pulse_early_milestone_days", "label": "Early milestone window (days)"},
        ],
    },
    {
        "name": "Payroll Verification Grace Policy",
        "description": "Drives the Payroll Verification Operator's grace period before flagging a pending payroll item.",
        "fields": [
            {"key": "payroll_pending_grace_days", "label": "Grace period (days)"},
        ],
    },
]

ALL_KEYS = [field["key"] for policy in POLICY_DEFS for field in policy["fields"]]
_KEY_TO_LABEL = {field["key"]: field["label"] for policy in POLICY_DEFS for field in policy["fields"]}


@router.get("", response_model=list[PolicyOut])
def list_policies():
    values = supabase_client.get_config_values(ALL_KEYS)
    return [
        PolicyOut(
            name=policy["name"],
            description=policy["description"],
            fields=[
                PolicyField(key=field["key"], label=field["label"], value=values.get(field["key"]))
                for field in policy["fields"]
            ],
        )
        for policy in POLICY_DEFS
    ]


@router.get("/evaluations", response_model=list[PolicyEvaluationOut])
def list_evaluations(policy_name: str | None = None, employee_id: str | None = None, limit: int = 50):
    return supabase_client.list_policy_evaluations(policy_name=policy_name, employee_id=employee_id, limit=limit)


@router.patch("/{key}", response_model=PolicyField)
def update_policy_field(key: str, payload: PolicyFieldUpdate):
    if key not in _KEY_TO_LABEL:
        raise HTTPException(status_code=404, detail=f"Unknown policy config key '{key}'")
    supabase_client.upsert_config_value(key, payload.value)
    return PolicyField(key=key, label=_KEY_TO_LABEL[key], value=payload.value)
