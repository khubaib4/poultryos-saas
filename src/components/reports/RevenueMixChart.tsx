'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { chartColors, formatRsShort } from '@/lib/reports-chart-theme'

interface RevenueMixChartProps {
  wholesale: number
  retail: number
  direct: number
  wholesalePct: number
}

export function RevenueMixChart({
  wholesale,
  retail,
  direct,
  wholesalePct,
}: RevenueMixChartProps) {
  const data = [
    { name: 'Wholesaler', value: wholesale, color: chartColors.wholesale },
    { name: 'Retailer', value: retail, color: chartColors.retail },
    { name: 'Direct sale', value: direct, color: chartColors.direct },
  ].filter((d) => d.value > 0)

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">Revenue mix</h3>
      <p className="text-sm text-gray-500">Customer segmentation (selected range)</p>
      <div className="relative mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={88}
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatRsShort(Number(value ?? 0))}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-bold text-gray-900">{wholesalePct}%</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Wholesale
          </p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
              {d.name}
            </span>
            <span className="font-semibold text-gray-900">{formatRsShort(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
