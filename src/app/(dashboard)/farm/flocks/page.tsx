import Link from 'next/link'
import {
  Bird,
  Calendar,
  Plus,
  CheckCircle2,
  Egg,
  TrendingUp,
  Feather,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { FlockCardActions } from '@/components/flocks/FlockCardActions'
import { FarmStatCard } from '@/components/dashboard/FarmStatCard'
import { FlocksFiltersBar } from '@/components/flocks/FlocksFiltersBar'
import { Progress } from '@/components/ui/progress'
import { getSessionProfile } from '@/lib/auth/session'
import { getFlocksManagementData, type FlockSortKey } from '@/lib/queries/flocks'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { formatFlockAge } from '@/lib/flock-utils'
import { formatDate } from '@/lib/utils'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import type { FlockStatus } from '@/types/database'

interface PageProps {
  searchParams: Promise<{ farm?: string; q?: string; status?: string; sort?: string }>
}

const STATUS_BADGE: Record<FlockStatus, string> = {
  active: 'bg-green-100 text-green-700',
  sold: 'bg-gray-100 text-gray-600',
  archived: 'bg-red-100 text-red-700',
}

export default async function WorkerFlocksPage({ searchParams }: PageProps) {
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={Bird}
        title="Select a farm"
        description="Choose an assigned farm from the header to view and manage flocks."
      />
    )
  }

  const farmName = assigned.find((f) => f.id === farmId)?.name ?? 'Farm'
  const { flocks: allFlocks, totals } = await getFlocksManagementData(farmId)
  const newPath = withFarmQuery('/farm/flocks/new', farmId)

  const q = (sp.q ?? '').trim()
  const status = (sp.status ?? 'all') as 'all' | FlockStatus
  const sort = (sp.sort ?? 'newest') as FlockSortKey

  let flocks = allFlocks
  if (status !== 'all') {
    flocks = flocks.filter((f) => f.status === status)
  }
  if (q) {
    const qq = q.toLowerCase()
    flocks = flocks.filter(
      (f) =>
        f.batch_number.toLowerCase().includes(qq) ||
        f.breed.toLowerCase().includes(qq)
    )
  }

  flocks = [...flocks].sort((a, b) => {
    if (sort === 'oldest') return a.created_at.localeCompare(b.created_at)
    if (sort === 'most-birds')
      return Number(b.current_count ?? 0) - Number(a.current_count ?? 0)
    if (sort === 'best-production')
      return (b.metrics.productionRatePct ?? 0) - (a.metrics.productionRatePct ?? 0)
    // newest
    return b.created_at.localeCompare(a.created_at)
  })

  const avgProductionLabel =
    totals.avgEggsPerBird7d > 0
      ? `${totals.avgEggsPerBird7d.toFixed(2)} eggs/bird`
      : '—'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Flocks</h2>
          <p className="mt-1 text-sm text-gray-500">Manage your poultry batches</p>
        </div>
        <Link href={newPath}>
          <Button variant="primarySimple" className="gap-2">
            <Plus className="h-4 w-4" />
            Add New Flock
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <FarmStatCard
          icon={<Bird className="h-6 w-6" aria-hidden />}
          iconBg="blue"
          label="Total flocks"
          value={totals.totalFlocks.toLocaleString()}
        />
        <FarmStatCard
          icon={<CheckCircle2 className="h-6 w-6" aria-hidden />}
          iconBg="green"
          label="Active flocks"
          value={totals.activeFlocks.toLocaleString()}
        />
        <FarmStatCard
          icon={<Egg className="h-6 w-6" aria-hidden />}
          iconBg="amber"
          label="Total birds"
          value={totals.totalBirds.toLocaleString()}
        />
        <FarmStatCard
          icon={<TrendingUp className="h-6 w-6" aria-hidden />}
          iconBg="purple"
          label="Avg production"
          value={avgProductionLabel}
          trend={{ value: 'Last 7 days', direction: 'steady' }}
        />
      </div>

      <FlocksFiltersBar
        farmId={farmId}
        initialQuery={q}
        initialStatus={status}
        initialSort={sort}
      />

      {flocks.length === 0 ? (
        <EmptyState
          icon={Bird}
          title={q || status !== 'all' ? 'No matching flocks' : 'No flocks yet'}
          description={
            q || status !== 'all'
              ? 'Try adjusting your filters.'
              : 'Start by adding your first flock to track production.'
          }
          action={
            <Link href={newPath}>
              <Button variant="primarySimple" className="gap-1.5">
                <Plus className="h-4 w-4" />
                {q || status !== 'all' ? 'Add new flock' : 'Add Your First Flock'}
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {flocks.map((flock) => (
            <Card
              key={flock.id}
              className="relative overflow-hidden transition-shadow hover:shadow-card-md"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={withFarmQuery(`/farm/flocks/${flock.id}`, farmId)}
                      className="block"
                    >
                      <p className="truncate text-base font-semibold text-gray-900 hover:text-primary-dark">
                        {flock.batch_number}
                      </p>
                    </Link>
                    <p className="mt-0.5 text-xs text-gray-500 truncate">
                      {flock.breed}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge className={STATUS_BADGE[flock.status]}>
                      {flock.status.charAt(0).toUpperCase() +
                        flock.status.slice(1)}
                    </Badge>
                    <FlockCardActions
                      flockId={flock.id}
                      flockLabel={flock.batch_number}
                      farmId={farmId}
                      navBase="farm"
                    />
                  </div>
                </div>
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                        <Feather className="h-4 w-4 text-gray-700" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Breed</p>
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {flock.breed}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                        <Calendar className="h-4 w-4 text-gray-700" aria-hidden />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Age</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatFlockAge(
                            flock.arrival_date,
                            flock.age_at_arrival
                          )}{' '}
                          old
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                        <Bird className="h-4 w-4 text-gray-700" aria-hidden />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Bird count</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {Number(flock.current_count ?? 0).toLocaleString()} birds
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                        Daily eggs
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {flock.metrics.dailyEggs.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                        Mortality
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {flock.metrics.mortalityRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                        Feed/day
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {flock.metrics.feedPerDayKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        Production Rate: {flock.metrics.productionRatePct}%
                      </span>
                      <span className="text-xs text-gray-400">
                        Added: {formatDate(flock.created_at)}
                      </span>
                    </div>
                    <Progress
                      value={flock.metrics.productionRatePct}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      Added: {formatDate(flock.created_at)}
                    </span>
                    <Link
                      href={withFarmQuery(`/farm/flocks/${flock.id}`, farmId)}
                      className="text-sm font-semibold text-primary hover:text-primary-dark"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
