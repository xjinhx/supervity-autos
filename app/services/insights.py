# app/services/insights.py
"""
AI Insights generation.

Computes observations from data the Orchestrator actually produced
(`hires.risk_state`, `workbench_items`, `policies`) rather than returning
hardcoded copy. Called by POST /api/insights/generate, and safe to call
repeatedly — each call replaces the prior generated set so re-running after
a new batch produces updated insights (PRD acceptance criterion).
"""

import logging
from collections import Counter

from sqlalchemy.orm import Session

from ..models.hire import Hire
from ..models.insight import Insight
from ..models.policy import Policy
from ..models.workbench import WorkbenchItem

log = logging.getLogger(__name__)

_CLUSTER_DIMENSIONS = [
    ("location", "Location"),
    ("job_family", "Job Family"),
    ("manager", "Manager"),
]


def _risk_clustering_insights(db: Session) -> list[Insight]:
    at_risk_hires = db.query(Hire).filter(Hire.risk_state.in_(["at_risk", "escalated"])).all()
    if not at_risk_hires:
        return []

    total = len(at_risk_hires)
    insights: list[Insight] = []

    for field, label in _CLUSTER_DIMENSIONS:
        counts = Counter(getattr(h, field) for h in at_risk_hires if getattr(h, field))
        if not counts:
            continue
        top_value, top_count = counts.most_common(1)[0]
        concentration = top_count / total
        if concentration >= 0.3 and top_count >= 2:
            severity = "critical" if concentration >= 0.5 else "warning"
            insights.append(
                Insight(
                    insight_type="pattern",
                    severity=severity,
                    title=f"At-risk hires cluster by {label}",
                    description=(
                        f"{round(concentration * 100)}% of at-risk hires this cohort ({top_count} of {total}) "
                        f"share {label.lower()} '{top_value}'."
                    ),
                    supporting_data={
                        "dimension": field,
                        "value": str(top_value),
                        "count": top_count,
                        "total_at_risk": total,
                        "concentration_pct": round(concentration * 100, 1),
                    },
                    action_path=f"Review onboarding support for {label.lower()} '{top_value}' — a shared root cause is likely.",
                )
            )
    return insights


def _automation_opportunity_insights(db: Session) -> list[Insight]:
    approved = (
        db.query(WorkbenchItem)
        .filter(WorkbenchItem.status == "approved")
        .all()
    )
    unmodified = [i for i in approved if not (i.resolution_notes and i.resolution_notes.strip())]
    if not unmodified:
        return []

    counts = Counter((i.item_type, i.policy_id) for i in unmodified)
    insights: list[Insight] = []
    for (item_type, policy_id), count in counts.items():
        if count < 3:
            continue
        policy_name = None
        if policy_id:
            policy = db.query(Policy).filter(Policy.id == policy_id).first()
            policy_name = policy.name if policy else None
        label = policy_name or item_type.replace("_", " ")
        insights.append(
            Insight(
                insight_type="recommendation",
                severity="info",
                title="Automation opportunity detected",
                description=(
                    f"{count} Workbench items for '{label}' were approved with no changes. "
                    f"These cases could be auto-approved under the existing policy condition."
                ),
                supporting_data={"item_type": item_type, "policy_id": str(policy_id) if policy_id else None, "count": count},
                action_path=f"Consider auto-approving '{label}' cases instead of routing them to Workbench.",
            )
        )
    return insights


def _policy_review_insights(db: Session) -> list[Insight]:
    flagged = db.query(Policy).filter(Policy.flagged_for_review.is_(True)).all()
    insights: list[Insight] = []
    for policy in flagged:
        insights.append(
            Insight(
                insight_type="anomaly",
                severity="warning",
                title=f"Policy '{policy.name}' flagged for review",
                description=(
                    "Operators have manually modified this policy's recommendation 3+ times "
                    "in the last 7 days — its threshold may no longer match reality."
                ),
                supporting_data={"policy_id": str(policy.id)},
                action_path=f"Review and adjust the '{policy.name}' threshold in AI Policies.",
            )
        )
    return insights


def generate_insights(db: Session) -> list[Insight]:
    # Replace the prior generated set so re-runs reflect the latest data.
    db.query(Insight).delete()

    new_insights = (
        _risk_clustering_insights(db)
        + _automation_opportunity_insights(db)
        + _policy_review_insights(db)
    )

    for insight in new_insights:
        db.add(insight)
    db.commit()

    for insight in new_insights:
        db.refresh(insight)

    return sorted(new_insights, key=lambda i: {"critical": 0, "warning": 1, "info": 2}.get(i.severity, 3))
