'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CardWatermark } from '@/components/ui/card-watermark'
import { Icons } from '@/components/ui/icons'
import type { IntegrationHealth } from '@/types/command-center'

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  healthy: { label: 'Healthy', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  degraded: { label: 'Degraded', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  down: { label: 'Down', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  unknown: { label: 'Unknown', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
}

const CATEGORY_LABEL: Record<string, string> = {
  system_of_record: 'System of Record',
  channel: 'Channel',
  ai_model: 'AI Model',
  orchestrator: 'Orchestrator',
}

const CATEGORY_ICON: Record<string, React.ElementType> = {
  system_of_record: Icons.database,
  channel: Icons.messageSquare,
  ai_model: Icons.brain,
  orchestrator: Icons.plug,
}

function IntegrationCard({ integration }: { integration: IntegrationHealth }) {
  const statusCfg = STATUS_CONFIG[integration.status] ?? STATUS_CONFIG.unknown
  const CategoryIcon = CATEGORY_ICON[integration.category] ?? Icons.plug

  return (
    <motion.div variants={itemVariants}>
      <Card className="relative h-full overflow-hidden">
        <CardWatermark opacity={2} scale={0.9} />
        <CardContent className="relative z-10 flex h-full flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-navy/10">
                <CategoryIcon className="h-5 w-5 text-brand-navy" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-display text-sm font-semibold text-brand-navy">{integration.system_name}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-muted">{CATEGORY_LABEL[integration.category] ?? integration.category}</p>
              </div>
            </div>
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', statusCfg.bg, statusCfg.text)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', statusCfg.dot)} />
              {statusCfg.label}
            </span>
          </div>

          {integration.used_for && <p className="text-sm text-muted-foreground">{integration.used_for}</p>}
          {integration.detail && (
            <p className="mt-auto rounded-lg border border-border/50 bg-muted/20 p-2.5 text-xs text-muted-foreground">{integration.detail}</p>
          )}
          <p className="text-[10px] text-brand-muted">Checked {new Date(integration.last_checked).toLocaleTimeString()}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function DataManagerPage() {
  const [integrations, setIntegrations] = useState<IntegrationHealth[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const load = useCallback(async (refresh: boolean) => {
    if (refresh) setIsRefreshing(true)
    else setIsLoading(true)
    try {
      const data = await apiClient.get<IntegrationHealth[]>(`/api/integrations/health?refresh=${refresh}`)
      setIntegrations(data)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const categories = new Set(integrations.map((i) => i.category))
  const healthyCount = integrations.filter((i) => i.status === 'healthy').length

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display-3 font-bold tracking-tight text-brand-navy lg:text-display-2">Data Manager</h1>
          <p className="mt-1 text-lg text-muted-foreground">
            Registry of every system this Command Center depends on, with live health status.
          </p>
        </div>
        <Button variant="outline" onClick={() => load(true)} disabled={isRefreshing}>
          {isRefreshing ? <Icons.loader className="mr-2 h-4 w-4 animate-spin" /> : <Icons.refresh className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-brand-navy">{integrations.length}</p>
          <p className="text-xs text-muted-foreground">Registered Systems</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-emerald-600">{healthyCount}</p>
          <p className="text-xs text-muted-foreground">Healthy</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-brand-navy">{categories.size}</p>
          <p className="text-xs text-muted-foreground">Categories</p>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Icons.loader className="h-8 w-8 animate-spin text-brand-cornflower" />
        </div>
      ) : (
        <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => (
            <IntegrationCard key={integration.id} integration={integration} />
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
