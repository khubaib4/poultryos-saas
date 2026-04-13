import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MapPin, Pencil, Bird, Egg, TrendingUp, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { StatCard } from '@/components/shared/StatCard'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getFarm,
  getFarmStats,
  getFarmRecentActivity,
  getFarmWorkers,
} from '@/lib/queries/farms'
import { FarmWorkersPanel } from '@/components/farms/FarmWorkersPanel'
import { getFlocks } from '@/lib/queries/flocks'
import { formatFlockAge } from '@/lib/flock-utils'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { FlockStatus } from '@/types/database'

const FLOCK_STATUS_BADGE: Record<FlockStatus, string> = {
  active: 'bg-primary-light text-primary-dark hover:bg-primary-light',
  sold: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  archived: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
}

interface FarmDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function FarmDetailPage({ params }: FarmDetailPageProps) {
  const { id } = await params
  const { profile } = await getSessionProfile()

  const [farm, stats, activity, flocks, workers] = await Promise.all([
    getFarm(id),
    getFarmStats(id, profile.organization_id ?? ''),
    getFarmRecentActivity(id),
    getFlocks(id),
    getFarmWorkers(id),
  ])

  if (!farm || farm.organization_id !== profile.organization_id) notFound()

  const previewFlocks = flocks.slice(0, 4)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/farms">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            All Farms
          </Button>
        </Link>
        <Link href={`/admin/farms/${farm.id}/edit`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Pencil className="h-4 w-4" />
            Edit Farm
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-white border p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">{farm.name}</h2>
            <Badge
              className={
                farm.status === 'ACTIVE'
                  ? 'bg-primary-light text-primary-dark hover:bg-primary-light'
                  : 'bg-gray-100 text-gray-600'
              }
            >
              {farm.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          {farm.location && (
            <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
              <MapPin className="h-3.5 w-3.5" />
              {farm.location}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-900">
        <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
        <p>
          <span className="font-medium">Operational data is managed by farm workers</span>{' '}
          from the Farm workspace (daily entry, sales, flocks, inventory, and
          vaccinations). This page is an overview for organization admins.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Flocks"
          value={stats.active_flocks}
          description="Currently active batches"
          icon={Bird}
        />
        <StatCard
          title="Total Birds"
          value={stats.total_birds.toLocaleString()}
          description="Alive count"
          icon={Bird}
        />
        <StatCard
          title="Today's Eggs"
          value={stats.today_eggs.toLocaleString()}
          description="Collected today"
          icon={Egg}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats.monthly_revenue)}
          description="Sales this month"
          icon={TrendingUp}
        />
      </div>

      <FarmWorkersPanel farmId={farm.id} workers={workers} />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-2 pb-3">
          <div>
            <CardTitle className="text-base">Flocks</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {flocks.length} batch{flocks.length === 1 ? '' : 'es'} ·{' '}
              <Link
                href={`/admin/farms/${farm.id}/flocks`}
                className="text-primary-dark font-medium hover:underline"
              >
                View read-only list
              </Link>
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {flocks.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Bird className="h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No flocks at this farm yet.</p>
              <p className="mt-1 max-w-sm text-xs text-gray-400">
                Batches are created by assigned farm workers from the Farm portal.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {previewFlocks.map((flock) => (
                <div
                  key={flock.id}
                  className="rounded-lg border p-3 bg-gray-50/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-900 truncate">
                      {flock.batch_number}
                    </p>
                    <Badge className={FLOCK_STATUS_BADGE[flock.status]}>
                      {flock.status.charAt(0).toUpperCase() + flock.status.slice(1)}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 truncate">{flock.breed}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      <Bird className="mr-1 inline h-3 w-3" />
                      {flock.current_count.toLocaleString()}
                    </span>
                    <span>
                      {formatFlockAge(flock.arrival_date, flock.age_at_arrival)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Daily Entries</CardTitle>
            <p className="text-xs text-muted-foreground font-normal">
              Snapshot only — workers maintain entries in the Farm portal.
            </p>
          </CardHeader>
          <CardContent>
            {activity.entries.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                No daily entries yet.
              </p>
            ) : (
              <div className="space-y-0">
                <div className="grid grid-cols-3 border-b pb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <span>Date</span>
                  <span className="text-right">Eggs</span>
                  <span className="text-right">Deaths</span>
                </div>
                {activity.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="grid grid-cols-3 border-b py-3 text-sm last:border-0"
                  >
                    <span className="text-gray-600">{formatDate(entry.date)}</span>
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
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Sales</CardTitle>
            <p className="text-xs text-muted-foreground font-normal">
              Snapshot only — workers record sales in the Farm portal.
            </p>
          </CardHeader>
          <CardContent>
            {activity.sales.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                No sales recorded yet.
              </p>
            ) : (
              <div className="space-y-0">
                <div className="grid grid-cols-3 border-b pb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <span>Date</span>
                  <span>Customer</span>
                  <span className="text-right">Amount</span>
                </div>
                {activity.sales.map((sale) => {
                  const row = sale as {
                    id: string
                    sale_date: string
                    customer_name?: string | null
                    total_amount?: number | null
                    amount?: number | null
                    customers?: { name?: string } | null
                  }
                  const label = row.customers?.name ?? row.customer_name ?? '—'
                  const amt = Number(row.total_amount ?? row.amount ?? 0)
                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-3 border-b py-3 text-sm last:border-0"
                    >
                      <span className="text-gray-600">
                        {formatDate(row.sale_date)}
                      </span>
                      <span className="text-gray-700 truncate pr-2">{label}</span>
                      <span className="text-right font-medium text-gray-900">
                        {formatCurrency(amt)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />
      <p className="text-xs text-gray-400">Farm created {formatDate(farm.created_at)}</p>
    </div>
  )
}
