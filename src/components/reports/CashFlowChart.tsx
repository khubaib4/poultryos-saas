'use client'

import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { chartColors, formatRsShort } from '@/lib/reports-chart-theme'
import { cn } from '@/lib/utils'

interface CashFlowChartProps {
  data: { label: string; net: number }[]
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const [mode, setMode] = useState<'monthly' | 'weekly'>('monthly')
  const chart = mode === 'monthly' ? data : data.slice(-4)

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Cash flow trend</h3>
          <p className="text-sm text-gray-500">Net liquid movement</p>
        </div>
        <div className="flex rounded-full bg-gray-100 p-1 text-xs font-medium">
          <button
            type="button"
            className={cn(
              'rounded-full px-3 py-1',
              mode === 'monthly' ? 'bg-white shadow-sm' : 'text-gray-500'
            )}
            onClick={() => setMode('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={cn(
              'rounded-full px-3 py-1',
              mode === 'weekly' ? 'bg-white shadow-sm' : 'text-gray-500'
            )}
            onClick={() => setMode('weekly')}
          >
            Weekly
          </button>
        </div>
      </div>
      <div className="mt-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value) => formatRsShort(Number(value ?? 0))}
            />
            <Bar dataKey="net" fill={chartColors.primary} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
