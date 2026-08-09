// Shared types for the Command Center — mirrors app/schemas/*.py

export interface PolicyField {
  key: string
  label: string
  value: string | null
}

export interface PolicyOut {
  name: string
  description: string
  fields: PolicyField[]
}

export interface PolicyEvaluation {
  evaluation_id: string
  run_id: string | null
  employee_id: string
  policy_name: string
  threshold_used: string | null
  actual_value: string | null
  passed: boolean
  contributed_to_escalation: boolean
  evaluated_at: string
}

export interface WorkbenchResolution {
  resolution_id: string
  item_type: string
  employee_id: string | null
  form_url: string | null
  decision: string
  reviewer_notes: string | null
  resolved_by: string | null
  resolved_at: string
  raw_payload: Record<string, unknown> | null
}

export type InsightType = 'pattern' | 'anomaly' | 'recommendation'
export type InsightSeverity = 'critical' | 'warning' | 'info'

export interface Insight {
  id: string
  insight_type: InsightType
  severity: InsightSeverity
  title: string
  description: string
  supporting_data: Record<string, unknown> | null
  action_path: string | null
  generated_at: string
}

export interface DashboardSummary {
  total_hires: number
  on_track_count: number
  at_risk_count: number
  tasks_completion_pct: number
  recent_workbench_resolutions: number
  active_policies: number
  last_run_at: string | null
}

export interface ActivityPoint {
  bucket: string
  evaluations: number
  fired: number
  escalations: number
}

export interface DashboardActivity {
  points: ActivityPoint[]
}

export type IntegrationCategory = 'system_of_record' | 'channel' | 'ai_model' | 'orchestrator'
export type IntegrationStatus = 'healthy' | 'degraded' | 'down' | 'unknown'

export interface IntegrationHealth {
  id: string
  system_name: string
  category: IntegrationCategory
  used_for: string | null
  status: IntegrationStatus
  detail: string | null
  last_checked: string
}

export interface OrchestratorRunRequest {
  employee_id?: string
  hr_slack_channel?: string
  sensitive_category_labels?: string
  normal_category_labels?: string
}

export interface OrchestratorRunStarted {
  run_id: string
}

export interface OrchestratorStep {
  id?: string
  stepName?: string
  stepDescription?: string
  status?: string
  outputs?: {
    output?: string
    error?: string
  }
}

// Mirrors app/services/orchestrator_runs.py. `result` is passed through from
// Auto's own API response — shape isn't fully known/owned by this app, so it
// stays permissive rather than over-constrained.
export interface OrchestratorRunStatus {
  status: 'running' | 'completed' | 'failed'
  current_step: OrchestratorStep | null
  steps: OrchestratorStep[]
  result: Record<string, unknown> | null
  error: string | null
}
