# app/routers/integrations.py
"""Data Manager — registry of external systems with real health checks."""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models.integration import IntegrationHealth as IntegrationHealthModel
from ..schemas.integration import IntegrationHealth
from ..services.integrations import run_health_checks

log = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations", tags=["Data Manager"])


@router.get("/health", response_model=list[IntegrationHealth])
def get_integration_health(refresh: bool = True, db: Session = Depends(get_db)):
    """By default, runs a live health check on every registered system.
    Pass refresh=false to just read the last-known status without re-pinging.
    """
    if refresh:
        return run_health_checks(db)
    return db.query(IntegrationHealthModel).order_by(IntegrationHealthModel.system_name.asc()).all()
