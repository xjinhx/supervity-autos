# app/routers/insights.py
"""AI Insights — computed observations from real policy_evaluations / workbench_items data."""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models.insight import Insight as InsightModel
from ..schemas.insight import Insight
from ..services.insights import generate_insights

log = logging.getLogger(__name__)

router = APIRouter(prefix="/insights", tags=["AI Insights"])


@router.get("", response_model=list[Insight])
def list_insights(severity: str | None = None, db: Session = Depends(get_db)):
    query = db.query(InsightModel)
    if severity:
        query = query.filter(InsightModel.severity == severity)
    insights = query.order_by(InsightModel.generated_at.desc()).all()
    return insights


@router.post("/generate", response_model=list[Insight])
def generate(db: Session = Depends(get_db)):
    return generate_insights(db)
