# app/services/orchestrator_runs.py
"""
In-memory progress tracker for background Orchestrator runs.

"Run Orchestrator" kicks off a FastAPI BackgroundTask (see
app/routers/orchestrator.py) and returns a run_id immediately so the
frontend can navigate away rather than block on a modal. This module is
where that background task reports live progress, and where
GET /api/orchestrator/run/{run_id} reads it back from.

State lives in a process-local dict, not the database — it's short-lived
UI progress for a single run, not a record worth persisting. A single
gunicorn worker is assumed (see gunicorn/dev.py, gunicorn/prod.py); this
would need a shared store (Redis, etc.) behind multiple workers.
"""

import threading
import time
import uuid

_LOCK = threading.Lock()
_RUNS: dict[str, dict] = {}
_MAX_TRACKED_RUNS = 50


def _looks_like_step(value: object) -> bool:
    return (
        isinstance(value, dict)
        and isinstance(value.get("stepName"), str)
        and isinstance(value.get("outputs"), dict)
    )


def _find_steps(payload: object, depth: int = 0) -> list[dict]:
    """Auto's event shape isn't fixed — walk the payload for whichever array
    looks like a step list (mirrors frontend/src/lib/auto-run-steps.ts)."""
    if depth > 6 or not isinstance(payload, (dict, list)):
        return []

    if isinstance(payload, list):
        if payload and all(_looks_like_step(item) for item in payload):
            return payload
        for item in payload:
            found = _find_steps(item, depth + 1)
            if found:
                return found
        return []

    for value in payload.values():
        if isinstance(value, list) and value and all(_looks_like_step(item) for item in value):
            return value
    for value in payload.values():
        found = _find_steps(value, depth + 1)
        if found:
            return found
    return []


def create_run() -> str:
    run_id = uuid.uuid4().hex
    with _LOCK:
        _RUNS[run_id] = {
            "status": "running",
            "current_step": None,
            "steps": [],
            "result": None,
            "error": None,
            "started_at": time.time(),
        }
        if len(_RUNS) > _MAX_TRACKED_RUNS:
            oldest_id = min(_RUNS, key=lambda k: _RUNS[k]["started_at"])
            _RUNS.pop(oldest_id, None)
    return run_id


def get_run(run_id: str) -> dict | None:
    with _LOCK:
        run = _RUNS.get(run_id)
        return dict(run) if run is not None else None


def update_step(run_id: str, event: dict) -> None:
    steps = _find_steps(event)
    if not steps:
        return
    with _LOCK:
        run = _RUNS.get(run_id)
        if run is None:
            return
        run["steps"] = steps
        run["current_step"] = steps[-1]


def complete_run(run_id: str, result: dict) -> None:
    with _LOCK:
        run = _RUNS.get(run_id)
        if run is None:
            return
        run["status"] = "completed"
        run["result"] = result
        run["current_step"] = None


def fail_run(run_id: str, error: str) -> None:
    with _LOCK:
        run = _RUNS.get(run_id)
        if run is None:
            return
        run["status"] = "failed"
        run["error"] = error
        run["current_step"] = None
