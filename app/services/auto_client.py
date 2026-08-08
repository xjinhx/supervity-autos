# app/services/auto_client.py
"""
Client for triggering the real Orchestrator workflow on auto.supervity.ai.

"Run Orchestrator" in the Command Center calls exactly one thing: this
workflow, identified by its own workflow ID. Which of the domain Operators
run, in what order, is logic that lives inside the Orchestrator's own
workflow definition on Auto's side — this client doesn't choose Operators,
it triggers the Orchestrator and Auto's engine handles the rest.

Uses httpx (not requests) — bumping GUNICORN_TIMEOUT above this client's
timeout is called out explicitly in .env.example for this reason.
"""

import logging
import os

import httpx
from fastapi import HTTPException

log = logging.getLogger(__name__)

# Comfortably under the default GUNICORN_TIMEOUT=240 so the app can return a
# clean "Run failed: timed out" instead of the worker being killed first.
REQUEST_TIMEOUT = 200


def trigger_orchestrator_run(
    employee_id: str | None = None,
    hr_slack_channel: str | None = None,
    sensitive_category_labels: str | None = None,
    normal_category_labels: str | None = None,
) -> dict:
    api_key = os.getenv("SUPERVITY_API_KEY")
    api_base = os.getenv("AUTO_WORKFLOW_API_BASE")
    workflow_id = os.getenv("AUTO_ORCHESTRATOR_WORKFLOW_ID")
    onedrive_folder_path = os.getenv("AUTO_ONEDRIVE_FOLDER_PATH")
    if not api_key or not api_base or not workflow_id:
        raise HTTPException(
            status_code=503,
            detail="Auto/Supervity orchestrator not configured "
            "(SUPERVITY_API_KEY / AUTO_WORKFLOW_API_BASE / AUTO_ORCHESTRATOR_WORKFLOW_ID unset)",
        )

    fields: dict[str, str] = {
        "workflowId": workflow_id,
        # Fixed backend constant — never accepted from the frontend, even if sent.
        "inputs[onedrive_folder_path]": onedrive_folder_path or "",
        "inputs[hr_slack_channel]": hr_slack_channel or os.getenv("AUTO_DEFAULT_HR_SLACK_CHANNEL") or "",
        "inputs[sensitive_category_labels]": sensitive_category_labels
        or os.getenv("AUTO_DEFAULT_SENSITIVE_LABELS")
        or "",
        "inputs[normal_category_labels]": normal_category_labels or os.getenv("AUTO_DEFAULT_NORMAL_LABELS") or "",
    }
    if employee_id:
        fields["inputs[employee_id]"] = employee_id

    headers = {
        "Authorization": f"Bearer {api_key}",
        "x-source": "external",
        "x-user-timezone": "Asia/Singapore",
    }

    try:
        resp = httpx.post(
            api_base.rstrip("/") + "/api/v1/workflow-runs/execute",
            headers=headers,
            # (None, value) tuples force true multipart/form-data encoding for
            # text-only fields — plain `data=` would send urlencoded instead.
            files={key: (None, value) for key, value in fields.items()},
            timeout=REQUEST_TIMEOUT,
        )
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Auto orchestrator request failed: {e}") from e

    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Auto orchestrator run failed: HTTP {resp.status_code} — {resp.text}")

    return resp.json()
