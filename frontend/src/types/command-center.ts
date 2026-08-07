// Shared types for the Command Center — mirrors app/schemas/*.py

export type PolicyAction = 'escalate' | 'notify' | 'suppress'

export interface PolicyConfig {
  metric: string
  operator: '>' | '<' | '>=' | '<=' | '==' | '!='
  value: number | string | boolean
  action: PolicyAction
  route?: string | null
}

export interface Policy {
  id: string
  name: string
  description: string | null
  policy_type: 'threshold' | 'rule' | 'natural_language'
  config: PolicyConfig
  active: boolean
  locked: boolean
  flagged_for_review: boolean
  created_at: string
  updated_at: string
  execution_count: number
  fired_count: number
  last_evaluated_at: string | null
}

export interface PolicyEvaluation {
  id: string
  policy_id: string
  run_id: string | null
  employee_id: string
  input_value: { metric: string; actual: unknown; operator: string; threshold: unknown } | null
  fired: boolean
  action_taken: string | null
  evaluated_at: string
}

export type WorkbenchItemType = 'at_risk_escalation' | 'disclosure' | 'validation_failure'
export type WorkbenchStatus = 'pending' | 'approved' | 'rejected' | 'modified'

export interface WorkbenchItem {
  id: string
  employee_id: string
  item_type: WorkbenchItemType
  policy_id: string | null
  context: {
    hire?: { full_name: string; location: string | null; job_family: string | null; manager: string | null; cohort: string | null; start_date?: string | null }
    metric?: string
    actual_value?: unknown
    threshold?: { operator: string; value: unknown }
    policy_name?: string
  }
  ai_recommendation: string | null
  status: WorkbenchStatus
  resolution_notes: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
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
  escalated_count: number
  tasks_completion_pct: number
  day90_retention_rate: number
  open_workbench_items: number
  active_policies: number
  total_runs: number
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

export interface Hire {
  id: string
  employee_id: string
  full_name: string
  location: string | null
  job_family: string | null
  manager: string | null
  cohort: string | null
  start_date: string
  day90_date: string
  tasks_total: number
  tasks_completed: number
  overdue_task_count: number
  days_until_work_auth_expiry: number | null
  disclosure_found: boolean
  days_since_last_notification: number | null
  learning_milestone_overdue_days: number
  risk_state: 'on_track' | 'at_risk' | 'escalated'
  retained: boolean | null
  created_at: string
  updated_at: string
}

export interface OrchestratorRunSummary {
  run_id: string
  hires_processed: number
  policies_fired: number
  escalations_created: number
  summary: string
  finished_at: string
}
