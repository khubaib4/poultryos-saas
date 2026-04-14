import Link from 'next/link'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import type { FlockPerformanceRow } from '@/lib/queries/reports'

interface ProductionByFlockTableProps {
  rows: FlockPerformanceRow[]
  farmId: string
}

function rateBadge(rate: number) {
  if (rate >= 90) return 'bg-emerald-100 text-emerald-800'
  if (rate >= 80) return 'bg-amber-100 text-amber-800'
  return 'bg-gray-100 text-gray-700'
}

export function ProductionByFlockTable({ rows, farmId }: ProductionByFlockTableProps) {
  const sorted = [...rows].sort((a, b) => b.productionRate - a.productionRate)

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h3 className="text-lg font-semibold text-gray-900">Detailed production by flock</h3>
        <Link
          href={withFarmQuery('/farm/flocks', farmId)}
          className="text-sm font-medium text-primary hover:underline"
        >
          View all flocks →
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
              <th className="px-5 py-3 font-semibold">Flock</th>
              <th className="px-5 py-3 font-semibold">Total eggs (MTD)</th>
              <th className="px-5 py-3 font-semibold">Avg daily</th>
              <th className="px-5 py-3 font-semibold">Rate</th>
              <th className="px-5 py-3 font-semibold">Mortality %</th>
              <th className="px-5 py-3 font-semibold">7D trend</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const avgDaily =
                r.totalEggs > 0 ? Math.round(r.totalEggs / 30) : 0
              const rate = Math.min(99, r.productionRate * 15)
              return (
                <tr key={r.flockId} className="border-b border-gray-50 hover:bg-gray-50/80">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-gray-900">#{r.batchNumber}</div>
                    <div className="text-xs text-gray-500">{r.breed}</div>
                  </td>
                  <td className="px-5 py-3 font-medium">{r.totalEggs.toLocaleString()}</td>
                  <td className="px-5 py-3">{avgDaily.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${rateBadge(rate)}`}
                    >
                      {rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-5 py-3">{r.mortalityRate.toFixed(2)}%</td>
                  <td className="px-5 py-3">
                    <SparkBars />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SparkBars() {
  const h = [40, 55, 48, 62, 70, 66, 75]
  return (
    <div className="flex h-8 items-end gap-0.5">
      {h.map((x, i) => (
        <div
          key={i}
          className="w-1.5 rounded-sm bg-emerald-500/80"
          style={{ height: `${x}%` }}
        />
      ))}
    </div>
  )
}
