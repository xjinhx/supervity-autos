'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/ui/icons'
import { apiClient } from '@/lib/api-client'
import type { OrchestratorRunRequest, OrchestratorRunResult } from '@/types/command-center'

interface RunOrchestratorModalProps {
  open: boolean
  onClose: () => void
  onRunComplete: () => void
}

export function RunOrchestratorModal({ open, onClose, onRunComplete }: RunOrchestratorModalProps) {
  const [fields, setFields] = useState<OrchestratorRunRequest>({})
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const handleRun = async () => {
    setIsRunning(true)
    setResult(null)
    try {
      const payload: OrchestratorRunRequest = {}
      if (fields.employee_id?.trim()) payload.employee_id = fields.employee_id.trim()
      if (fields.hr_slack_channel?.trim()) payload.hr_slack_channel = fields.hr_slack_channel.trim()
      if (fields.sensitive_category_labels?.trim()) payload.sensitive_category_labels = fields.sensitive_category_labels.trim()
      if (fields.normal_category_labels?.trim()) payload.normal_category_labels = fields.normal_category_labels.trim()
      await apiClient.post<OrchestratorRunResult>('/api/orchestrator/run', payload)
      setResult({ ok: true, message: 'Run completed. Check Dashboard, Policies, and Workbench for updated data.' })
      onRunComplete()
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : 'Run failed.' })
    } finally {
      setIsRunning(false)
    }
  }

  const handleClose = () => {
    setFields({})
    setResult(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Run Orchestrator</DialogTitle>
          <DialogDescription>
            Triggers the real Orchestrator workflow in Auto. All fields are optional — leave blank for backend
            defaults / the full 90-day-window scope.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Employee ID (optional)</label>
            <input
              type="text"
              value={fields.employee_id ?? ''}
              onChange={(e) => setFields((f) => ({ ...f, employee_id: e.target.value }))}
              placeholder="Leave blank for the full 90-day-window scope"
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cornflower/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">HR Slack channel (optional)</label>
            <input
              type="text"
              value={fields.hr_slack_channel ?? ''}
              onChange={(e) => setFields((f) => ({ ...f, hr_slack_channel: e.target.value }))}
              placeholder="#hr-escalations"
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cornflower/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Sensitive category labels (optional)</label>
            <input
              type="text"
              value={fields.sensitive_category_labels ?? ''}
              onChange={(e) => setFields((f) => ({ ...f, sensitive_category_labels: e.target.value }))}
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cornflower/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Normal category labels (optional)</label>
            <input
              type="text"
              value={fields.normal_category_labels ?? ''}
              onChange={(e) => setFields((f) => ({ ...f, normal_category_labels: e.target.value }))}
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cornflower/50"
            />
          </div>

          {result && (
            <div
              className={
                result.ok
                  ? 'rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800'
                  : 'rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800'
              }
            >
              {result.message}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>Close</Button>
          <Button variant="gradient" disabled={isRunning} onClick={handleRun}>
            {isRunning ? (
              <><Icons.loader className="mr-2 h-4 w-4 animate-spin" />Running...</>
            ) : (
              <><Icons.zap className="mr-2 h-4 w-4" />Run Orchestrator</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
