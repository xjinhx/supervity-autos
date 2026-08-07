'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/ui/icons'
import { POLICY_METRICS, POLICY_OPERATORS, POLICY_ACTIONS } from '@/lib/policy-metrics'
import type { Policy } from '@/types/command-center'

export interface PolicyFormValues {
  name: string
  description: string
  metric: string
  operator: string
  value: string
  action: string
}

interface PolicyFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: PolicyFormValues) => Promise<void>
  editingPolicy: Policy | null
}

const DEFAULT_VALUES: PolicyFormValues = {
  name: '',
  description: '',
  metric: POLICY_METRICS[0].value,
  operator: '>',
  value: '3',
  action: 'escalate',
}

export function PolicyFormModal({ open, onClose, onSubmit, editingPolicy }: PolicyFormModalProps) {
  const [values, setValues] = useState<PolicyFormValues>(DEFAULT_VALUES)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (editingPolicy) {
      setValues({
        name: editingPolicy.name,
        description: editingPolicy.description ?? '',
        metric: editingPolicy.config.metric,
        operator: editingPolicy.config.operator,
        value: String(editingPolicy.config.value),
        action: editingPolicy.config.action,
      })
    } else {
      setValues(DEFAULT_VALUES)
    }
  }, [editingPolicy, open])

  const canSubmit = values.name.trim().length > 0 && values.value.trim().length > 0

  const handleSubmit = async () => {
    if (!canSubmit) return
    setIsSaving(true)
    try {
      await onSubmit(values)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingPolicy ? 'Edit Policy' : 'New Policy'}</DialogTitle>
          <DialogDescription>
            {editingPolicy
              ? 'Change the threshold. The next Orchestrator run will use this value — no redeploy needed.'
              : 'Define a threshold rule. No code required.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Name</label>
            <input
              type="text"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              placeholder="e.g., Overdue Task Escalation"
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cornflower/50"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
            <textarea
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              rows={2}
              placeholder="What this policy does and why"
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cornflower/50"
            />
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">Condition</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <select
                value={values.metric}
                onChange={(e) => setValues((v) => ({ ...v, metric: e.target.value }))}
                className="rounded-lg border border-input bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cornflower/50 sm:col-span-3"
              >
                {POLICY_METRICS.filter((m) => m.value !== 'disclosure_found').map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select
                value={values.operator}
                onChange={(e) => setValues((v) => ({ ...v, operator: e.target.value }))}
                className="rounded-lg border border-input bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cornflower/50"
              >
                {POLICY_OPERATORS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <input
                type="number"
                value={values.value}
                onChange={(e) => setValues((v) => ({ ...v, value: e.target.value }))}
                className="rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cornflower/50"
              />
              <select
                value={values.action}
                onChange={(e) => setValues((v) => ({ ...v, action: e.target.value }))}
                className="rounded-lg border border-input bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cornflower/50"
              >
                {POLICY_ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="gradient" disabled={!canSubmit || isSaving} onClick={handleSubmit}>
            {isSaving ? (
              <><Icons.loader className="mr-2 h-4 w-4 animate-spin" />Saving...</>
            ) : (
              <><Icons.check className="mr-2 h-4 w-4" />{editingPolicy ? 'Save Changes' : 'Create Policy'}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
