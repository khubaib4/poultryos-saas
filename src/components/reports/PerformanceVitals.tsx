import { cn } from '@/lib/utils'

export interface VitalItem {
  id: string
  label: string
  value: string
  hint?: string
  hintVariant?: 'green' | 'amber' | 'red' | 'gray'
}

interface PerformanceVitalsProps {
  items: VitalItem[]
}

const hintClass: Record<NonNullable<VitalItem['hintVariant']>, string> = {
  green: 'text-emerald-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
  gray: 'text-gray-500',
}

export function PerformanceVitals({ items }: PerformanceVitalsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.map((v) => (
        <div
          key={v.id}
          className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            {v.label}
          </p>
          <p className="mt-1 text-lg font-bold text-gray-900">{v.value}</p>
          {v.hint ? (
            <p
              className={cn(
                'mt-1 text-xs font-medium',
                v.hintVariant ? hintClass[v.hintVariant] : 'text-gray-500'
              )}
            >
              {v.hint}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  )
}
