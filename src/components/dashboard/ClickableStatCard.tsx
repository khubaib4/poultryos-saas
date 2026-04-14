'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Period = '1w' | '1m' | '3m' | '6m'

interface ClickableStatCardProps {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string | number
  trend?: { value: string; direction: 'up' | 'down' | 'steady' }
  farmId: string
  statType: 'eggs' | 'deaths' | 'sales' | 'birds'
}

const periodLabels: Record<Period, string> = {
  '1w': '1 Week',
  '1m': '1 Month',
  '3m': '3 Months',
  '6m': '6 Months',
}

const chartColors: Record<ClickableStatCardProps['statType'], string> = {
  eggs: '#22C55E',
  deaths: '#EF4444',
  sales: '#3B82F6',
  birds: '#8B5CF6',
}

export function ClickableStatCard({
  icon,
  iconBg,
  label,
  value,
  trend,
  farmId,
  statType,
}: ClickableStatCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [period, setPeriod] = useState<Period>('1w')
  const [chartData, setChartData] = useState<{ date: string; value: number }[]>(
    []
  )
  const [loading, setLoading] = useState(false)

  const color = chartColors[statType]

  const formatValue = (v: number) => {
    if (statType === 'sales') {
      return `Rs ${v.toLocaleString('en-PK', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`
    }
    return v.toLocaleString()
  }

  const totals = useMemo(() => {
    const total = chartData.reduce((sum, d) => sum + (d.value ?? 0), 0)
    const avg = chartData.length ? total / chartData.length : 0
    const peak = chartData.reduce((m, d) => Math.max(m, d.value ?? 0), 0)
    return { total, avg, peak }
  }, [chartData])

  async function fetchChartData(selected: Period) {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/farm/stats-trend?farmId=${encodeURIComponent(farmId)}&type=${encodeURIComponent(
          statType
        )}&period=${encodeURIComponent(selected)}`,
        { cache: 'no-store' }
      )
      const j = (await res.json()) as { trend?: { date: string; value: number }[] }
      setChartData(j.trend ?? [])
    } catch (e) {
      console.error(e)
      setChartData([])
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    setIsOpen(true)
  }

  useEffect(() => {
    if (!isOpen) return
    fetchChartData(period)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  function handlePeriodChange(p: Period) {
    setPeriod(p)
    fetchChartData(p)
  }

  const trendClass =
    trend?.direction === 'up'
      ? 'text-emerald-600'
      : trend?.direction === 'down'
        ? 'text-red-600'
        : 'text-gray-500'

  const trendPrefix =
    trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '—'

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="w-full text-left rounded-2xl border border-transparent bg-white p-5 shadow-sm transition-shadow hover:shadow-md hover:border-primary/20"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              {value}
            </p>
          </div>
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
              iconBg
            )}
          >
            {icon}
          </div>
        </div>
        {trend ? (
          <p className={cn('mt-3 text-sm font-medium', trendClass)}>
            {trendPrefix} {trend.value}
          </p>
        ) : null}
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>{label} trend</DialogTitle>
          </DialogHeader>

          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(periodLabels) as Period[]).map((p) => (
              <Button
                key={p}
                type="button"
                size="sm"
                variant={period === p ? 'primarySimple' : 'outline'}
                onClick={() => handlePeriodChange(p)}
              >
                {periodLabels[p]}
              </Button>
            ))}
          </div>

          <div className="mt-4 h-72 rounded-2xl border border-gray-100 bg-white">
            {loading ? (
              <div className="p-5">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="mt-4 h-52 w-full rounded-2xl" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id={`grad-${statType}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(d) => {
                      const dd = new Date(String(d))
                      return period === '1w' ? format(dd, 'EEE') : format(dd, 'MMM d')
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => [formatValue(Number(v ?? 0)), label]}
                    labelFormatter={(d) => format(new Date(String(d)), 'PPP')}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#grad-${statType})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-100 pt-4">
            <div className="text-center">
              <p className="text-xs font-medium text-gray-500">Total</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {formatValue(totals.total)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-gray-500">Average</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {formatValue(Math.round(totals.avg))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-gray-500">Peak</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {formatValue(totals.peak)}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

