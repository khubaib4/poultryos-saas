'use client'

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { chartColors } from '@/lib/reports-chart-theme'

interface ProductionTrendChartProps {
  data: { label: string; eggs: number }[]
}

export function ProductionTrendChart({ data }: ProductionTrendChartProps) {
  const chart = data.map((d) => ({ ...d, trend: d.eggs * 0.95 }))
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Production trend</h3>
        <p className="text-sm text-gray-500">Daily egg production volume</p>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: chartColors.primary }} />
          Production
        </span>
      </div>
      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ borderRadius: 12 }}
              formatter={(value) => [Number(value ?? 0).toLocaleString(), 'Eggs']}
            />
            <Bar dataKey="eggs" fill={chartColors.primary} radius={[6, 6, 0, 0]} />
            <Line
              type="monotone"
              dataKey="trend"
              stroke={chartColors.primary}
              strokeOpacity={0.35}
              dot={false}
              strokeWidth={2}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
