import Link from 'next/link'
import { format, isYesterday, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDailyEntriesList } from '@/lib/queries/daily-entries'
import { getFlocks } from '@/lib/queries/flocks'
import { withFarmQuery } from '@/lib/farm-worker-nav'

function historyLabel(dateIso: string): string {
  try {
    const d = parseISO(dateIso)
    if (isYesterday(d)) return 'YESTERDAY'
    return format(d, 'dd MMM').toUpperCase()
  } catch {
    return dateIso
  }
}

export async function RecentHistory({ farmId }: { farmId: string }) {
  const [entries, flocks] = await Promise.all([
    getDailyEntriesList(farmId),
    getFlocks(farmId),
  ])
  const flockLabelById = new Map(flocks.map((f) => [String(f.id), f.batch_number]))
  const listPath = withFarmQuery('/farm/daily-entry', farmId)

  return (
    <Card className="shadow-sm ring-1 ring-black/[0.04]">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-700">
          Recent history
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {entries.length === 0 ? (
          <p className="text-sm text-gray-500">No entries yet.</p>
        ) : (
          <div className="space-y-4">
            {entries.slice(0, 2).map((e) => {
              const label = flockLabelById.get(String(e.flock_id)) ?? 'Flock'
              const eggs = Number(e.eggs_collected ?? 0)
              const deaths = Number(e.deaths ?? 0)
              return (
                <div key={e.id} className="rounded-xl bg-gray-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    {historyLabel(e.date)}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">
                    {eggs.toLocaleString()} Eggs
                    <span className="ml-1 font-normal text-gray-700">Collected</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-600">{label}</p>
                  <p className="mt-2 text-xs text-gray-500">
                    • {deaths} Mortality
                  </p>
                </div>
              )
            })}
          </div>
        )}

        <Link href={listPath} className="block">
          <Button variant="outline" className="w-full rounded-xl shadow-sm">
            View Logbook
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

