'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent } from '@/components/ui/card'
import { CardWatermark } from '@/components/ui/card-watermark'
import { Icons } from '@/components/ui/icons'
import { WorkbenchItemCard } from '@/components/command-center/workbench/WorkbenchItemCard'
import { OrchestratorRunStatusBanner } from '@/components/command-center/workbench/OrchestratorRunStatusBanner'
import type { WorkbenchResolution } from '@/types/command-center'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

function WorkbenchContent() {
  const searchParams = useSearchParams()
  const runId = searchParams.get('run')
  const [items, setItems] = useState<WorkbenchResolution[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiClient.get<WorkbenchResolution[]>('/api/workbench?limit=100')
      setItems(data)
    } catch {
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      <motion.div variants={itemVariants}>
        <h1 className="text-display-3 font-bold tracking-tight text-brand-navy lg:text-display-2">Workbench</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Exceptions the Orchestrator escalated to a human — resolved in Auto&apos;s own Workbench, logged here for the record.
        </p>
      </motion.div>

      {runId && (
        <motion.div variants={itemVariants}>
          <OrchestratorRunStatusBanner runId={runId} onComplete={loadItems} />
        </motion.div>
      )}

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
              <h3 className="font-display text-lg font-semibold text-brand-navy">No resolutions yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Resolved escalations from Auto&apos;s Workbench will show up here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <WorkbenchItemCard key={item.resolution_id} item={item} />
            ))}
          </AnimatePresence>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function WorkbenchPage() {
  return (
    <Suspense fallback={null}>
      <WorkbenchContent />
    </Suspense>
  )
}
