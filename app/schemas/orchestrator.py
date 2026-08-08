# app/schemas/orchestrator.py
from pydantic import BaseModel


class OrchestratorRunRequest(BaseModel):
    employee_id: str | None = None
    hr_slack_channel: str | None = None
    sensitive_category_labels: str | None = None
    normal_category_labels: str | None = None
