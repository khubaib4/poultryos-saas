'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { CHART_AXIS, CHART_GREEN } from '@/components/charts/chart-theme'

interface Point {
  name: string
  [key: string]: string | number
}

interface ReportsLineChartProps {
  data: Point[]
  lines: { key: string; name: string; color?: string }[]
  valueFormat?: 'currency' | 'number'
  className?: string
}

export function ReportsLineChart({
  data,
  lines,
  valueFormat = 'number',
  className,
}: ReportsLineChartProps) {
  const fmt = (v: number) =>
    valueFormat === 'currency' ? formatCurrency(v) : String(Math.round(v * 100) / 100)

  return (
    <div className={className ?? 'h-[280px] w-full min-w-0'}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
          <XAxis dataKey="name" tick={{ fill: CHART_AXIS, fontSize: 11 }} />
          <YAxis tick={{ fill: CHART_AXIS, fontSize: 11 }} />
          <Tooltip
            formatter={(value) => fmt(Number(value ?? 0))}
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {lines.map((ln) => (
            <Line
              key={ln.key}
              type="monotone"
              dataKey={ln.key}
              name={ln.name}
              stroke={ln.color ?? CHART_GREEN}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
