'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CardWatermark } from '@/components/ui/card-watermark'
import { Icons } from '@/components/ui/icons'
import { RiskBadge } from '@/components/command-center/RiskBadge'
import { MilestoneTrack } from '@/components/command-center/ProgressRing'
import type { Hire } from '@/types/command-center'

const RISK_ORDER: Record<string, number> = { escalated: 0, at_risk: 1, on_track: 2 }

interface CohortSnapshotProps {
  hires: Hire[]
  limit?: number
}

// The signature "90-day onboarding journey" view — a per-hire milestone
// track rather than another stat-card grid. This is the employee-level
// surface required alongside the Dashboard.
export function CohortSnapshot({ hires, limit = 6 }: CohortSnapshotProps) {
  const rows = [...hires]
    .sort((a, b) => (RISK_ORDER[a.risk_state] ?? 3) - (RISK_ORDER[b.risk_state] ?? 3))
    .slice(0, limit)

  return (
    <Card className="relative overflow-hidden">
      <CardWatermark opacity={3} scale={1} />
      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center gap-2">
          <Icons.users className="h-5 w-5 text-brand-cornflower" strokeWidth={1.5} />
          Cohort Snapshot
        </CardTitle>
        <CardDescription>90-day onboarding journey, highest-risk hires first</CardDescription>
      </CardHeader>
      <CardContent className="relative z-10 space-y-4">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No hires in this cohort yet.</p>
        ) : (
          rows.map((hire) => {
            const daysElapsed = Math.floor((Date.now() - new Date(hire.start_date).getTime()) / 86400000)
            return (
              <div key={hire.id} className="flex flex-wrap items-center gap-3 border-b border-border/30 pb-4 last:border-0 last:pb-0">
                <div className="min-w-[140px] flex-1">
                  <p className="text-sm font-medium text-brand-navy">{hire.full_name}</p>
                  <p className="text-xs text-muted-foreground">{hire.job_family} · {hire.location}</p>
                </div>
                <MilestoneTrack daysElapsed={daysElapsed} riskState={hire.risk_state} className="w-40" />
                <RiskBadge state={hire.risk_state} />
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
