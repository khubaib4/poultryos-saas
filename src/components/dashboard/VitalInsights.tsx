'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, BarChart3, Info, Syringe } from 'lucide-react'
import type { FarmDashboardVitalInsight } from '@/lib/queries/farm-dashboard'
import { cn } from '@/lib/utils'

function RowIcon({ insight }: { insight: FarmDashboardVitalInsight }) {
  if (insight.icon === 'warning') {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-amber-600">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </div>
    )
  }
  if (insight.icon === 'syringe') {
    const box =
      insight.kind === 'warning'
        ? 'bg-[#FEF3C7] text-amber-600'
        : 'bg-[#DCFCE7] text-green-600'
    return (
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          box
        )}
      >
        <Syringe className="h-5 w-5" aria-hidden />
      </div>
    )
  }
  if (insight.icon === 'chart') {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] text-green-600">
        <BarChart3 className="h-5 w-5" aria-hidden />
      </div>
    )
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
      <Info className="h-5 w-5" aria-hidden />
    </div>
  )
}

export function VitalInsights({ insights }: { insights: FarmDashboardVitalInsight[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set())

  const visible = useMemo(
    () => insights.filter((i) => !dismissed.has(i.id)),
    [insights, dismissed],
  )

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04]">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Vital insights
        </p>
        <p className="mt-4 text-sm text-gray-500">No active alerts. Great work.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04]">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Vital insights
      </p>
      <ul className="mt-4 space-y-4">
        {visible.map((insight) => (
          <li
            key={insight.id}
            className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3"
          >
            <RowIcon insight={insight} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900">{insight.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                {insight.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-4 text-sm font-medium text-primary transition-colors hover:text-primary-dark"
        onClick={() => setDismissed(new Set(insights.map((i) => i.id)))}
      >
        Dismiss all
      </button>
    </div>
  )
}
