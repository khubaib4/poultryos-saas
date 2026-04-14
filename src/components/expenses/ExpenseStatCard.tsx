import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ExpenseStatCardProps {
  label: string
  value: string
  subtitle?: string
  trend?: { value: string; direction: 'up' | 'down' }
  /** When set, overrides default trend coloring (e.g. Stitch coral card uses red for ↓). */
  trendClassName?: string
  tint: 'coral' | 'blue' | 'amber' | 'gray'
  icon?: ReactNode
  /** Extra line with optional colored dot (billing cycle, warnings, etc.). */
  extra?: ReactNode
}

const tints: Record<ExpenseStatCardProps['tint'], string> = {
  coral: 'bg-red-50/90 border-red-100',
  blue: 'bg-blue-50/90 border-blue-100',
  amber: 'bg-amber-50/90 border-amber-100',
  gray: 'bg-gray-50/90 border-gray-100',
}

const labelTint: Record<ExpenseStatCardProps['tint'], string> = {
  coral: 'text-red-700/90',
  blue: 'text-blue-700/90',
  amber: 'text-amber-800/90',
  gray: 'text-gray-600',
}

export function ExpenseStatCard({
  label,
  value,
  subtitle,
  trend,
  trendClassName,
  tint,
  icon,
  extra,
}: ExpenseStatCardProps) {
  const defaultTrendClass =
    trend?.direction === 'down' ? 'text-red-600' : 'text-emerald-600'

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border p-5 shadow-sm',
        tints[tint]
      )}
    >
      {icon && (
        <div
          className="pointer-events-none absolute -right-1 bottom-2 opacity-[0.12] [&_svg]:h-24 [&_svg]:w-24"
          aria-hidden
        >
          {icon}
        </div>
      )}
      <div className="relative space-y-2">
        <p
          className={cn(
            'text-[11px] font-semibold uppercase tracking-wider',
            labelTint[tint]
          )}
        >
          {label}
        </p>
        <p className="text-2xl font-bold tracking-tight text-gray-900">{value}</p>
        {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        {trend && (
          <p
            className={cn(
              'flex items-center gap-1 text-sm font-medium',
              trendClassName ?? defaultTrendClass
            )}
          >
            {trend.direction === 'down' ? (
              <ArrowDown className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <ArrowUp className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {trend.value}
          </p>
        )}
        {extra}
      </div>
    </div>
  )
}
