'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CardWatermark } from '@/components/ui/card-watermark'
import { Icons } from '@/components/ui/icons'
import type { Insight } from '@/types/command-center'

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-600', icon: Icons.alertCircle },
  warning: { bg: 'bg-amber-100', text: 'text-amber-600', icon: Icons.alertTriangle },
  info: { bg: 'bg-blue-100', text: 'text-blue-600', icon: Icons.lightbulb },
}

const TYPE_LABEL: Record<string, string> = {
  pattern: 'Pattern',
  anomaly: 'Anomaly',
  recommendation: 'Recommendation',
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }

function InsightCard({ insight }: { insight: Insight }) {
  const cfg = SEVERITY_CONFIG[insight.severity] ?? SEVERITY_CONFIG.info
  const Icon = cfg.icon
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <Card className="relative overflow-hidden">
        <CardContent className="relative z-10 flex gap-4 p-5">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', cfg.bg)}>
            <Icon className={cn('h-5 w-5', cfg.text)} strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-sm font-semibold text-brand-navy">{insight.title}</h3>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', cfg.bg, cfg.text)}>
                {TYPE_LABEL[insight.insight_type] ?? insight.insight_type}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{insight.description}</p>
            {insight.action_path && (
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-cornflower">
                <Icons.arrowRight className="h-3.5 w-3.5" />
                {insight.action_path}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function AIInsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const fetchInsights = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiClient.get<Insight[]>('/api/insights')
      setInsights(data)
    } catch {
      setInsights([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      const data = await apiClient.post<Insight[]>('/api/insights/generate')
      setInsights(data)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const criticalCount = insights.filter((i) => i.severity === 'critical').length
  const warningCount = insights.filter((i) => i.severity === 'warning').length
  const infoCount = insights.filter((i) => i.severity === 'info').length

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-display-3 font-bold tracking-tight text-brand-navy lg:text-display-2">AI Insights</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Computed from real policy evaluations and Workbench resolutions — not hardcoded.
          </p>
        </div>
        <Button variant="gradient" onClick={handleAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? (
            <><Icons.loader className="mr-2 h-4 w-4 animate-spin" />Analyzing...</>
          ) : (
            <><Icons.sparkles className="mr-2 h-4 w-4" strokeWidth={1.5} />Run Analysis</>
          )}
        </Button>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-3">
        <Card className="relative overflow-hidden">
          <CardWatermark opacity={2} scale={0.8} />
          <CardContent className="relative z-10 flex items-center gap-4 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
              <Icons.alertCircle className="h-6 w-6 text-red-600" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-2xl font-bold text-brand-navy">{criticalCount}</p>
              <p className="text-sm text-muted-foreground">Critical Issues</p>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardWatermark opacity={2} scale={0.8} />
          <CardContent className="relative z-10 flex items-center gap-4 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
              <Icons.alertTriangle className="h-6 w-6 text-amber-600" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-2xl font-bold text-brand-navy">{warningCount}</p>
              <p className="text-sm text-muted-foreground">Warnings</p>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardWatermark opacity={2} scale={0.8} />
          <CardContent className="relative z-10 flex items-center gap-4 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
              <Icons.lightbulb className="h-6 w-6 text-blue-600" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-2xl font-bold text-brand-navy">{infoCount}</p>
              <p className="text-sm text-muted-foreground">Recommendations</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="relative overflow-hidden">
          <CardWatermark opacity={2} scale={1} />
          <CardHeader className="relative z-10">
            <CardTitle>All Insights</CardTitle>
            <CardDescription>{insights.length} insight{insights.length === 1 ? '' : 's'} generated from this cohort&apos;s data.</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Icons.loader className="h-8 w-8 animate-spin text-brand-cornflower" />
              </div>
            ) : insights.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-cornflower/20 to-brand-purple/20">
                  <Icons.lightbulb className="h-8 w-8 text-brand-cornflower" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-lg font-semibold text-brand-navy">No insights yet</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">Run analysis to compute patterns and recommendations from real data.</p>
                <Button variant="gradient" className="mt-6" onClick={handleAnalyze} disabled={isAnalyzing}>
                  <Icons.sparkles className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  Generate Insights
                </Button>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {insights.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </AnimatePresence>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
