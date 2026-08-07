'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/ui/icons'
import type { WorkbenchItem } from '@/types/command-center'

interface ResolveModalProps {
  item: WorkbenchItem | null
  action: 'approve' | 'reject' | 'modify' | null
  onClose: () => void
  onConfirm: (notes: string, correctedAction: string) => Promise<void>
}

const ACTION_COPY: Record<string, { title: string; description: string; confirmLabel: string }> = {
  approve: { title: 'Approve escalation', description: 'Confirms the AI recommendation and closes this item.', confirmLabel: 'Confirm Approve' },
  reject: { title: 'Reject escalation', description: 'Dismisses this item — no action will be taken.', confirmLabel: 'Confirm Reject' },
  modify: { title: 'Modify recommendation', description: 'Override the AI recommendation with what should actually happen. This is recorded as a correction and feeds back into policy review.', confirmLabel: 'Save Correction' },
}

export function ResolveModal({ item, action, onClose, onConfirm }: ResolveModalProps) {
  const [notes, setNotes] = useState('')
  const [correctedAction, setCorrectedAction] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!item || !action) return null
  const copy = ACTION_COPY[action]

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm(notes, correctedAction)
      setNotes('')
      setCorrectedAction('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={!!item} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
            <span className="font-mono text-xs text-muted-foreground">{item.employee_id}</span>
            {item.ai_recommendation && <p className="mt-1 text-foreground">{item.ai_recommendation}</p>}
          </div>

          {action === 'modify' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">What should happen instead?</label>
              <input
                type="text"
                value={correctedAction}
                onChange={(e) => setCorrectedAction(e.target.value)}
                placeholder="e.g., Downgrade to notify-only, reassign to backup manager"
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cornflower/50"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-cornflower/50"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="gradient" disabled={isSubmitting || (action === 'modify' && !correctedAction.trim())} onClick={handleConfirm}>
            {isSubmitting ? <><Icons.loader className="mr-2 h-4 w-4 animate-spin" />Saving...</> : copy.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
