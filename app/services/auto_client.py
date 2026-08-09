# app/services/auto_client.py
"""
Client for triggering the real Orchestrator workflow on auto.supervity.ai.

"Run Orchestrator" in the Command Center calls exactly one thing: this
workflow, identified by its own workflow ID. Which of the domain Operators
run, in what order, is logic that lives inside the Orchestrator's own
workflow definition on Auto's side — this client doesn't choose Operators,
it triggers the Orchestrator and Auto's engine handles the rest.

Uses the streaming (SSE) execute endpoint, not the blocking one. A real
Orchestrator run takes longer than Cloudflare will hold a silent blocking
connection open (confirmed in practice: the blocking /execute endpoint
returns a Cloudflare 524 "origin timeout"). SSE keeps bytes flowing as
Auto emits progress events, so the connection never goes quiet long enough
to get killed.

Two callers consume this stream differently:
- trigger_orchestrator_run() blocks until the stream closes and returns
  only the last event — used by the AI chat tool, which needs a single
  final answer.
- run_orchestrator_streaming() reports every event to orchestrator_runs as
  it arrives — used by the "Run Orchestrator" background task, so the
  frontend can navigate away immediately and poll for live step progress.

Uses httpx (not requests) — bumping GUNICORN_TIMEOUT above this client's
timeout is called out explicitly in .env.example for this reason.
"""

import json
import logging
import os
from collections.abc import Iterator

import httpx
from fastapi import HTTPException

from . import orchestrator_runs

log = logging.getLogger(__name__)

# Connect/write are generous but bounded; read is per-chunk (time between SSE
# events), not total stream duration — so a long-but-active run won't time
# out here as long as Auto keeps emitting events.
REQUEST_TIMEOUT = httpx.Timeout(connect=10.0, read=200.0, write=30.0, pool=10.0)


def _build_request(
    employee_id: str | None,
    hr_slack_channel: str | None,
    sensitive_category_labels: str | None,
    normal_category_labels: str | None,
) -> tuple[str, dict[str, str], dict[str, str]]:
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
        "Accept": "text/event-stream",
    }
    url = api_base.rstrip("/") + "/api/v1/workflow-runs/execute/stream"
    return url, headers, fields


def _stream_events(
    employee_id: str | None,
    hr_slack_channel: str | None,
    sensitive_category_labels: str | None,
    normal_category_labels: str | None,
) -> Iterator[dict]:
    """Yields each parsed JSON SSE event from Auto's orchestrator stream, in order."""
    url, headers, fields = _build_request(
        employee_id, hr_slack_channel, sensitive_category_labels, normal_category_labels
    )
    try:
        with httpx.stream(
            "POST",
            url,
            headers=headers,
            # (None, value) tuples force true multipart/form-data encoding for
            # text-only fields — plain `data=` would send urlencoded instead.
            files={key: (None, value) for key, value in fields.items()},
            timeout=REQUEST_TIMEOUT,
        ) as resp:
            if resp.status_code >= 400:
                body = resp.read()
                raise HTTPException(
                    status_code=502,
                    detail=f"Auto orchestrator run failed: HTTP {resp.status_code} — {body.decode(errors='replace')}",
                )
            for line in resp.iter_lines():
                if not line or not line.startswith("data:"):
                    continue
                payload = line[len("data:") :].strip()
                if not payload:
                    continue
                try:
                    yield json.loads(payload)
                except ValueError:
                    log.warning("Non-JSON SSE payload from Auto orchestrator stream: %s", payload)
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Auto orchestrator request failed: {e}") from e


def trigger_orchestrator_run(
    employee_id: str | None = None,
    hr_slack_channel: str | None = None,
    sensitive_category_labels: str | None = None,
    normal_category_labels: str | None = None,
) -> dict:
    last_event: dict | None = None
    for event in _stream_events(employee_id, hr_slack_channel, sensitive_category_labels, normal_category_labels):
        last_event = event

    if last_event is None:
        raise HTTPException(status_code=502, detail="Auto orchestrator stream closed with no events")

    return last_event


def run_orchestrator_streaming(
    run_id: str,
    employee_id: str | None = None,
    hr_slack_channel: str | None = None,
    sensitive_category_labels: str | None = None,
    normal_category_labels: str | None = None,
) -> None:
    """Runs as a FastAPI BackgroundTask. Reports each step to orchestrator_runs as it
    arrives instead of only returning the final event, so the frontend can navigate
    away immediately and poll GET /api/orchestrator/run/{run_id} for live progress."""
    last_event: dict | None = None
    try:
        for event in _stream_events(
            employee_id, hr_slack_channel, sensitive_category_labels, normal_category_labels
        ):
            last_event = event
            orchestrator_runs.update_step(run_id, event)
    except HTTPException as e:
        orchestrator_runs.fail_run(run_id, str(e.detail))
        return

    if last_event is None:
        orchestrator_runs.fail_run(run_id, "Auto orchestrator stream closed with no events")
        return

    orchestrator_runs.complete_run(run_id, last_event)
