'use client'

import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import type { DateRangePreset } from '@/lib/report-range-url'
import { cn } from '@/lib/utils'

const PRESETS: { key: DateRangePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'last3m', label: 'Last 3 months' },
  { key: 'ytd', label: 'Year to date' },
]

function buildHref(farmId: string, preset: DateRangePreset, tab: string) {
  const extra: Record<string, string> = { range: preset }
  if (tab && tab !== 'overview') extra.tab = tab
  return withFarmQuery('/farm/reports', farmId, extra)
}

interface DateRangeSelectorProps {
  farmId: string
  tab: string
  preset: DateRangePreset
  from: string
  to: string
}

export function DateRangeSelector({ farmId, tab, preset, from, to }: DateRangeSelectorProps) {
  const custom = preset === 'custom'
  const label = `${format(parseISO(from + 'T12:00:00'), 'MMM d, yyyy')} – ${format(parseISO(to + 'T12:00:00'), 'MMM d, yyyy')}`

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(({ key, label: l }) => (
          <Link
            key={key}
            href={buildHref(farmId, key, tab)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              !custom && preset === key
                ? 'bg-primary text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {l}
          </Link>
        ))}
      </div>
      <p className="text-sm font-medium text-gray-600">{label}</p>
    </div>
  )
}
