'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { CHART_AXIS, CHART_GREEN, CHART_GREEN_MUTED } from '@/components/charts/chart-theme'

interface Point {
  name: string
  cumulative?: number
  [key: string]: string | number | undefined
}

interface ReportsAreaChartProps {
  data: Point[]
  dataKey?: string
  name?: string
  className?: string
}

export function ReportsAreaChart({
  data,
  dataKey = 'cumulative',
  name = 'Cumulative',
  className,
}: ReportsAreaChartProps) {
  return (
    <div className={className ?? 'h-[260px] w-full min-w-0'}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <defs>
            <linearGradient id="repArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_GREEN} stopOpacity={0.35} />
              <stop offset="95%" stopColor={CHART_GREEN_MUTED} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
          <XAxis dataKey="name" tick={{ fill: CHART_AXIS, fontSize: 11 }} />
          <YAxis tick={{ fill: CHART_AXIS, fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey={dataKey}
            name={name}
            stroke={CHART_GREEN}
            fillOpacity={1}
            fill="url(#repArea)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
