'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent } from '@/components/ui/card'
import { CardWatermark } from '@/components/ui/card-watermark'
import { Icons } from '@/components/ui/icons'
import { WorkbenchItemCard } from '@/components/command-center/workbench/WorkbenchItemCard'
import { ResolveModal } from '@/components/command-center/workbench/ResolveModal'
import type { WorkbenchItem } from '@/types/command-center'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

type Tab = 'pending' | 'resolved'

export default function WorkbenchPage() {
  const [tab, setTab] = useState<Tab>('pending')
  const [items, setItems] = useState<WorkbenchItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [resolveTarget, setResolveTarget] = useState<{ item: WorkbenchItem; action: 'approve' | 'reject' | 'modify' } | null>(null)

  const loadItems = useCallback(async (targetTab: Tab) => {
    setIsLoading(true)
    try {
      const query = targetTab === 'pending' ? 'status=pending' : ''
      const data = await apiClient.get<WorkbenchItem[]>(`/api/workbench?${query}&limit=100`)
      const filtered = targetTab === 'resolved' ? data.filter((i) => i.status !== 'pending') : data
      setItems(filtered)
    } catch {
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadItems(tab)
  }, [tab, loadItems])

  const handleResolve = async (notes: string, correctedAction: string) => {
    if (!resolveTarget) return
    await apiClient.post(`/api/workbench/${resolveTarget.item.id}/resolve`, {
      action: resolveTarget.action,
      notes,
      resolved_by: 'operator@autopilot.local',
      corrected_action: correctedAction || undefined,
    })
    setResolveTarget(null)
    await loadItems(tab)
  }

  const pendingCount = tab === 'pending' ? items.length : undefined

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      <motion.div variants={itemVariants}>
        <h1 className="text-display-3 font-bold tracking-tight text-brand-navy lg:text-display-2">Workbench</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Exceptions the Orchestrator couldn&apos;t resolve on its own — review context, then approve, reject, or modify.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="flex gap-1 p-1.5 bg-gray-100 rounded-xl w-fit">
        {(['pending', 'resolved'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors capitalize',
              tab === t ? 'bg-white text-brand-navy shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t}
            {t === 'pending' && pendingCount !== undefined && pendingCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Icons.loader className="h-8 w-8 animate-spin text-brand-cornflower" />
          </div>
        ) : items.length === 0 ? (
          <Card className="relative overflow-hidden">
            <CardWatermark opacity={3} scale={1} />
            <CardContent className="relative z-10 flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-brand-cornflower/20">
                <Icons.checkCircle className="h-8 w-8 text-emerald-600" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-lg font-semibold text-brand-navy">
                {tab === 'pending' ? 'Queue is clear' : 'No resolved items yet'}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {tab === 'pending'
                  ? 'No exceptions are waiting on human review right now.'
                  : 'Resolved escalations will show up here.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <WorkbenchItemCard
                key={item.id}
                item={item}
                onResolve={(target, action) => setResolveTarget({ item: target, action })}
              />
            ))}
          </AnimatePresence>
        )}
      </motion.div>

      <ResolveModal
        item={resolveTarget?.item ?? null}
        action={resolveTarget?.action ?? null}
        onClose={() => setResolveTarget(null)}
        onConfirm={handleResolve}
      />
    </motion.div>
  )
}
