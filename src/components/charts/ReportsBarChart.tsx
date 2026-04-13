'use client'

import {
  BarChart,
  Bar,
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

interface ReportsBarChartProps {
  data: Point[]
  bars: { key: string; name: string; color?: string }[]
  valueFormat?: 'currency' | 'number'
  className?: string
}

export function ReportsBarChart({
  data,
  bars,
  valueFormat = 'number',
  className,
}: ReportsBarChartProps) {
  const fmt = (v: number) =>
    valueFormat === 'currency' ? formatCurrency(v) : String(Math.round(v * 100) / 100)

  return (
    <div className={className ?? 'h-[280px] w-full min-w-0'}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
          <XAxis dataKey="name" tick={{ fill: CHART_AXIS, fontSize: 11 }} />
          <YAxis tick={{ fill: CHART_AXIS, fontSize: 11 }} />
          <Tooltip
            formatter={(value) =>
              fmt(Number(value ?? 0))
            }
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {bars.map((b) => (
            <Bar
              key={b.key}
              dataKey={b.key}
              name={b.name}
              fill={b.color ?? CHART_GREEN}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
