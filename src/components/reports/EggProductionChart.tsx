'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { chartColors } from '@/lib/reports-chart-theme'
import type { EggGradeDayRow } from '@/lib/queries/reports-analytics'

interface EggProductionChartProps {
  data: EggGradeDayRow[]
}

export function EggProductionChart({ data }: EggProductionChartProps) {
  const chart = data.map((d) => ({
    ...d,
    name: d.label,
  }))

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">Egg production trend</h3>
      <p className="text-sm text-gray-500">Daily output by quality grade</p>
      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="gradeA" stackId="a" fill={chartColors.primary} name="Grade A" />
            <Bar dataKey="gradeB" stackId="a" fill="#86EFAC" name="Grade B" />
            <Bar dataKey="cracked" stackId="a" fill={chartColors.danger} name="Cracked" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
