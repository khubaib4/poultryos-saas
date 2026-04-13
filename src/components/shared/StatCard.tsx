import { type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatIconTone = 'primary' | 'blue' | 'amber' | 'green' | 'red' | 'purple'

const TONE: Record<
  StatIconTone,
  { box: string; icon: string }
> = {
  primary: { box: 'bg-primary-lighter', icon: 'text-primary' },
  blue: { box: 'bg-icon-blue-bg', icon: 'text-icon-blue' },
  amber: { box: 'bg-icon-amber-bg', icon: 'text-icon-amber' },
  green: { box: 'bg-icon-green-bg', icon: 'text-icon-green' },
  red: { box: 'bg-icon-red-bg', icon: 'text-icon-red' },
  purple: { box: 'bg-icon-purple-bg', icon: 'text-icon-purple' },
}

interface StatCardProps {
  title: string
  value: string | number | ReactNode
  /** Secondary line under the value (e.g. subtitle) */
  description?: string | ReactNode
  icon: LucideIcon
  iconTone?: StatIconTone
  trend?: 'up' | 'down' | 'neutral'
  /** e.g. "+12%" */
  trendValue?: string
  /** e.g. "vs last week" */
  trendLabel?: string
  className?: string
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconTone = 'primary',
  trend = 'neutral',
  trendValue,
  trendLabel,
  className,
}: StatCardProps) {
  const tone = TONE[iconTone]
  const trendColor =
    trend === 'up'
      ? 'text-green-600'
      : trend === 'down'
        ? 'text-red-600'
        : 'text-gray-400'
  const trendGlyph =
    trend === 'up' ? '▲' : trend === 'down' ? '▼' : trend === 'neutral' ? '—' : ''

  const showTrendRow = Boolean(trendValue) || Boolean(trendLabel) || trend !== 'neutral'

  return (
    <div
      className={cn(
        'rounded-2xl bg-white p-5 shadow-card',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-sm font-normal text-gray-500">{title}</p>
          <p className="text-[28px] font-bold tabular-nums leading-8 tracking-tight text-gray-900">
            {value}
          </p>
        </div>
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-icon',
            tone.box
          )}
        >
          <Icon className={cn('h-6 w-6', tone.icon)} aria-hidden strokeWidth={2} />
        </div>
      </div>

      {description != null && description !== '' && (
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      )}

      {showTrendRow && (
        <p className="mt-3 text-[13px] font-medium">
          {(trendValue || trend !== 'neutral') && (
            <span className={trendColor}>
              {trendValue ? `${trendGlyph} ${trendValue}`.trim() : trendGlyph}
            </span>
          )}
          {trendLabel && (
            <span className="ml-1 font-normal text-gray-400">{trendLabel}</span>
          )}
        </p>
      )}
    </div>
  )
}
