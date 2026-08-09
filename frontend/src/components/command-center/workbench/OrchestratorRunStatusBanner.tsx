'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { Icons } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import type { OrchestratorRunStatus, OrchestratorStep } from '@/types/command-center'

const POLL_INTERVAL_MS = 1500
const AUTO_DISMISS_MS = 4000

interface OrchestratorRunStatusBannerProps {
  runId: string
  onComplete: () => void
}

function StepRow({ step, active }: { step: OrchestratorStep; active: boolean }) {
  return (
    <div className={cn('flex items-center justify-between gap-2 rounded-md px-2 py-1 text-xs', active && 'bg-white/70 font-medium')}>
      <span className="truncate text-foreground">{step.stepName}</span>
      {step.status && <span className="shrink-0 text-muted-foreground">{step.status}</span>}
    </div>
  )
}

export function OrchestratorRunStatusBanner({ runId, onComplete }: OrchestratorRunStatusBannerProps) {
  const router = useRouter()
  const [status, setStatus] = useState<OrchestratorRunStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [pollError, setPollError] = useState<string | null>(null)
  const hasCompletedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const poll = async () => {
      try {
        const next = await apiClient.get<OrchestratorRunStatus>(`/api/orchestrator/run/${runId}`)
        if (cancelled) return
        setStatus(next)
        if (next.status === 'running') {
          timer = setTimeout(poll, POLL_INTERVAL_MS)
        }
      } catch (e) {
        if (cancelled) return
        setPollError(e instanceof Error ? e.message : 'Lost track of the run.')
      }
    }
    poll()

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [runId])

  const dismiss = () => {
    setDismissed(true)
    router.replace('/workbench')
  }

  useEffect(() => {
    if (status?.status !== 'completed' || hasCompletedRef.current) return
    hasCompletedRef.current = true
    onComplete()
    const t = setTimeout(dismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.status])

  if (dismissed) return null

  const isError = Boolean(pollError) || status?.status === 'failed'
  const isDone = status?.status === 'completed'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className={cn(
          'relative overflow-hidden rounded-xl border p-4',
          isError ? 'border-red-200 bg-red-50' : isDone ? 'border-emerald-200 bg-emerald-50' : 'border-brand-cornflower/30 bg-brand-cornflower/5'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {isError ? (
              <Icons.alertTriangle className="h-5 w-5 shrink-0 text-red-600" />
            ) : isDone ? (
              <Icons.checkCircle className="h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <Icons.loader className="h-5 w-5 shrink-0 animate-spin text-brand-cornflower" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-navy">
                {pollError ? 'Lost track of the run' : isDone ? 'Orchestrator run completed' : status?.status === 'failed' ? 'Orchestrator run failed' : 'Orchestrator running…'}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {pollError ?? (status?.status === 'failed' ? status.error : status?.current_step?.stepName ? `Currently on: ${status.current_step.stepName}` : 'Starting up…')}
              </p>
            </div>
          </div>
          <button onClick={dismiss} className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-black/5" aria-label="Dismiss">
            <Icons.close className="h-4 w-4" />
          </button>
        </div>

        {status && status.steps.length > 0 && (
          <div className="mt-3 max-h-40 space-y-0.5 overflow-y-auto rounded-lg bg-white/40 p-1.5">
            {status.steps.map((step, i) => (
              <StepRow key={step.id ?? i} step={step} active={step.stepName === status.current_step?.stepName} />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
