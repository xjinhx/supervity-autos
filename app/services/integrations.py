# app/services/integrations.py
"""
Data Manager health checks — real pings, not hardcoded "healthy".

Each system is checked against actual configuration/connectivity:
  - Postgres (system of record): a live `SELECT 1` against this app's own DB.
  - Slack (channel): `auth.test` if SLACK_BOT_TOKEN is configured.
  - Auto / auto.supervity.ai (orchestrator): a lightweight GET if AUTO_API_BASE_URL
    + AUTO_API_KEY are configured.
  - OneDrive (channel): token/config presence check.

If credentials for a system aren't configured in this environment, that is
reported honestly as "degraded" with a reason — never faked as healthy.
"""

import logging
import os

import requests
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..models.integration import IntegrationHealth

log = logging.getLogger(__name__)

REQUEST_TIMEOUT = 5


def _check_postgres(db: Session) -> tuple[str, str]:
    try:
        db.execute(text("SELECT 1"))
        return "healthy", "Live query succeeded."
    except Exception as e:  # noqa: BLE001
        return "down", f"Query failed: {e}"


def _check_slack() -> tuple[str, str]:
    token = os.getenv("SLACK_BOT_TOKEN")
    if not token:
        return "degraded", "SLACK_BOT_TOKEN not configured — escalation routing to #hr-disclosures is inactive."
    try:
        resp = requests.post(
            "https://slack.com/api/auth.test",
            headers={"Authorization": f"Bearer {token}"},
            timeout=REQUEST_TIMEOUT,
        )
        data = resp.json()
        if data.get("ok"):
            return "healthy", f"Authenticated as {data.get('user', 'bot')} in {data.get('team', 'workspace')}."
        return "down", f"Slack auth.test failed: {data.get('error', 'unknown error')}"
    except Exception as e:  # noqa: BLE001
        return "down", f"Slack request failed: {e}"


def _check_auto_orchestrator() -> tuple[str, str]:
    base_url = os.getenv("AUTO_API_BASE_URL")
    api_key = os.getenv("AUTO_API_KEY")
    if not base_url or not api_key:
        return "degraded", "AUTO_API_BASE_URL / AUTO_API_KEY not configured — Orchestrator webhook not verified."
    try:
        resp = requests.get(
            base_url.rstrip("/") + "/health",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=REQUEST_TIMEOUT,
        )
        if resp.ok:
            return "healthy", "Auto orchestration endpoint reachable."
        return "degraded", f"Auto endpoint returned HTTP {resp.status_code}."
    except Exception as e:  # noqa: BLE001
        return "down", f"Auto endpoint unreachable: {e}"


def _check_onedrive() -> tuple[str, str]:
    client_id = os.getenv("ONEDRIVE_CLIENT_ID")
    client_secret = os.getenv("ONEDRIVE_CLIENT_SECRET")
    if not client_id or not client_secret:
        return "degraded", "ONEDRIVE_CLIENT_ID / ONEDRIVE_CLIENT_SECRET not configured — document sync inactive."
    return "healthy", "OneDrive app credentials configured."


_CHECKS = {
    "Postgres (App DB)": ("system_of_record", "Hires, policies, workbench, insights, audit trail", lambda db: _check_postgres(db)),
    "Slack": ("channel", "Escalation + notification routing (#hr-disclosures, manager DMs)", lambda db: _check_slack()),
    "Auto (auto.supervity.ai)": ("orchestrator", "Orchestrator + 10 Operators — lead onboarding automation", lambda db: _check_auto_orchestrator()),
    "OneDrive": ("channel", "Onboarding document storage + sync", lambda db: _check_onedrive()),
}


def run_health_checks(db: Session) -> list[IntegrationHealth]:
    results = []
    for system_name, (category, used_for, check_fn) in _CHECKS.items():
        status, detail = check_fn(db)
        row = db.query(IntegrationHealth).filter(IntegrationHealth.system_name == system_name).first()
        if row is None:
            row = IntegrationHealth(system_name=system_name, category=category, used_for=used_for)
        row.status = status
        row.detail = detail
        row.category = category
        row.used_for = used_for
        db.add(row)
        results.append(row)
    db.commit()
    for row in results:
        db.refresh(row)
    return results
