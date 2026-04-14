import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface VaccinationStatCardProps {
  icon: ReactNode
  iconBg: 'gray' | 'green' | 'amber' | 'red'
  value: string | number
  /** Primary subtitle under the value (e.g. “Done this month”). */
  label: string
  labelColor?: 'default' | 'green' | 'blue' | 'amber' | 'red'
}

const iconBgClass: Record<VaccinationStatCardProps['iconBg'], string> = {
  gray: 'bg-gray-100 text-gray-600',
  green: 'bg-emerald-100 text-emerald-600',
  amber: 'bg-amber-100 text-amber-600',
  red: 'bg-red-100 text-red-600',
}

const labelColorClass: Record<
  NonNullable<VaccinationStatCardProps['labelColor']>,
  string
> = {
  default: 'text-gray-500',
  green: 'text-emerald-600',
  blue: 'text-blue-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
}

export function VaccinationStatCard({
  icon,
  iconBg,
  value,
  label,
  labelColor = 'default',
}: VaccinationStatCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
            iconBgClass[iconBg]
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold tracking-tight text-gray-900">{value}</p>
          <p
            className={cn(
              'mt-1 text-sm font-medium leading-snug',
              labelColorClass[labelColor]
            )}
          >
            {label}
          </p>
        </div>
      </div>
    </div>
  )
}
