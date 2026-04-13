'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatCurrency } from '@/lib/utils'

const COLORS = ['#22c55e', '#16a34a', '#4ade80', '#86efac', '#bbf7d0', '#94a3b8', '#64748b']

interface Slice {
  name: string
  value: number
}

interface ReportsPieChartProps {
  data: Slice[]
  valueFormat?: 'currency' | 'number'
  className?: string
}

export function ReportsPieChart({
  data,
  valueFormat = 'number',
  className,
}: ReportsPieChartProps) {
  const fmt = (v: number) =>
    valueFormat === 'currency' ? formatCurrency(v) : String(Math.round(v * 100) / 100)

  return (
    <div className={className ?? 'h-[280px] w-full min-w-0'}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ name, percent }) =>
              `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => fmt(Number(value ?? 0))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
