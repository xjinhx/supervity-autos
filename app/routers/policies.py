# app/routers/policies.py
"""
AI Policies engine — DB-backed rules that constrain Orchestrator behavior.

POST /api/policies/evaluate is the critical wiring point: your Auto
Orchestrator's "Fetch Configuration" / "Policy Evaluation" step calls this
once per hire, per run, instead of reading a static Supabase config table.
Every fire/no-fire decision is logged to policy_evaluations for audit.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models.hire import Hire
from ..models.policy import Policy as PolicyModel
from ..models.policy import PolicyEvaluation as PolicyEvaluationModel
from ..schemas.policy import (
    EvaluateRequest,
    EvaluateResponse,
    Policy,
    PolicyCreate,
    PolicyEvaluationOut,
    PolicyUpdate,
)
from ..services.policy_engine import evaluate_employee

log = logging.getLogger(__name__)

router = APIRouter(prefix="/policies", tags=["AI Policies"])


def _to_policy_out(db: Session, policy: PolicyModel) -> Policy:
    execution_count = (
        db.query(func.count(PolicyEvaluationModel.id))
        .filter(PolicyEvaluationModel.policy_id == policy.id)
        .scalar()
        or 0
    )
    fired_count = (
        db.query(func.count(PolicyEvaluationModel.id))
        .filter(PolicyEvaluationModel.policy_id == policy.id, PolicyEvaluationModel.fired.is_(True))
        .scalar()
        or 0
    )
    last_evaluated_at = (
        db.query(func.max(PolicyEvaluationModel.evaluated_at))
        .filter(PolicyEvaluationModel.policy_id == policy.id)
        .scalar()
    )
    return Policy(
        id=policy.id,
        name=policy.name,
        description=policy.description,
        policy_type=policy.policy_type,
        config=policy.config,
        active=policy.active,
        locked=policy.locked,
        flagged_for_review=policy.flagged_for_review,
        created_at=policy.created_at,
        updated_at=policy.updated_at,
        execution_count=execution_count,
        fired_count=fired_count,
        last_evaluated_at=last_evaluated_at,
    )


@router.get("", response_model=list[Policy])
def list_policies(active_only: bool = False, db: Session = Depends(get_db)):
    query = db.query(PolicyModel)
    if active_only:
        query = query.filter(PolicyModel.active.is_(True))
    policies = query.order_by(PolicyModel.created_at.asc()).all()
    return [_to_policy_out(db, p) for p in policies]


@router.post("", response_model=Policy)
def create_policy(payload: PolicyCreate, db: Session = Depends(get_db)):
    policy = PolicyModel(
        name=payload.name,
        description=payload.description,
        policy_type=payload.policy_type,
        config=payload.config,
        active=payload.active,
        locked=payload.locked,
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return _to_policy_out(db, policy)


@router.patch("/{policy_id}", response_model=Policy)
def update_policy(policy_id: UUID, payload: PolicyUpdate, db: Session = Depends(get_db)):
    policy = db.query(PolicyModel).filter(PolicyModel.id == policy_id).first()
    if policy is None:
        raise HTTPException(status_code=404, detail="Policy not found")
    if policy.locked:
        raise HTTPException(
            status_code=403,
            detail="This is a locked compliance rule and cannot be edited from the UI.",
        )

    if payload.name is not None:
        policy.name = payload.name
    if payload.description is not None:
        policy.description = payload.description
    if payload.config is not None:
        policy.config = payload.config
    if payload.active is not None:
        policy.active = payload.active

    db.add(policy)
    db.commit()
    db.refresh(policy)
    return _to_policy_out(db, policy)


@router.delete("/{policy_id}")
def delete_policy(policy_id: UUID, db: Session = Depends(get_db)):
    policy = db.query(PolicyModel).filter(PolicyModel.id == policy_id).first()
    if policy is None:
        raise HTTPException(status_code=404, detail="Policy not found")
    if policy.locked:
        raise HTTPException(status_code=403, detail="This is a locked compliance rule and cannot be deleted.")
    db.delete(policy)
    db.commit()
    return {"message": "Policy deleted"}


@router.get("/{policy_id}/evaluations", response_model=list[PolicyEvaluationOut])
def get_policy_evaluations(policy_id: UUID, limit: int = 50, db: Session = Depends(get_db)):
    policy = db.query(PolicyModel).filter(PolicyModel.id == policy_id).first()
    if policy is None:
        raise HTTPException(status_code=404, detail="Policy not found")
    evaluations = (
        db.query(PolicyEvaluationModel)
        .filter(PolicyEvaluationModel.policy_id == policy_id)
        .order_by(PolicyEvaluationModel.evaluated_at.desc())
        .limit(limit)
        .all()
    )
    return evaluations


@router.post("/evaluate", response_model=EvaluateResponse)
def evaluate_policies(payload: EvaluateRequest, db: Session = Depends(get_db)):
    """Called by an Auto Operator (or the local Orchestrator simulator) once
    per hire, per run. Pulls live thresholds from the `policies` table,
    evaluates them against this hire, logs the outcome, and opens Workbench
    items for anything that escalates.
    """
    hire = db.query(Hire).filter(Hire.employee_id == payload.employee_id).first()
    if hire is None:
        raise HTTPException(status_code=404, detail=f"No hire found with employee_id '{payload.employee_id}'")

    result = evaluate_employee(db, hire, run_id=payload.run_id, metrics_override=payload.metrics)
    return EvaluateResponse(**result)
