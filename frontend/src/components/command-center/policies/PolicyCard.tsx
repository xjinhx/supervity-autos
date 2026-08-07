'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Icons } from '@/components/ui/icons'
import { conditionSummary } from '@/lib/policy-metrics'
import type { Policy } from '@/types/command-center'

const ACTION_LABEL: Record<string, string> = {
  escalate: 'Escalates to Workbench',
  notify: 'Notifies only',
  suppress: 'Suppresses notification',
}

interface PolicyCardProps {
  policy: Policy
  onToggleActive: (policy: Policy) => void
  onEdit: (policy: Policy) => void
  onDelete: (policy: Policy) => void
  onViewLog: (policy: Policy) => void
  isToggling?: boolean
}

export function PolicyCard({ policy, onToggleActive, onEdit, onDelete, onViewLog, isToggling }: PolicyCardProps) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <Card className="relative h-full overflow-hidden">
        <CardContent className="relative z-10 flex h-full flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-display text-base font-semibold text-brand-navy">{policy.name}</h3>
                {policy.locked && (
                  <span title="Locked compliance rule — not editable" className="inline-flex items-center gap-1 rounded-full bg-brand-navy/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-navy">
                    <Icons.lock className="h-3 w-3" strokeWidth={2} />
                    Locked
                  </span>
                )}
                {policy.flagged_for_review && (
                  <span title="Manually corrected 3+ times in 7 days" className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                    <Icons.flag className="h-3 w-3" strokeWidth={2} />
                    Review
                  </span>
                )}
              </div>
              {policy.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{policy.description}</p>}
            </div>
            <Switch
              checked={policy.active}
              disabled={policy.locked || isToggling}
              onCheckedChange={() => onToggleActive(policy)}
            />
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="font-mono text-xs text-brand-navy">
              WHEN <span className="font-semibold">{conditionSummary(policy.config)}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{ACTION_LABEL[policy.config.action] ?? policy.config.action}
              {policy.config.route ? ` → ${policy.config.route}` : ''}
            </p>
          </div>

          <div className="mt-auto flex items-center justify-between pt-1">
            <button
              onClick={() => onViewLog(policy)}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-cornflower hover:text-brand-navy"
            >
              <Icons.history className="h-3.5 w-3.5" />
              {policy.execution_count} evaluation{policy.execution_count === 1 ? '' : 's'} · {policy.fired_count} fired
            </button>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => onEdit(policy)} disabled={policy.locked} title={policy.locked ? 'Locked compliance rule' : 'Edit'}>
                <Icons.pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => onDelete(policy)} disabled={policy.locked} className={cn(!policy.locked && 'hover:text-red-600')} title={policy.locked ? 'Locked compliance rule' : 'Delete'}>
                <Icons.trash className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
