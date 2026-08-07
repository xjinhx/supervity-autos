import { cn } from '@/lib/utils'
import { Icons } from '@/components/ui/icons'

// Single source of truth for risk-state color mapping — reused across
// Dashboard, Workbench, and employee-level views so the meaning stays fixed:
// on-track = calm brand blue, at-risk = amber, escalated = restrained red.
export type RiskState = 'on_track' | 'at_risk' | 'escalated'

const RISK_CONFIG: Record<RiskState, { label: string; dot: string; text: string; bg: string; icon: React.ElementType }> = {
  on_track: { label: 'On Track', dot: 'bg-brand-cornflower', text: 'text-brand-navy', bg: 'bg-brand-cornflower/10', icon: Icons.checkCircle },
  at_risk: { label: 'At Risk', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', icon: Icons.alertTriangle },
  escalated: { label: 'Escalated', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', icon: Icons.alertCircle },
}

export function riskConfig(state: RiskState) {
  return RISK_CONFIG[state] ?? RISK_CONFIG.on_track
}

export function RiskBadge({ state, className }: { state: RiskState; className?: string }) {
  const cfg = riskConfig(state)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        cfg.bg,
        cfg.text,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}
