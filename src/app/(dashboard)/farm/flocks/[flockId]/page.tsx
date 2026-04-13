import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Bird,
  Skull,
  Percent,
  Egg,
  Calendar,
  ClipboardList,
  Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { StatCard } from '@/components/shared/StatCard'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getFlock,
  getFlockStats,
  getFlockRecentEntries,
} from '@/lib/queries/flocks'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { formatFlockAge } from '@/lib/flock-utils'
import { formatDate } from '@/lib/utils'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { DeleteFlockButton } from '@/components/flocks/DeleteFlockButton'
import type { FlockStatus } from '@/types/database'

interface PageProps {
  params: Promise<{ flockId: string }>
  searchParams: Promise<{ farm?: string }>
}

const STATUS_BADGE: Record<FlockStatus, string> = {
  active: 'bg-primary-light text-primary-dark hover:bg-primary-light',
  sold: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  archived: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
}

export default async function WorkerFlockDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { flockId } = await params
  const sp = await searchParams
  const { profile } = await getSessionProfile()
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) notFound()

  const flock = await getFlock(flockId)
  if (!flock || flock.farm_id !== farmId) notFound()
  if (!assigned.some((f) => f.id === farmId)) notFound()

  const [stats, recentEntries] = await Promise.all([
    getFlockStats(flockId),
    getFlockRecentEntries(flockId, 7),
  ])

  const dailyListWithFlock = `/farm/daily-entry?farm=${encodeURIComponent(farmId)}&flockId=${encodeURIComponent(flockId)}`
  const listPath = withFarmQuery('/farm/flocks', farmId)

  const editPath = withFarmQuery(`/farm/flocks/${flockId}/edit`, farmId)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href={listPath}>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            All Flocks
          </Button>
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link href={editPath}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </Link>
          <DeleteFlockButton
            flockId={flockId}
            flockLabel={flock.batch_number}
            farmId={farmId}
            variant="button"
            navBase="farm"
          />
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">
                {flock.batch_number}
              </h2>
              <Badge className={STATUS_BADGE[flock.status]}>
                {flock.status.charAt(0).toUpperCase() + flock.status.slice(1)}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500">{flock.breed}</p>
          </div>
          <div className="text-sm text-gray-500 sm:text-right">
            <p>
              Arrived{' '}
              <span className="text-gray-700 font-medium">
                {formatDate(flock.arrival_date)}
              </span>
            </p>
            <p className="mt-0.5">
              Age at arrival: {flock.age_at_arrival} day
              {flock.age_at_arrival === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {flock.notes && (
          <>
            <Separator className="my-4" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Notes
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                {flock.notes}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Current Birds"
          value={stats.current_count.toLocaleString()}
          description={`of ${flock.initial_count.toLocaleString()} initial`}
          icon={Bird}
        />
        <StatCard
          title="Total Deaths"
          value={stats.total_deaths.toLocaleString()}
          description="Cumulative losses"
          icon={Skull}
        />
        <StatCard
          title="Mortality Rate"
          value={`${stats.mortality_rate}%`}
          description="of initial flock"
          icon={Percent}
        />
        <StatCard
          title="Avg Daily Production"
          value={stats.avg_daily_production.toLocaleString()}
          description={
            stats.recorded_days > 0
              ? `eggs/day over ${stats.recorded_days} day${
                  stats.recorded_days === 1 ? '' : 's'
                }`
              : 'No entries yet'
          }
          icon={Egg}
        />
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Current Age
            </p>
            <p className="text-base font-semibold text-gray-900">
              {formatFlockAge(flock.arrival_date, flock.age_at_arrival)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Last 7 Daily Entries</CardTitle>
          <Link href={dailyListWithFlock}>
            <Button variant="ghost" size="sm" className="text-primary h-7">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <ClipboardList className="h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                No daily entries recorded yet.
              </p>
              <Link href={withFarmQuery('/farm/daily-entry/new', farmId)}>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 gap-1.5"
                >
                  Record First Entry
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-0">
              <div className="grid grid-cols-4 border-b pb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                <span>Date</span>
                <span className="text-right">Eggs</span>
                <span className="text-right">Deaths</span>
                <span className="text-right">Feed (kg)</span>
              </div>
              {recentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-4 border-b py-3 text-sm last:border-0"
                >
                  <span className="text-gray-600">
                    {formatDate(entry.date)}
                  </span>
                  <span className="text-right font-medium text-gray-900">
                    {(entry.eggs_collected ?? 0).toLocaleString()}
                  </span>
                  <span
                    className={`text-right ${
                      (entry.deaths ?? 0) > 0
                        ? 'text-red-600 font-medium'
                        : 'text-gray-500'
                    }`}
                  >
                    {entry.deaths ?? 0}
                  </span>
                  <span className="text-right text-gray-600">
                    {entry.feed_consumed ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />
      <p className="text-xs text-gray-400">
        Flock created {formatDate(flock.created_at)}
      </p>
    </div>
  )
}
