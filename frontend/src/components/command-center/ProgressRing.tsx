import { cn } from '@/lib/utils'
import type { RiskState } from './RiskBadge'

const RING_COLOR: Record<RiskState, string> = {
  on_track: '#8AA2DF', // brand-cornflower
  at_risk: '#D97706', // amber-600
  escalated: '#DC2626', // red-600
}

interface ProgressRingProps {
  /** Days elapsed since start, out of 90 */
  daysElapsed: number
  riskState: RiskState
  size?: number
  strokeWidth?: number
  className?: string
  centerLabel?: string
}

// The signature "90-day onboarding journey" visual — deliberately distinct
// from a generic stat-card grid. Used on Dashboard cohort views and
// employee-level detail (Workbench).
export function ProgressRing({
  daysElapsed,
  riskState,
  size = 64,
  strokeWidth = 6,
  className,
  centerLabel,
}: ProgressRingProps) {
  const pct = Math.min(1, Math.max(0, daysElapsed / 90))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct)
  const color = RING_COLOR[riskState] ?? RING_COLOR.on_track

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(20,26,66,0.08)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xs font-bold text-brand-navy">{centerLabel ?? `${Math.min(daysElapsed, 90)}`}</span>
        {!centerLabel && <span className="text-[8px] uppercase tracking-wide text-brand-muted">of 90d</span>}
      </div>
    </div>
  )
}

// Compact horizontal milestone track variant — used in list rows where a
// full ring would take too much space.
export function MilestoneTrack({ daysElapsed, riskState, className }: { daysElapsed: number; riskState: RiskState; className?: string }) {
  const pct = Math.min(100, Math.max(0, (daysElapsed / 90) * 100))
  const color = RING_COLOR[riskState] ?? RING_COLOR.on_track

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color, transition: 'width 0.6s ease-out' }}
        />
        {[30, 60].map((mark) => (
          <div key={mark} className="absolute inset-y-0 w-px bg-white/70" style={{ left: `${(mark / 90) * 100}%` }} />
        ))}
      </div>
      <span className="shrink-0 text-[10px] font-medium tabular-nums text-brand-muted">Day {Math.min(daysElapsed, 90)}</span>
    </div>
  )
}
