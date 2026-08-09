# app/routers/orchestrator.py
"""
Orchestrator run trigger.

"Run Orchestrator" calls the real workflow on auto.supervity.ai — no local
state is faked or advanced here. Results already live in Supabase
(policy_evaluations, workbench_resolutions, hire_risk_state) via the
Operators; read them back through the existing GET /api/policies,
/api/workbench, /api/dashboard/summary routes after the run completes.

The run itself happens in a BackgroundTask so this endpoint can return a
run_id immediately — the frontend navigates to the Workbench right away and
polls GET /run/{run_id} for live step-by-step progress instead of blocking
on a modal for the run's full duration.
"""

import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException

from ..schemas.orchestrator import OrchestratorRunRequest
from ..services import auto_client, orchestrator_runs

log = logging.getLogger(__name__)

router = APIRouter(prefix="/orchestrator", tags=["Orchestrator"])


@router.post("/run")
def run_orchestrator(payload: OrchestratorRunRequest, background_tasks: BackgroundTasks):
    log.info("Received orchestrator run request: %s", payload.model_dump())
    run_id = orchestrator_runs.create_run()
    background_tasks.add_task(
        auto_client.run_orchestrator_streaming,
        run_id,
        payload.employee_id,
        payload.hr_slack_channel,
        payload.sensitive_category_labels,
        payload.normal_category_labels,
    )
    return {"run_id": run_id}


@router.get("/run/{run_id}")
def get_orchestrator_run(run_id: str):
    run = orchestrator_runs.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Unknown orchestrator run_id")
    return run
