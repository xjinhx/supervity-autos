'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CardWatermark } from '@/components/ui/card-watermark'
import { Icons } from '@/components/ui/icons'
import { DashboardActivityChart } from '@/components/command-center/DashboardActivityChart'
import { RunOrchestratorModal } from '@/components/command-center/RunOrchestratorModal'
import { cn } from '@/lib/utils'
import type { DashboardSummary, DashboardActivity } from '@/types/command-center'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
}

function AnimatedNumber({ value, suffix = '', duration = 800 }: { value: number; suffix?: string; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: false, amount: 0.5 })

  useEffect(() => {
    if (!isInView) return
    const startTime = performance.now()
    const startValue = displayValue
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      setDisplayValue(Math.round(startValue + (value - startValue) * progress))
      if (progress < 1) requestAnimationFrame(animate)
      else setDisplayValue(value)
    }
    requestAnimationFrame(animate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isInView])

  return <span ref={ref}>{displayValue.toLocaleString()}{suffix}</span>
}

interface StatCardProps {
  title: string
  value: number
  suffix?: string
  icon: React.ElementType
  colorClass: string
  delay?: number
}

function StatCard({ title, value, suffix = '', icon: Icon, colorClass, delay = 0 }: StatCardProps) {
  return (
    <motion.div variants={itemVariants} transition={{ delay }} whileHover={{ y: -4 }}>
      <Card className="group relative h-full cursor-default overflow-hidden">
        <CardWatermark opacity={3} scale={0.9} />
        <CardContent className="relative z-10 p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-micro uppercase text-brand-muted transition-colors duration-200 group-hover:text-brand-cornflower">{title}</p>
              <p className="font-display text-[2.25rem] font-bold leading-none tracking-tight text-brand-navy">
                <AnimatedNumber value={value} suffix={suffix} />
              </p>
            </div>
            <div className={cn('rounded-xl p-2.5 text-white shadow-lg', colorClass)}>
              <Icon className="h-5 w-5" strokeWidth={1.5} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function HomePage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [activity, setActivity] = useState<DashboardActivity | null>(null)
  const [runModalOpen, setRunModalOpen] = useState(false)

  const loadAll = useCallback(async () => {
    const [summaryData, activityData] = await Promise.all([
      apiClient.get<DashboardSummary>('/api/dashboard/summary'),
      apiClient.get<DashboardActivity>('/api/dashboard/activity?days=14'),
    ])
    setSummary(summaryData)
    setActivity(activityData)
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-display-3 font-bold tracking-tight text-brand-navy lg:text-display-2">
            Where Intelligence <br className="hidden sm:block" />
            <span className="text-gradient">Meets Human.</span>
          </h1>
          <p className="mt-4 text-lg font-light text-muted-foreground">
            Live view of the 90-day onboarding cohort — {summary?.total_hires ?? '—'} hires tracked, {summary?.recent_workbench_resolutions ?? '—'} resolved this week.
          </p>
        </div>
        <Button variant="gradient" size="lg" onClick={() => setRunModalOpen(true)}>
          <Icons.zap className="mr-2 h-4 w-4" />
          Run Orchestrator
        </Button>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="On Track" value={summary?.on_track_count ?? 0} icon={Icons.checkCircle} colorClass="bg-brand-cornflower" delay={0.1} />
        <StatCard title="At Risk" value={summary?.at_risk_count ?? 0} icon={Icons.alertTriangle} colorClass="bg-amber-500" delay={0.15} />
        <StatCard title="Tasks Completion" value={summary?.tasks_completion_pct ?? 0} suffix="%" icon={Icons.barChart} colorClass="bg-gradient-to-br from-brand-navy to-brand-purple" delay={0.2} />
        <StatCard title="Recent Workbench Resolutions" value={summary?.recent_workbench_resolutions ?? 0} icon={Icons.workbench} colorClass="bg-brand-navy" delay={0.25} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Active Policies" value={summary?.active_policies ?? 0} icon={Icons.brain} colorClass="bg-brand-purple" delay={0.1} />
      </div>

      <motion.div variants={itemVariants}>
        <DashboardActivityChart points={activity?.points ?? []} />
      </motion.div>

      <RunOrchestratorModal
        open={runModalOpen}
        onClose={() => setRunModalOpen(false)}
        onRunComplete={loadAll}
      />
    </motion.div>
  )
}
