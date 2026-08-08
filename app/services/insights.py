# app/services/insights.py
"""
AI Insights generation.

Computes observations from data the Operators actually produced in Supabase
(`hire_risk_state` + `Workers`, `workbench_resolutions`) rather than
returning hardcoded copy. Called by POST /api/insights/generate, and safe to
call repeatedly — each call replaces the prior generated set (cached locally
in `insights`) so re-running after a new batch produces updated insights.
"""

import logging
from collections import Counter

from sqlalchemy.orm import Session

from ..models.insight import Insight
from . import supabase_client

log = logging.getLogger(__name__)

_CLUSTER_DIMENSIONS = [
    ("Location", "Location"),
    ("Job_Family", "Job Family"),
    ("Manager_Name", "Manager"),
]


def _risk_clustering_insights() -> list[Insight]:
    at_risk_workers = supabase_client.list_at_risk_workers_joined()
    if not at_risk_workers:
        return []

    total = len(at_risk_workers)
    insights: list[Insight] = []

    for field, label in _CLUSTER_DIMENSIONS:
        counts = Counter(w.get(field) for w in at_risk_workers if w.get(field))
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


def _automation_opportunity_insights() -> list[Insight]:
    resolutions = supabase_client.list_workbench_resolutions(limit=500)
    unmodified = [r for r in resolutions if not (r.get("reviewer_notes") and r["reviewer_notes"].strip())]
    if not unmodified:
        return []

    counts = Counter((r["item_type"], r["decision"]) for r in unmodified)
    insights: list[Insight] = []
    for (item_type, decision), count in counts.items():
        if count < 3:
            continue
        label = item_type.replace("_", " ")
        insights.append(
            Insight(
                insight_type="recommendation",
                severity="info",
                title="Automation opportunity detected",
                description=(
                    f"{count} Workbench items for '{label}' were resolved as '{decision}' with no reviewer notes. "
                    f"These cases could be auto-resolved instead of routed to Workbench."
                ),
                supporting_data={"item_type": item_type, "decision": decision, "count": count},
                action_path=f"Consider auto-resolving '{label}' cases as '{decision}' instead of routing them to Workbench.",
            )
        )
    return insights


def generate_insights(db: Session) -> list[Insight]:
    # Replace the prior generated set so re-runs reflect the latest data.
    db.query(Insight).delete()

    new_insights = _risk_clustering_insights() + _automation_opportunity_insights()

    for insight in new_insights:
        db.add(insight)
    db.commit()

    for insight in new_insights:
        db.refresh(insight)

    return sorted(new_insights, key=lambda i: {"critical": 0, "warning": 1, "info": 2}.get(i.severity, 3))
