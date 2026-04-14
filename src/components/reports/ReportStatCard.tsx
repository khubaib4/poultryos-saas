import type { ReactNode } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ReportStatCardProps {
  icon: ReactNode
  iconBg: 'blue' | 'green' | 'gray' | 'amber' | 'dark'
  label: string
  value: string
  trend?: { value: string; positive: boolean }
  trendVariant?: 'green' | 'amber'
  subtitle?: string
  showStar?: boolean
}

const iconBg: Record<ReportStatCardProps['iconBg'], string> = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-emerald-100 text-emerald-600',
  gray: 'bg-gray-100 text-gray-600',
  amber: 'bg-amber-100 text-amber-600',
  dark: 'bg-emerald-800 text-white',
}

export function ReportStatCard({
  icon,
  iconBg: bg,
  label,
  value,
  trend,
  trendVariant = 'green',
  subtitle,
  showStar,
}: ReportStatCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
            iconBg[bg]
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
          {trend ? (
            <p
              className={cn(
                'mt-1 text-sm font-medium',
                trendVariant === 'amber' ? 'text-amber-600' : 'text-emerald-600'
              )}
            >
              {trend.value}
            </p>
          ) : null}
          {subtitle ? (
            <p className="mt-2 flex items-center gap-1 text-sm font-medium text-emerald-700">
              {showStar ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> : null}
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
