'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/ui/icons'
import { MilestoneTrack } from '@/components/command-center/ProgressRing'
import type { WorkbenchItem } from '@/types/command-center'

const ITEM_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  at_risk_escalation: { label: 'At-Risk Escalation', bg: 'bg-amber-50', text: 'text-amber-700', icon: Icons.alertTriangle },
  disclosure: { label: 'Confidential Disclosure', bg: 'bg-red-50', text: 'text-red-700', icon: Icons.lock },
  validation_failure: { label: 'Compliance Deadline', bg: 'bg-blue-50', text: 'text-blue-700', icon: Icons.alertCircle },
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pending', bg: 'bg-brand-cornflower/10', text: 'text-brand-navy' },
  approved: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  rejected: { label: 'Rejected', bg: 'bg-gray-100', text: 'text-gray-600' },
  modified: { label: 'Modified', bg: 'bg-purple-50', text: 'text-purple-700' },
}

interface WorkbenchItemCardProps {
  item: WorkbenchItem
  onResolve: (item: WorkbenchItem, action: 'approve' | 'reject' | 'modify') => void
}

export function WorkbenchItemCard({ item, onResolve }: WorkbenchItemCardProps) {
  const typeCfg = ITEM_TYPE_CONFIG[item.item_type] ?? ITEM_TYPE_CONFIG.at_risk_escalation
  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending
  const TypeIcon = typeCfg.icon
  const hire = item.context?.hire
  const hireStartDate = hire?.start_date ?? null

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
      <Card className={cn('relative overflow-hidden', item.item_type === 'disclosure' && 'ring-1 ring-red-200')}>
        <CardContent className="relative z-10 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', typeCfg.bg, typeCfg.text)}>
                  <TypeIcon className="h-3.5 w-3.5" strokeWidth={2} />
                  {typeCfg.label}
                </span>
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', statusCfg.bg, statusCfg.text)}>{statusCfg.label}</span>
                <span className="font-mono text-xs text-muted-foreground">{item.employee_id}</span>
              </div>

              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <p className="font-display text-base font-semibold text-brand-navy">{hire?.full_name ?? item.employee_id}</p>
                {hire && (
                  <p className="text-xs text-muted-foreground">
                    {hire.job_family} · {hire.location} · reports to {hire.manager}
                  </p>
                )}
              </div>

              {hireStartDate && (
                <MilestoneTrack
                  className="mt-3 max-w-xs"
                  daysElapsed={Math.floor((Date.now() - new Date(hireStartDate).getTime()) / 86400000)}
                  riskState={item.item_type === 'disclosure' ? 'escalated' : 'at_risk'}
                />
              )}

              {item.ai_recommendation && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                  <Icons.sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-cornflower" strokeWidth={1.5} />
                  <p className="text-sm text-foreground">{item.ai_recommendation}</p>
                </div>
              )}

              {item.status !== 'pending' && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {statusCfg.label} by {item.resolved_by} {item.resolved_at ? `· ${new Date(item.resolved_at).toLocaleString()}` : ''}
                  {item.resolution_notes ? ` — "${item.resolution_notes}"` : ''}
                </p>
              )}
            </div>

            {item.status === 'pending' && (
              <div className="flex shrink-0 items-center gap-1.5">
                <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => onResolve(item, 'approve')}>
                  <Icons.thumbsUp className="mr-1.5 h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => onResolve(item, 'modify')}>
                  <Icons.pencil className="mr-1.5 h-3.5 w-3.5" />
                  Modify
                </Button>
                <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => onResolve(item, 'reject')}>
                  <Icons.thumbsDown className="mr-1.5 h-3.5 w-3.5" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
