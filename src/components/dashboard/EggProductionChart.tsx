'use client'

import { useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { FarmWeeklyEggPoint } from '@/lib/queries/farm-dashboard'

interface EggProductionChartProps {
  data: FarmWeeklyEggPoint[]
  className?: string
}

export function EggProductionChart({ data, className }: EggProductionChartProps) {
  const gid = useId().replace(/:/g, '')
  const chartData = data.map(({ name, eggs }) => ({ name, eggs }))

  if (!chartData.length) {
    return (
      <div
        className={
          className ??
          'flex h-[280px] items-center justify-center rounded-xl bg-gray-50 text-sm text-gray-500'
        }
      >
        No egg data for this week yet.
      </div>
    )
  }

  return (
    <div className={className ?? 'h-[280px] w-full min-w-0'}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id={`eggLineFill-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6B7280', fontSize: 12 }}
            width={40}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(v) => [
              typeof v === 'number' ? v.toLocaleString() : String(v ?? ''),
              'Eggs',
            ]}
            contentStyle={{
              borderRadius: 12,
              border: 'none',
              borderTop: '3px solid #22C55E',
              boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
              fontSize: 13,
            }}
            labelStyle={{ color: '#1F2937', fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey="eggs"
            name="Eggs"
            stroke="#22C55E"
            strokeWidth={2.5}
            fill={`url(#eggLineFill-${gid})`}
            dot={{
              r: 4,
              fill: '#fff',
              stroke: '#22C55E',
              strokeWidth: 2,
            }}
            activeDot={{ r: 5, strokeWidth: 0, fill: '#22C55E' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
