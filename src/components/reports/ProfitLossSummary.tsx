import { formatRsShort } from '@/lib/reports-chart-theme'
import { cn } from '@/lib/utils'

interface Row {
  month: string
  label: string
  net: number
}

interface ProfitLossSummaryProps {
  rows: Row[]
}

export function ProfitLossSummary({ rows }: ProfitLossSummaryProps) {
  const max = Math.max(...rows.map((r) => Math.abs(r.net)), 1)

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-gray-900">Profit & loss summary</h3>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
          Real-time
        </span>
      </div>
      <ul className="mt-4 space-y-4">
        {rows.map((r) => {
          const w = (Math.abs(r.net) / max) * 100
          const positive = r.net >= 0
          return (
            <li key={r.month}>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{r.label}</span>
                <span
                  className={cn(
                    'font-semibold',
                    positive ? 'text-emerald-700' : 'text-red-600'
                  )}
                >
                  {formatRsShort(r.net)}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={cn(
                    'h-full rounded-full',
                    positive ? 'bg-emerald-500' : 'bg-red-400'
                  )}
                  style={{
                    width: `${w}%`,
                    marginLeft: positive ? 0 : `${100 - w}%`,
                  }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
