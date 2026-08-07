"""Add command center tables (hires, policies, workbench, insights, integrations, runs)

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2026-08-07 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "d4e5f6g7h8i9"
down_revision: Union[str, None] = "c3d4e5f6g7h8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Required for gen_random_uuid()
    op.execute('CREATE EXTENSION IF NOT EXISTS pgcrypto')

    # -------------------------------------------------------------------
    # orchestrator_runs — one row per Orchestrator batch run (real or simulated)
    # -------------------------------------------------------------------
    op.create_table(
        "orchestrator_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("trigger", sa.String(length=50), nullable=False, server_default="manual"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="completed"),
        sa.Column("hires_processed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("policies_fired", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("escalations_created", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # -------------------------------------------------------------------
    # hires — the onboarding cohort this Command Center tracks
    # -------------------------------------------------------------------
    op.create_table(
        "hires",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("employee_id", sa.String(length=50), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("location", sa.String(length=100), nullable=True),
        sa.Column("job_family", sa.String(length=100), nullable=True),
        sa.Column("manager", sa.String(length=100), nullable=True),
        sa.Column("cohort", sa.String(length=50), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("day90_date", sa.Date(), nullable=False),
        sa.Column("tasks_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tasks_completed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("overdue_task_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("days_until_work_auth_expiry", sa.Integer(), nullable=True),
        sa.Column("disclosure_found", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("days_since_last_notification", sa.Integer(), nullable=True),
        sa.Column("learning_milestone_overdue_days", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("risk_state", sa.String(length=20), nullable=False, server_default="on_track"),
        sa.Column("retained", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_hires_employee_id"), "hires", ["employee_id"], unique=True)

    # -------------------------------------------------------------------
    # policies — DB-backed, business-editable rules engine
    # -------------------------------------------------------------------
    op.create_table(
        "policies",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("policy_type", sa.String(length=30), nullable=False, server_default="threshold"),
        sa.Column("config", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("locked", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("flagged_for_review", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # -------------------------------------------------------------------
    # policy_evaluations — audit trail: every fire / no-fire decision
    # -------------------------------------------------------------------
    op.create_table(
        "policy_evaluations",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("policy_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("run_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("employee_id", sa.String(length=50), nullable=False),
        sa.Column("input_value", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("fired", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("action_taken", sa.String(length=50), nullable=True),
        sa.Column("evaluated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["policy_id"], ["policies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["run_id"], ["orchestrator_runs.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_policy_evaluations_policy_id"), "policy_evaluations", ["policy_id"], unique=False)
    op.create_index(op.f("ix_policy_evaluations_employee_id"), "policy_evaluations", ["employee_id"], unique=False)

    # -------------------------------------------------------------------
    # workbench_items — exception queue for human-in-the-loop resolution
    # -------------------------------------------------------------------
    op.create_table(
        "workbench_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("employee_id", sa.String(length=50), nullable=False),
        sa.Column("item_type", sa.String(length=50), nullable=False),
        sa.Column("policy_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("context", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("ai_recommendation", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        sa.Column("resolved_by", sa.String(length=255), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["policy_id"], ["policies.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_workbench_items_status"), "workbench_items", ["status"], unique=False)
    op.create_index(op.f("ix_workbench_items_employee_id"), "workbench_items", ["employee_id"], unique=False)

    # -------------------------------------------------------------------
    # workbench_corrections — bonus self-learning signal from human "modify" actions
    # -------------------------------------------------------------------
    op.create_table(
        "workbench_corrections",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("workbench_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("policy_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("original_recommendation", sa.Text(), nullable=True),
        sa.Column("corrected_action", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["workbench_item_id"], ["workbench_items.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["policy_id"], ["policies.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    # -------------------------------------------------------------------
    # insights — computed observations
    # -------------------------------------------------------------------
    op.create_table(
        "insights",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("insight_type", sa.String(length=30), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False, server_default="info"),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("supporting_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("action_path", sa.Text(), nullable=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # -------------------------------------------------------------------
    # integration_health — Data Manager registry
    # -------------------------------------------------------------------
    op.create_table(
        "integration_health",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("system_name", sa.String(length=100), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("used_for", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="unknown"),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("last_checked", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # -------------------------------------------------------------------
    # link orchestrator_runs -> hires processed is derived, no FK needed
    # -------------------------------------------------------------------


def downgrade() -> None:
    op.drop_table("integration_health")
    op.drop_table("insights")
    op.drop_table("workbench_corrections")
    op.drop_index(op.f("ix_workbench_items_employee_id"), table_name="workbench_items")
    op.drop_index(op.f("ix_workbench_items_status"), table_name="workbench_items")
    op.drop_table("workbench_items")
    op.drop_index(op.f("ix_policy_evaluations_employee_id"), table_name="policy_evaluations")
    op.drop_index(op.f("ix_policy_evaluations_policy_id"), table_name="policy_evaluations")
    op.drop_table("policy_evaluations")
    op.drop_table("policies")
    op.drop_index(op.f("ix_hires_employee_id"), table_name="hires")
    op.drop_table("hires")
    op.drop_table("orchestrator_runs")
