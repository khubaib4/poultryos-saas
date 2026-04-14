import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface InventoryStatCardProps {
  icon: ReactNode
  iconBg: 'blue' | 'green' | 'amber' | 'red'
  label: string
  value: string | number
  trend?: string
  tint?: 'amber' | 'red'
}

const iconBgClass: Record<InventoryStatCardProps['iconBg'], string> = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-emerald-100 text-emerald-600',
  amber: 'bg-amber-100 text-amber-600',
  red: 'bg-red-100 text-red-600',
}

const tintClass: Record<NonNullable<InventoryStatCardProps['tint']>, string> = {
  amber: 'border-amber-100 bg-amber-50/90',
  red: 'border-red-100 bg-red-50/90',
}

export function InventoryStatCard({
  icon,
  iconBg,
  label,
  value,
  trend,
  tint,
}: InventoryStatCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-2xl border p-5 shadow-sm',
        tint ? tintClass[tint] : 'border-gray-100 bg-white'
      )}
    >
      {trend ? (
        <span className="absolute right-4 top-4 text-sm font-semibold text-emerald-600">
          {trend}
        </span>
      ) : null}
      <div className={cn('flex items-start gap-4', trend && 'pr-14')}>
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
            iconBgClass[iconBg]
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  )
}
