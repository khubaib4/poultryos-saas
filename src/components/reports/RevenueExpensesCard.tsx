import { Sparkles } from 'lucide-react'
import { formatRsFull } from '@/lib/reports-chart-theme'

interface RevenueExpensesCardProps {
  revenue: number
  expenses: number
  revenueLabel?: string
  expensesLabel?: string
  insight: string
}

export function RevenueExpensesCard({
  revenue,
  expenses,
  revenueLabel = 'Monthly revenue',
  expensesLabel = 'Monthly expenses',
  insight,
}: RevenueExpensesCardProps) {
  const max = Math.max(revenue, expenses, 1)
  const revPct = (revenue / max) * 100
  const expPct = (expenses / max) * 100

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">Revenue vs expenses</h3>
      <p className="text-sm text-gray-500">Monthly budget performance</p>
      <div className="mt-6 space-y-5">
        <div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{revenueLabel}</span>
            <span className="font-semibold text-gray-900">{formatRsFull(revenue)}</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${revPct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{expensesLabel}</span>
            <span className="font-semibold text-gray-900">{formatRsFull(expenses)}</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-red-400"
              style={{ width: `${expPct}%` }}
            />
          </div>
        </div>
      </div>
      <div className="relative mt-6 overflow-hidden rounded-xl bg-emerald-50 p-4 pr-16">
        <Sparkles className="absolute right-3 top-3 h-8 w-8 text-emerald-600/30" />
        <p className="text-sm font-medium leading-relaxed text-emerald-900">{insight}</p>
      </div>
    </div>
  )
}
