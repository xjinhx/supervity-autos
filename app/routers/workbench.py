# app/routers/workbench.py
"""
AI Workbench — the human-in-the-loop resolve loop.

Escalations opened by the policy engine (see policy_engine.evaluate_employee)
land here as pending items. Resolving one writes the decision back to
`hires.risk_state` (closing the ticket) and, for "modify" actions, records a
correction that feeds the bonus self-learning signal on the originating policy.
"""

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models.hire import Hire
from ..models.workbench import WorkbenchCorrection, WorkbenchItem as WorkbenchItemModel
from ..schemas.workbench import WorkbenchItem, WorkbenchResolveRequest
from ..services.policy_engine import check_and_flag_policy_for_review

log = logging.getLogger(__name__)

router = APIRouter(prefix="/workbench", tags=["Workbench"])

_ACTION_TO_STATUS = {"approve": "approved", "reject": "rejected", "modify": "modified"}


def _recompute_hire_risk_state(db: Session, employee_id: str) -> None:
    hire = db.query(Hire).filter(Hire.employee_id == employee_id).first()
    if hire is None:
        return
    pending_types = {
        row.item_type
        for row in db.query(WorkbenchItemModel).filter(
            WorkbenchItemModel.employee_id == employee_id,
            WorkbenchItemModel.status == "pending",
        )
    }
    if "disclosure" in pending_types:
        hire.risk_state = "escalated"
    elif pending_types:
        hire.risk_state = "at_risk"
    else:
        hire.risk_state = "on_track"
    db.add(hire)
    db.commit()


@router.get("", response_model=list[WorkbenchItem])
def list_workbench_items(
    status: str | None = None,
    item_type: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(WorkbenchItemModel)
    if status:
        query = query.filter(WorkbenchItemModel.status == status)
    if item_type:
        query = query.filter(WorkbenchItemModel.item_type == item_type)
    items = query.order_by(WorkbenchItemModel.created_at.desc()).limit(limit).all()
    return items


@router.get("/{item_id}", response_model=WorkbenchItem)
def get_workbench_item(item_id: UUID, db: Session = Depends(get_db)):
    item = db.query(WorkbenchItemModel).filter(WorkbenchItemModel.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Workbench item not found")
    return item


@router.post("/{item_id}/resolve", response_model=WorkbenchItem)
def resolve_workbench_item(item_id: UUID, payload: WorkbenchResolveRequest, db: Session = Depends(get_db)):
    item = db.query(WorkbenchItemModel).filter(WorkbenchItemModel.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Workbench item not found")
    if item.status != "pending":
        raise HTTPException(status_code=409, detail=f"Item already resolved as '{item.status}'")
    if payload.action not in _ACTION_TO_STATUS:
        raise HTTPException(status_code=400, detail="action must be one of: approve, reject, modify")

    item.status = _ACTION_TO_STATUS[payload.action]
    item.resolution_notes = payload.notes
    item.resolved_by = payload.resolved_by
    item.resolved_at = datetime.now(timezone.utc)
    db.add(item)

    if payload.action == "modify" and item.policy_id is not None:
        db.add(
            WorkbenchCorrection(
                workbench_item_id=item.id,
                policy_id=item.policy_id,
                original_recommendation=item.ai_recommendation,
                corrected_action=payload.corrected_action or payload.notes or "modified",
            )
        )

    db.commit()
    db.refresh(item)

    _recompute_hire_risk_state(db, item.employee_id)

    if payload.action == "modify" and item.policy_id is not None:
        check_and_flag_policy_for_review(db, item.policy_id)

    return item
