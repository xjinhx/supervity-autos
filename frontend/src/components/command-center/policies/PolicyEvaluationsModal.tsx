'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Icons } from '@/components/ui/icons'
import { apiClient } from '@/lib/api-client'
import type { Policy, PolicyEvaluation } from '@/types/command-center'

interface PolicyEvaluationsModalProps {
  policy: Policy | null
  onClose: () => void
}

export function PolicyEvaluationsModal({ policy, onClose }: PolicyEvaluationsModalProps) {
  const [evaluations, setEvaluations] = useState<PolicyEvaluation[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!policy) return
    setIsLoading(true)
    apiClient
      .get<PolicyEvaluation[]>(`/api/policies/${policy.id}/evaluations?limit=50`)
      .then(setEvaluations)
      .catch(() => setEvaluations([]))
      .finally(() => setIsLoading(false))
  }, [policy])

  return (
    <Dialog open={!!policy} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Evaluation Log — {policy?.name}</DialogTitle>
          <DialogDescription>Every fire / no-fire decision this policy has made. This is the audit trail.</DialogDescription>
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
                  <th className="py-2 pr-2">Value</th>
                  <th className="py-2 pr-2">Fired</th>
                  <th className="py-2 pr-2">Action</th>
                  <th className="py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((e) => (
                  <tr key={e.id} className="border-b border-border/30">
                    <td className="py-2 pr-2 font-mono text-xs">{e.employee_id}</td>
                    <td className="py-2 pr-2 font-mono text-xs">{String(e.input_value?.actual ?? '—')}</td>
                    <td className="py-2 pr-2">
                      {e.fired ? (
                        <span className="inline-flex items-center gap-1 text-amber-700"><Icons.checkCircle className="h-3.5 w-3.5" />Fired</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-xs">{e.action_taken}</td>
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
