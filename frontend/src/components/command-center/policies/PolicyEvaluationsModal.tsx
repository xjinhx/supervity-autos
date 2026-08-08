'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Icons } from '@/components/ui/icons'
import { apiClient } from '@/lib/api-client'
import type { PolicyEvaluation, PolicyOut } from '@/types/command-center'

interface PolicyEvaluationsModalProps {
  policy: PolicyOut | null
  onClose: () => void
}

export function PolicyEvaluationsModal({ policy, onClose }: PolicyEvaluationsModalProps) {
  const [evaluations, setEvaluations] = useState<PolicyEvaluation[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!policy) return
    setIsLoading(true)
    apiClient
      .get<PolicyEvaluation[]>(`/api/policies/evaluations?policy_name=${encodeURIComponent(policy.name)}&limit=50`)
      .then(setEvaluations)
      .catch(() => setEvaluations([]))
      .finally(() => setIsLoading(false))
  }, [policy])

  return (
    <Dialog open={!!policy} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Evaluation Log — {policy?.name}</DialogTitle>
          <DialogDescription>Every pass/fail decision this policy has made. This is the audit trail from Auto.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[420px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Icons.loader className="h-6 w-6 animate-spin text-brand-cornflower" />
            </div>
          ) : evaluations.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No evaluations logged yet — run the Orchestrator.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-brand-muted">
                  <th className="py-2 pr-2">Employee</th>
                  <th className="py-2 pr-2">Actual</th>
                  <th className="py-2 pr-2">Threshold</th>
                  <th className="py-2 pr-2">Passed</th>
                  <th className="py-2 pr-2">Escalated</th>
                  <th className="py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((e) => (
                  <tr key={e.evaluation_id} className="border-b border-border/30">
                    <td className="py-2 pr-2 font-mono text-xs">{e.employee_id}</td>
                    <td className="py-2 pr-2 font-mono text-xs">{e.actual_value ?? '—'}</td>
                    <td className="py-2 pr-2 font-mono text-xs">{e.threshold_used ?? '—'}</td>
                    <td className="py-2 pr-2">
                      {e.passed ? (
                        <span className="text-emerald-700">Yes</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700"><Icons.alertTriangle className="h-3.5 w-3.5" />No</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-xs">{e.contributed_to_escalation ? 'Yes' : 'No'}</td>
                    <td className="py-2 text-xs text-muted-foreground">{new Date(e.evaluated_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
