import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import type { Flock } from '@/types/database'
import type { VaccinationStatusTab } from '@/lib/queries/vaccinations'
import { cn } from '@/lib/utils'

const STATUS_TABS: { key: VaccinationStatusTab; label: string }[] = [
  { key: 'all', label: 'All status' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'completed', label: 'Completed' },
  { key: 'overdue', label: 'Overdue' },
]

interface VaccinationFiltersProps {
  farmId: string
  flocks: Flock[]
  selectedFlockId: string
  statusTab: VaccinationStatusTab
}

function extraParams(
  flockId: string,
  status: VaccinationStatusTab
): Record<string, string> {
  const e: Record<string, string> = {}
  if (flockId && flockId !== 'all') e.flock = flockId
  if (status !== 'all') e.status = status
  return e
}

export function VaccinationFilters({
  farmId,
  flocks,
  selectedFlockId,
  statusTab,
}: VaccinationFiltersProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        Quick filters
      </p>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <form
          method="get"
          action="/farm/vaccinations"
          className="flex flex-wrap items-end gap-3"
        >
          <input type="hidden" name="farm" value={farmId} />
          {statusTab !== 'all' ? (
            <input type="hidden" name="status" value={statusTab} />
          ) : null}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500" htmlFor="vf-flock">
              Flock selection
            </label>
            <select
              id="vf-flock"
              name="flock"
              defaultValue={selectedFlockId === 'all' ? '' : selectedFlockId}
              className="h-10 min-w-[200px] rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <option value="">All active flocks</option>
              {flocks.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.batch_number} — {f.breed}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="secondary" size="sm" className="rounded-xl">
            Apply
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map(({ key, label }) => {
            const active = statusTab === key
            return (
              <Link
                key={key}
                href={withFarmQuery(
                  '/farm/vaccinations',
                  farmId,
                  extraParams(selectedFlockId, key)
                )}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
