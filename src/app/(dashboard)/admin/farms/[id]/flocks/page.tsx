import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Bird, Calendar, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { getSessionProfile } from '@/lib/auth/session'
import { getFarm } from '@/lib/queries/farms'
import { getFlocks } from '@/lib/queries/flocks'
import { formatFlockAge } from '@/lib/flock-utils'
import { formatDate } from '@/lib/utils'
import type { FlockStatus } from '@/types/database'

interface FlocksPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ status?: string }>
}

const STATUS_TABS: { label: string; value: FlockStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Sold', value: 'sold' },
  { label: 'Archived', value: 'archived' },
]

const STATUS_BADGE: Record<FlockStatus, string> = {
  active: 'bg-primary-light text-primary-dark hover:bg-primary-light',
  sold: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  archived: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
}

export default async function AdminFlocksReadOnlyPage({
  params,
  searchParams,
}: FlocksPageProps) {
  const { id: farmId } = await params
  const { status: statusParam } = await searchParams
  const { profile } = await getSessionProfile()

  const farm = await getFarm(farmId)
  if (!farm || farm.organization_id !== profile.organization_id) notFound()

  const allFlocks = await getFlocks(farmId)

  const activeTab: FlockStatus | 'all' =
    statusParam === 'active' ||
    statusParam === 'sold' ||
    statusParam === 'archived'
      ? statusParam
      : 'all'

  const flocks =
    activeTab === 'all'
      ? allFlocks
      : allFlocks.filter((f) => f.status === activeTab)

  return (
    <div className="space-y-6">
      <Link href={`/admin/farms/${farmId}`}>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back to Farm
        </Button>
      </Link>

      <div className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 sm:flex-row sm:items-center">
        <Info className="h-5 w-5 shrink-0 text-blue-600" />
        <p className="text-sm text-blue-900">
          <span className="font-medium">View only.</span> Flocks are created and
          updated by assigned farm workers from the Farm portal. Use this list
          for oversight and reports.
        </p>
      </div>

      <PageHeader
        title="Flocks"
        description={`All flocks at ${farm.name}`}
      />

      <div className="flex flex-wrap gap-1 rounded-lg border bg-white p-1 w-fit">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === 'all'
              ? allFlocks.length
              : allFlocks.filter((f) => f.status === tab.value).length
          const isActive = activeTab === tab.value
          return (
            <Link
              key={tab.value}
              href={
                tab.value === 'all'
                  ? `/admin/farms/${farmId}/flocks`
                  : `/admin/farms/${farmId}/flocks?status=${tab.value}`
              }
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-lighter text-primary-dark'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs text-gray-400">({count})</span>
            </Link>
          )
        })}
      </div>

      {flocks.length === 0 ? (
        <EmptyState
          icon={Bird}
          title={
            activeTab === 'all' ? 'No flocks yet' : `No ${activeTab} flocks`
          }
          description={
            activeTab === 'all'
              ? 'Farm workers add flocks from their Farm dashboard when they are ready to start a batch.'
              : 'Try a different filter.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {flocks.map((flock) => (
            <Link
              key={flock.id}
              href={`/admin/farms/${farmId}/flocks/${flock.id}`}
              className="block"
            >
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate group-hover:text-primary-dark">
                        {flock.batch_number}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 truncate">
                        {flock.breed}
                      </p>
                    </div>
                    <Badge className={STATUS_BADGE[flock.status]}>
                      {flock.status.charAt(0).toUpperCase() +
                        flock.status.slice(1)}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded bg-white">
                        <Bird className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Birds</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {flock.current_count.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded bg-white">
                        <Calendar className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Age</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatFlockAge(
                            flock.arrival_date,
                            flock.age_at_arrival
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-gray-400">
                    Arrived {formatDate(flock.arrival_date)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
