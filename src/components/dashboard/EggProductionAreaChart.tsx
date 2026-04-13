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

export type EggChartPoint = { name: string; eggs: number }

interface EggProductionAreaChartProps {
  data: EggChartPoint[]
  /** Y-axis label for tooltip */
  valueLabel?: string
  className?: string
}

export function EggProductionAreaChart({
  data,
  valueLabel = 'Eggs',
  className,
}: EggProductionAreaChartProps) {
  const gid = useId().replace(/:/g, '')

  if (!data.length) {
    return (
      <div
        className={
          className ??
          'flex h-[240px] items-center justify-center rounded-xl bg-gray-50 text-sm text-gray-500'
        }
      >
        Not enough daily entries yet to show a trend.
      </div>
    )
  }

  return (
    <div className={className ?? 'h-[240px] w-full min-w-0'}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <defs>
            <linearGradient id={`eggFill-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6B7280', fontSize: 12 }}
            width={44}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v) => [
              typeof v === 'number' ? v.toLocaleString() : String(v ?? ''),
              valueLabel,
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
            name={valueLabel}
            stroke="#22C55E"
            strokeWidth={2}
            fill={`url(#eggFill-${gid})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: '#22C55E' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
