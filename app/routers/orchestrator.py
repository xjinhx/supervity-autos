# app/routers/orchestrator.py
"""
Orchestrator run trigger.

"Run Orchestrator" calls the real workflow on auto.supervity.ai — no local
state is faked or advanced here. Results already live in Supabase
(policy_evaluations, workbench_resolutions, hire_risk_state) via the
Operators; read them back through the existing GET /api/policies,
/api/workbench, /api/dashboard/summary routes after the run completes.
"""

import logging

from fastapi import APIRouter

from ..schemas.orchestrator import OrchestratorRunRequest
from ..services import auto_client

log = logging.getLogger(__name__)

router = APIRouter(prefix="/orchestrator", tags=["Orchestrator"])


@router.post("/run")
def run_orchestrator(payload: OrchestratorRunRequest):
    return auto_client.trigger_orchestrator_run(
        employee_id=payload.employee_id,
        hr_slack_channel=payload.hr_slack_channel,
        sensitive_category_labels=payload.sensitive_category_labels,
        normal_category_labels=payload.normal_category_labels,
    )
