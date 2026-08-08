# app/services/ai_chat.py
"""
AI Manager — a grounded conversational surface over the Command Center.

Every factual tool below is a thin wrapper around the same functions the
Command Center's own REST endpoints call (policies/workbench/dashboard/
insights routers, auto_client) — the assistant never queries anything the
UI itself couldn't show, and never invents data. run_orchestrator is the one
tool with a real side effect: triggering the actual Auto workflow.
"""

import json
import logging
import os

import anthropic
from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models.insight import Insight as InsightModel
from ..routers import dashboard as dashboard_router
from ..routers import policies as policies_router
from ..routers import workbench as workbench_router
from ..schemas.insight import Insight as InsightSchema
from ..services import auto_client
from ..services.insights import generate_insights

log = logging.getLogger(__name__)

MODEL = "claude-opus-5"
MAX_TOKENS = 4096
MAX_TOOL_ITERATIONS = 6

SYSTEM_PROMPT = """You are PulseWise AI, the conversational assistant embedded in this HR onboarding \
Command Center. The real work — evaluating hires against policies, escalating exceptions, notifying \
Slack — is done by an Orchestrator and its Operators running on Auto (auto.supervity.ai); this Command \
Center is the human-facing view over that operation, backed by Supabase.

Ground every factual claim in a tool call — hires, policy thresholds, evaluations, workbench \
resolutions, and insights are all real data behind these tools. Never invent numbers, employee \
details, or policy values. If a tool call fails or a question can't be answered from the available \
tools, say so plainly rather than guessing.

Only call run_orchestrator when the user has clearly asked you to trigger or re-run the Orchestrator — \
never speculatively. It triggers a real workflow run that takes a few minutes and has real side effects \
(Slack messages, live policy evaluations), so tell the user it's starting and that they can also watch \
the Dashboard for results.

The user is currently viewing: {page}"""

TOOLS = [
    {
        "name": "get_dashboard_summary",
        "description": "Get the current Dashboard KPIs: hire counts, on-track/at-risk counts, task "
        "completion %, recent workbench resolutions, active policy count, and last activity time.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "list_policies",
        "description": "List the AI Policies and their current threshold values as configured right now.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "list_policy_evaluations",
        "description": "List real policy evaluation log entries (pass/fail decisions the Operators made), "
        "optionally filtered by policy name or employee ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "policy_name": {"type": "string", "description": "Exact policy_name to filter by, if known"},
                "employee_id": {"type": "string", "description": "Employee ID to filter by, if known"},
                "limit": {"type": "integer", "description": "Max rows to return, default 20"},
            },
            "additionalProperties": False,
        },
    },
    {
        "name": "list_workbench_resolutions",
        "description": "List real Workbench resolutions (exceptions a human already resolved in Auto), "
        "optionally filtered by item type.",
        "input_schema": {
            "type": "object",
            "properties": {
                "item_type": {"type": "string", "description": "Item type to filter by, if known"},
                "limit": {"type": "integer", "description": "Max rows to return, default 20"},
            },
            "additionalProperties": False,
        },
    },
    {
        "name": "list_insights",
        "description": "List the currently generated AI Insights (patterns/anomalies/recommendations "
        "computed from real data), optionally filtered by severity.",
        "input_schema": {
            "type": "object",
            "properties": {
                "severity": {"type": "string", "enum": ["critical", "warning", "info"]},
            },
            "additionalProperties": False,
        },
    },
    {
        "name": "generate_insights",
        "description": "Recompute AI Insights from the latest real data. Use when the user asks to "
        "refresh, regenerate, or re-run insights.",
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "run_orchestrator",
        "description": "Trigger a real Orchestrator run on Auto. Only call this when the user explicitly "
        "asks to run, trigger, or re-run the orchestrator. Takes a few minutes.",
        "input_schema": {
            "type": "object",
            "properties": {
                "employee_id": {"type": "string", "description": "Optional — scope the run to one employee"},
                "hr_slack_channel": {"type": "string", "description": "Optional override, e.g. #hr-escalations"},
                "sensitive_category_labels": {"type": "string", "description": "Optional override"},
                "normal_category_labels": {"type": "string", "description": "Optional override"},
            },
            "additionalProperties": False,
        },
    },
]


def _execute_tool(name: str, tool_input: dict, db: Session) -> str:
    if name == "get_dashboard_summary":
        return json.dumps(dashboard_router.get_summary().model_dump(mode="json"))
    if name == "list_policies":
        return json.dumps([p.model_dump(mode="json") for p in policies_router.list_policies()])
    if name == "list_policy_evaluations":
        rows = policies_router.list_evaluations(
            policy_name=tool_input.get("policy_name"),
            employee_id=tool_input.get("employee_id"),
            limit=tool_input.get("limit", 20),
        )
        return json.dumps([r.model_dump(mode="json") for r in rows])
    if name == "list_workbench_resolutions":
        rows = workbench_router.list_workbench_resolutions(
            item_type=tool_input.get("item_type"),
            limit=tool_input.get("limit", 20),
        )
        return json.dumps([r.model_dump(mode="json") for r in rows])
    if name == "list_insights":
        severity = tool_input.get("severity")
        q = db.query(InsightModel)
        if severity:
            q = q.filter(InsightModel.severity == severity)
        rows = q.order_by(InsightModel.generated_at.desc()).all()
        return json.dumps([InsightSchema.model_validate(r).model_dump(mode="json") for r in rows])
    if name == "generate_insights":
        rows = generate_insights(db)
        return json.dumps([InsightSchema.model_validate(r).model_dump(mode="json") for r in rows])
    if name == "run_orchestrator":
        result = auto_client.trigger_orchestrator_run(
            employee_id=tool_input.get("employee_id"),
            hr_slack_channel=tool_input.get("hr_slack_channel"),
            sensitive_category_labels=tool_input.get("sensitive_category_labels"),
            normal_category_labels=tool_input.get("normal_category_labels"),
        )
        return json.dumps(result)[:4000]
    raise ValueError(f"Unknown tool: {name}")


def run_chat(message: str, history: list[dict], context: dict, db: Session) -> tuple[str, list[dict]]:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI Manager not configured (ANTHROPIC_API_KEY unset)")

    client = anthropic.Anthropic(api_key=api_key)
    system = SYSTEM_PROMPT.format(page=context.get("page") or "unknown")
    messages = [*history, {"role": "user", "content": message}]
    tool_calls: list[dict] = []

    for _ in range(MAX_TOOL_ITERATIONS):
        try:
            response = client.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=system,
                tools=TOOLS,
                messages=messages,
            )
        except anthropic.APIError as e:
            raise HTTPException(status_code=502, detail=f"AI Manager request failed: {e}") from e

        if response.stop_reason != "tool_use":
            text = next((b.text for b in response.content if b.type == "text"), "")
            return text, tool_calls

        messages.append({"role": "assistant", "content": response.content})
        tool_results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            try:
                result = _execute_tool(block.name, block.input, db)
                is_error = False
            except HTTPException as e:
                result = e.detail
                is_error = True
            except Exception as e:  # noqa: BLE001
                log.exception("AI Manager tool '%s' failed", block.name)
                result = f"Tool failed: {e}"
                is_error = True

            tool_calls.append({"id": block.id, "name": block.name, "args": block.input, "result": result})
            tool_results.append(
                {"type": "tool_result", "tool_use_id": block.id, "content": result, "is_error": is_error}
            )
        messages.append({"role": "user", "content": tool_results})

    return "I wasn't able to finish that within the allowed number of steps — try narrowing the question.", tool_calls
