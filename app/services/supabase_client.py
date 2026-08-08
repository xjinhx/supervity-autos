# app/services/supabase_client.py
"""
Thin REST client over Supabase's PostgREST API — the real domain data
(config, policy_evaluations, workbench_resolutions, Workers, hire_risk_state,
Onboarding_Tasks) that the Operators on auto.supervity.ai already read/write.

No ORM, no supabase-py — just httpx against `${SUPABASE_URL}/rest/v1/...`,
matching the plain-request style already used for external systems in
integrations.py. Credentials are read lazily per call (not at import time) so
the app still boots with them unset; calling any of these functions without
SUPABASE_URL/SUPABASE_KEY configured raises a clear 503 instead of crashing.
"""

import logging
import os
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import HTTPException

log = logging.getLogger(__name__)

REQUEST_TIMEOUT = 10


def _base_and_headers() -> tuple[str, dict[str, str]]:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=503, detail="Supabase not configured (SUPABASE_URL / SUPABASE_KEY unset)")
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
    }
    return supabase_url.rstrip("/") + "/rest/v1", headers


def _select(table: str, params: dict[str, Any]) -> list[dict]:
    base, headers = _base_and_headers()
    resp = httpx.get(f"{base}/{table}", headers=headers, params=params, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def _count(table: str, params: dict[str, Any]) -> int:
    base, headers = _base_and_headers()
    headers = {**headers, "Prefer": "count=exact"}
    params = {**params, "select": params.get("select", "*")}
    resp = httpx.get(f"{base}/{table}", headers=headers, params={**params, "limit": 1}, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    content_range = resp.headers.get("content-range", "")  # e.g. "0-0/42"
    if "/" in content_range:
        total = content_range.split("/")[-1]
        if total.isdigit():
            return int(total)
    return len(resp.json())


def _upsert(table: str, row: dict[str, Any], on_conflict: str) -> dict:
    base, headers = _base_and_headers()
    headers = {**headers, "Prefer": "resolution=merge-duplicates,return=representation"}
    resp = httpx.post(
        f"{base}/{table}",
        headers=headers,
        params={"on_conflict": on_conflict},
        json=[row],
        timeout=REQUEST_TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    return data[0] if data else row


def get_config_values(keys: list[str]) -> dict[str, str | None]:
    if not keys:
        return {}
    rows = _select("config", {"key": f"in.({','.join(keys)})", "select": "key,value"})
    values: dict[str, str | None] = {key: None for key in keys}
    for row in rows:
        values[row["key"]] = row.get("value")
    return values


def upsert_config_value(key: str, value: str) -> dict:
    return _upsert("config", {"key": key, "value": value}, on_conflict="key")


def list_policy_evaluations(
    policy_name: str | None = None, employee_id: str | None = None, limit: int = 50
) -> list[dict]:
    params: dict[str, Any] = {"order": "evaluated_at.desc", "limit": limit}
    if policy_name:
        params["policy_name"] = f"eq.{policy_name}"
    if employee_id:
        params["employee_id"] = f"eq.{employee_id}"
    return _select("policy_evaluations", params)


def list_policy_evaluations_since(since: datetime, limit: int = 5000) -> list[dict]:
    since_iso = since.astimezone(timezone.utc).isoformat()
    return _select(
        "policy_evaluations",
        {
            "evaluated_at": f"gte.{since_iso}",
            "select": "evaluated_at,passed,contributed_to_escalation",
            "order": "evaluated_at.asc",
            "limit": limit,
        },
    )


def list_workbench_resolutions(item_type: str | None = None, limit: int = 100) -> list[dict]:
    params: dict[str, Any] = {"order": "resolved_at.desc", "limit": limit}
    if item_type:
        params["item_type"] = f"eq.{item_type}"
    return _select("workbench_resolutions", params)


def get_workbench_resolution(resolution_id: str) -> dict | None:
    rows = _select("workbench_resolutions", {"resolution_id": f"eq.{resolution_id}", "limit": 1})
    return rows[0] if rows else None


def count_workers() -> int:
    return _count("Workers", {"select": "Employee_ID"})


def count_hire_risk_state(last_decision: str) -> int:
    return _count("hire_risk_state", {"last_decision": f"eq.{last_decision}", "select": "Employee_ID"})


def count_onboarding_tasks(completed: bool | None = None) -> int:
    params: dict[str, Any] = {"select": "Event_ID"}
    if completed is True:
        params["Completed_Date"] = "not.is.null"
    elif completed is False:
        params["Completed_Date"] = "is.null"
    return _count("Onboarding_Tasks", params)


def count_recent_workbench_resolutions(since: datetime) -> int:
    since_iso = since.astimezone(timezone.utc).isoformat()
    return _count("workbench_resolutions", {"resolved_at": f"gte.{since_iso}", "select": "resolution_id"})


def latest_policy_evaluation_at() -> datetime | None:
    rows = _select("policy_evaluations", {"select": "evaluated_at", "order": "evaluated_at.desc", "limit": 1})
    if not rows:
        return None
    return datetime.fromisoformat(rows[0]["evaluated_at"])


def list_at_risk_workers_joined() -> list[dict]:
    """hire_risk_state rows with last_decision='at_risk', joined against Workers
    in Python (small result sets — mirrors the app's existing "bucket in
    Python, not SQL" style rather than relying on PostgREST embed syntax).
    """
    risk_rows = _select("hire_risk_state", {"last_decision": "eq.at_risk", "select": "Employee_ID"})
    employee_ids = [row["Employee_ID"] for row in risk_rows if row.get("Employee_ID")]
    if not employee_ids:
        return []
    workers = _select(
        "Workers",
        {
            "Employee_ID": f"in.({','.join(employee_ids)})",
            "select": "Employee_ID,Location,Job_Family,Manager_Name",
        },
    )
    return workers
