'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Icons } from '@/components/ui/icons'
import type { WorkbenchResolution } from '@/types/command-center'

const ITEM_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  at_risk_escalation: { label: 'At-Risk Escalation', bg: 'bg-amber-50', text: 'text-amber-700', icon: Icons.alertTriangle },
  disclosure: { label: 'Confidential Disclosure', bg: 'bg-red-50', text: 'text-red-700', icon: Icons.lock },
  validation_failure: { label: 'Compliance Deadline', bg: 'bg-blue-50', text: 'text-blue-700', icon: Icons.alertCircle },
}

const DEFAULT_TYPE_CONFIG = { label: 'Workbench Item', bg: 'bg-brand-cornflower/10', text: 'text-brand-navy', icon: Icons.workbench }

interface WorkbenchItemCardProps {
  item: WorkbenchResolution
}

export function WorkbenchItemCard({ item }: WorkbenchItemCardProps) {
  const typeCfg = ITEM_TYPE_CONFIG[item.item_type] ?? DEFAULT_TYPE_CONFIG
  const TypeIcon = typeCfg.icon

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
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{item.decision}</span>
                {item.employee_id && <span className="font-mono text-xs text-muted-foreground">{item.employee_id}</span>}
              </div>

              {item.reviewer_notes && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                  <Icons.messageSquare className="mt-0.5 h-4 w-4 shrink-0 text-brand-cornflower" strokeWidth={1.5} />
                  <p className="text-sm text-foreground">{item.reviewer_notes}</p>
                </div>
              )}

              <p className="mt-2 text-xs text-muted-foreground">
                Resolved{item.resolved_by ? ` by ${item.resolved_by}` : ''} · {new Date(item.resolved_at).toLocaleString()}
              </p>

              {item.form_url && (
                <a
                  href={item.form_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-cornflower hover:text-brand-navy"
                >
                  <Icons.externalLink className="h-3.5 w-3.5" />
                  View original form in Auto
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
