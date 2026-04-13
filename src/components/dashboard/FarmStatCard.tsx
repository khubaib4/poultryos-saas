import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'

export interface FarmStatCardProps {
  icon: ReactNode
  iconBg: 'blue' | 'green' | 'amber' | 'red' | 'purple'
  label: string
  value: string | number
  trend?: {
    value: string
    direction: 'up' | 'down' | 'steady'
  }
  alert?: string
  decorativeShape?: boolean
  /** Corner tint for decorative blob */
  shapeTint?: 'blue' | 'red'
  className?: string
}

const iconBgClass: Record<FarmStatCardProps['iconBg'], string> = {
  blue: 'bg-[#DBEAFE] text-blue-600',
  green: 'bg-[#DCFCE7] text-green-600',
  amber: 'bg-[#FEF3C7] text-amber-600',
  red: 'bg-[#FEE2E2] text-red-600',
  purple: 'bg-[#F3E8FF] text-purple-600',
}

const shapeTintClass: Record<'blue' | 'red', string> = {
  blue: 'bg-blue-200/50',
  red: 'bg-rose-200/50',
}

export function FarmStatCard({
  icon,
  iconBg,
  label,
  value,
  trend,
  alert,
  decorativeShape,
  shapeTint = 'blue',
  className,
}: FarmStatCardProps) {
  const trendColor =
    trend?.direction === 'up'
      ? 'text-green-600'
      : trend?.direction === 'down'
        ? 'text-red-600'
        : 'text-gray-500'

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04]',
        className
      )}
    >
      {decorativeShape && (
        <div
          className={cn(
            'pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-[2.5rem]',
            shapeTintClass[shapeTint]
          )}
          aria-hidden
        />
      )}

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-[32px] font-bold leading-none tracking-tight text-gray-900">
            {value}
          </p>
          {trend && (
            <p className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}>
              {trend.direction === 'up' && <ArrowUp className="h-4 w-4 shrink-0" />}
              {trend.direction === 'down' && <ArrowDown className="h-4 w-4 shrink-0" />}
              {trend.direction === 'steady' && <Minus className="h-4 w-4 shrink-0" />}
              {trend.value}
            </p>
          )}
          {alert && (
            <p className="text-sm font-medium text-red-600">{alert}</p>
          )}
        </div>
        <div
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-sm ring-1 ring-black/[0.04]',
            iconBgClass[iconBg]
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}
