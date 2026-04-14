import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface SalesStatCardProps {
  icon: ReactNode
  label: string
  value: string
  gradient: 'green' | 'blue' | 'amber' | 'slate'
}

const gradients: Record<SalesStatCardProps['gradient'], string> = {
  green: 'bg-gradient-to-br from-green-500 to-green-400',
  blue: 'bg-gradient-to-br from-blue-500 to-blue-400',
  amber: 'bg-gradient-to-br from-amber-500 to-amber-400',
  slate: 'bg-gradient-to-br from-slate-600 to-slate-500',
}

export function SalesStatCard({ icon, label, value, gradient }: SalesStatCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl p-5 text-white shadow-card-md',
        gradients[gradient]
      )}
    >
      <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/90">
            {label}
          </p>
          <p className="text-2xl font-bold leading-tight tracking-tight">{value}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white shadow-sm ring-1 ring-white/30">
          {icon}
        </div>
      </div>
    </div>
  )
}
