'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatRsShort } from '@/lib/reports-chart-theme'

interface Slice {
  key: string
  label: string
  pct: number
  color: string
}

interface ExpenseBreakdownChartProps {
  slices: Slice[]
  totalExpenses: number
}

export function ExpenseBreakdownChart({ slices, totalExpenses }: ExpenseBreakdownChartProps) {
  const data = slices.map((s) => ({ name: s.label, value: s.pct, color: s.color }))

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">Operational expenses</h3>
      <p className="text-sm text-gray-500">Share of spend in range</p>
      <div className="mt-4 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={72}
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${Number(value ?? 0)}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-4 space-y-2">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="h-2 w-16 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="font-semibold text-gray-900">{s.pct}%</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-gray-400">
        Total expenses in range: {formatRsShort(totalExpenses)}
      </p>
    </div>
  )
}
