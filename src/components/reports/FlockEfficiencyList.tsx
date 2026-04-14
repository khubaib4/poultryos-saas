import { chartColors } from '@/lib/reports-chart-theme'

interface FlockEfficiencyListProps {
  items: { id: string; label: string; breed: string; efficiency: number }[]
  bestFcr: number
  avgMortality: number
}

export function FlockEfficiencyList({
  items,
  bestFcr,
  avgMortality,
}: FlockEfficiencyListProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">Flock efficiency</h3>
      <p className="text-sm text-gray-500">Benchmarking active flocks</p>
      <ul className="mt-4 space-y-4">
        {items.map((f) => (
          <li key={f.id}>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-900">
                {f.label}{' '}
                <span className="font-normal text-gray-500">({f.breed})</span>
              </span>
              <span className="font-semibold text-emerald-700">{f.efficiency.toFixed(1)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, f.efficiency)}%`,
                  background: chartColors.primary,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-4 border-t border-gray-100 pt-4 text-xs font-semibold">
        <span className="text-emerald-700">Best feed FCR: {bestFcr.toFixed(2)}</span>
        <span className="text-gray-600">Avg mortality: {avgMortality.toFixed(2)}%</span>
      </div>
    </div>
  )
}
