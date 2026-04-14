'use client'

import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { chartColors } from '@/lib/reports-chart-theme'
import { cn } from '@/lib/utils'

interface MortalityTrendChartProps {
  data: { label: string; value: number }[]
}

export function MortalityTrendChart({ data }: MortalityTrendChartProps) {
  const [granularity, setGranularity] = useState<'daily' | 'weekly'>('weekly')

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Mortality trend</h3>
          <p className="text-sm text-gray-500">Flock health in selected range</p>
        </div>
        <div className="flex rounded-full bg-gray-100 p-1 text-xs font-medium">
          <button
            type="button"
            className={cn(
              'rounded-full px-3 py-1',
              granularity === 'daily' ? 'bg-white shadow-sm' : 'text-gray-500'
            )}
            onClick={() => setGranularity('daily')}
          >
            Daily
          </button>
          <button
            type="button"
            className={cn(
              'rounded-full px-3 py-1',
              granularity === 'weekly' ? 'bg-white shadow-sm' : 'text-gray-500'
            )}
            onClick={() => setGranularity('weekly')}
          >
            Weekly
          </button>
        </div>
      </div>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke={chartColors.primary}
              strokeWidth={2}
              dot={{ r: 3, fill: chartColors.primary }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
