// Known hire metrics a threshold policy can be built against.
// Keeping this list in one place is what makes the policy editor "no code" —
// business users pick from real fields instead of typing JSON.
export const POLICY_METRICS = [
  { value: 'overdue_task_count', label: 'Overdue task count', unit: 'tasks' },
  { value: 'days_until_work_auth_expiry', label: 'Days until work auth expiry', unit: 'days' },
  { value: 'days_since_last_notification', label: 'Days since last notification', unit: 'days' },
  { value: 'learning_milestone_overdue_days', label: 'Learning milestone overdue', unit: 'days' },
  { value: 'disclosure_found', label: 'Disclosure found', unit: 'bool' },
] as const

export const POLICY_OPERATORS: { value: string; label: string }[] = [
  { value: '>', label: 'greater than' },
  { value: '<', label: 'less than' },
  { value: '>=', label: 'at least' },
  { value: '<=', label: 'at most' },
  { value: '==', label: 'equals' },
  { value: '!=', label: 'not equal to' },
]

export const POLICY_ACTIONS: { value: string; label: string }[] = [
  { value: 'escalate', label: 'Escalate to Workbench' },
  { value: 'notify', label: 'Notify only' },
  { value: 'suppress', label: 'Suppress' },
]

export function metricLabel(metric: string): string {
  return POLICY_METRICS.find((m) => m.value === metric)?.label ?? metric
}

export function metricUnit(metric: string): string {
  return POLICY_METRICS.find((m) => m.value === metric)?.unit ?? ''
}

export function conditionSummary(config: { metric: string; operator: string; value: unknown }): string {
  const opLabel = POLICY_OPERATORS.find((o) => o.value === config.operator)?.label ?? config.operator
  return `${metricLabel(config.metric)} ${opLabel} ${String(config.value)}`
}
