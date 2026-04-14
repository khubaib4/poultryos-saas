'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import type { CategoryBreakdownKey } from '@/lib/queries/expenses'
import { cn, formatCompactPkr } from '@/lib/utils'

const COLORS: Record<CategoryBreakdownKey, string> = {
  feed: '#F59E0B',
  labor: '#3B82F6',
  medicine: '#22C55E',
  utilities: '#8B5CF6',
  equipment: '#14B8A6',
  transport: '#EC4899',
  other: '#6B7280',
}

export interface CategoryBreakdownDatum {
  key: CategoryBreakdownKey
  name: string
  value: number
  percent: number
}

interface CategoryBreakdownChartProps {
  data: CategoryBreakdownDatum[]
  totalAmount: number
  className?: string
}

export function CategoryBreakdownChart({
  data,
  totalAmount,
  className,
}: CategoryBreakdownChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    fill: COLORS[d.key],
  }))

  return (
    <div className={cn('space-y-6', className)}>
      <div className="relative mx-auto h-[220px] w-full max-w-[280px]">
        {chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={88}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Total spend
              </span>
              <span className="text-xl font-bold text-gray-900">
                {formatCompactPkr(totalAmount)}
              </span>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-gray-500">
            No categorized spend yet
          </div>
        )}
      </div>

      {chartData.length > 0 && (
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
          {chartData.map((d) => (
            <li key={d.key} className="flex items-center gap-2 text-gray-700">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: COLORS[d.key] }}
                aria-hidden
              />
              <span className="font-medium">{d.name}</span>
              <span className="text-gray-500">({d.percent}%)</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
