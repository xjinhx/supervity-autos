'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CardWatermark } from '@/components/ui/card-watermark'
import { Icons } from '@/components/ui/icons'
import type { ActivityPoint } from '@/types/command-center'

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-xl border border-white/60 bg-white/95 p-3 shadow-float backdrop-blur-sm">
      <p className="mb-2 text-xs font-medium text-brand-navy">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="capitalize text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-brand-navy">{entry.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface DashboardActivityChartProps {
  points: ActivityPoint[]
  className?: string
}

export function DashboardActivityChart({ points, className }: DashboardActivityChartProps) {
  const data = points.map((p) => ({
    name: new Date(p.bucket).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    Evaluations: p.evaluations,
    Fired: p.fired,
    Escalations: p.escalations,
  }))

  const totalEvaluations = points.reduce((acc, p) => acc + p.evaluations, 0)
  const totalEscalations = points.reduce((acc, p) => acc + p.escalations, 0)

  return (
    <Card className={className}>
      <CardWatermark opacity={4} scale={1.2} />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Icons.activity className="h-5 w-5 text-brand-cornflower" strokeWidth={1.5} />
              Orchestrator Activity
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Policy evaluations and escalations, most recent runs</p>
          </div>
          <div className="hidden items-center gap-4 sm:flex">
            <div className="text-right">
              <p className="text-micro uppercase text-brand-muted">Evaluations</p>
              <p className="font-display text-lg font-bold text-brand-navy">{totalEvaluations.toLocaleString()}</p>
            </div>
            <div className="h-10 w-px bg-border/50" />
            <div className="text-right">
              <p className="text-micro uppercase text-brand-muted">Escalations</p>
              <p className="font-display text-lg font-bold text-brand-navy">{totalEscalations.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {data.length === 0 ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            No runs yet — click &quot;Run Orchestrator&quot; to generate activity.
          </div>
        ) : (
          <div className="mt-4 h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradientEval" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8AA2DF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8AA2DF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradientFired" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#535EA4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#535EA4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradientEsc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D97706" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(20, 26, 66, 0.06)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#848EAA', fontSize: 11, fontWeight: 500 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#848EAA', fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Evaluations" stroke="#8AA2DF" strokeWidth={2.5} fill="url(#gradientEval)" dot={false} />
                <Area type="monotone" dataKey="Fired" stroke="#535EA4" strokeWidth={2} fill="url(#gradientFired)" dot={false} />
                <Area type="monotone" dataKey="Escalations" stroke="#D97706" strokeWidth={2} fill="url(#gradientEsc)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-4 flex items-center justify-center gap-6 border-t border-border/30 pt-4">
          <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-brand-cornflower" /><span className="text-xs text-muted-foreground">Evaluations</span></div>
          <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-brand-purple" /><span className="text-xs text-muted-foreground">Fired</span></div>
          <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-amber-600" /><span className="text-xs text-muted-foreground">Escalations</span></div>
        </div>
      </CardContent>
    </Card>
  )
}
