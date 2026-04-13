import Link from 'next/link'
import { Suspense } from 'react'
import { format, startOfMonth } from 'date-fns'
import { Plus, Egg, Skull, Wheat, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { DailyEntriesFilters } from '@/components/daily-entries/DailyEntriesFilters'
import { DailyEntryRowActions } from '@/components/daily-entries/DailyEntryRowActions'
import {
  DailyEntryEggCell,
  formatDailyEntryDate,
} from '@/components/daily-entries/daily-entry-list-parts'
import { getSessionProfile } from '@/lib/auth/session'
import { getFlocks } from '@/lib/queries/flocks'
import {
  getDailyEntriesList,
  getDailyEntrySummary,
} from '@/lib/queries/daily-entries'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { OfflineDailyEntriesSection } from '@/components/daily-entries/OfflineDailyEntriesSection'

interface PageProps {
  searchParams: Promise<{
    farm?: string
    from?: string
    to?: string
    flockId?: string
  }>
}

function defaultRange() {
  const end = format(new Date(), 'yyyy-MM-dd')
  const start = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  return { start, end }
}

function FiltersFallback() {
  return <div className="h-24 animate-pulse rounded-xl border bg-muted/40" />
}

export default async function WorkerDailyEntryListPage({
  searchParams,
}: PageProps) {
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Select a farm"
        description="Choose an assigned farm from the header to view daily entries."
      />
    )
  }

  const farmName = assigned.find((f) => f.id === farmId)?.name ?? 'Farm'
  const { start: defaultFrom, end: defaultTo } = defaultRange()
  let from = sp.from ?? defaultFrom
  let to = sp.to ?? defaultTo
  if (from > to) {
    const t = from
    from = to
    to = t
  }
  const flockFilter = sp.flockId?.length ? sp.flockId : undefined

  const [flocks, entries, summary] = await Promise.all([
    getFlocks(farmId),
    getDailyEntriesList(farmId, {
      startDate: from,
      endDate: to,
      flockId: flockFilter,
    }),
    getDailyEntrySummary(farmId, from, to, flockFilter),
  ])

  const flockLabelById = new Map(flocks.map((f) => [String(f.id), f.batch_number]))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Entries"
        description={farmName}
        action={
          <Link href={withFarmQuery('/farm/daily-entry/new', farmId)}>
            <Button variant="primarySimple">
              <Plus className="mr-2 h-4 w-4" />
              Add Entry
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Eggs"
          value={summary.totalEggs.toLocaleString()}
          description={`${from} → ${to}`}
          icon={Egg}
        />
        <StatCard
          title="Total Deaths"
          value={summary.totalDeaths.toLocaleString()}
          description="Recorded in range"
          icon={Skull}
        />
        <StatCard
          title="Total Feed"
          value={`${summary.totalFeed.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`}
          description="Feed consumed"
          icon={Wheat}
        />
        <StatCard
          title="Entry Count"
          value={summary.entryCount}
          description="Rows in range"
          icon={ClipboardList}
        />
      </div>

      <Suspense fallback={<FiltersFallback />}>
        <DailyEntriesFilters
          farmId={farmId}
          flocks={flocks}
          defaultFrom={defaultFrom}
          defaultTo={defaultTo}
          variant="farm"
        />
      </Suspense>

      {entries.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No entries in this range"
          description="Adjust filters or add a daily entry."
          action={
            <Link href={withFarmQuery('/farm/daily-entry/new', farmId)}>
              <Button variant="primarySimple">
                <Plus className="mr-2 h-4 w-4" />
                Add Entry
              </Button>
            </Link>
          }
        />
      ) : (
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Flock</TableHead>
                <TableHead>Eggs</TableHead>
                <TableHead>Deaths</TableHead>
                <TableHead>Feed (kg)</TableHead>
                <TableHead className="w-[52px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((row) => {
                const batch = flockLabelById.get(String(row.flock_id)) ?? '—'
                const deaths = row.deaths ?? 0
                const feed = row.feed_consumed
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-gray-900 whitespace-nowrap">
                      {formatDailyEntryDate(row.date)}
                    </TableCell>
                    <TableCell>{batch}</TableCell>
                    <TableCell className="max-w-[200px] whitespace-normal">
                      <DailyEntryEggCell row={row} />
                    </TableCell>
                    <TableCell>
                      <div>
                        <span
                          className={
                            deaths > 0
                              ? 'font-medium text-red-600'
                              : 'text-gray-600'
                          }
                        >
                          {deaths}
                        </span>
                        {deaths > 0 && row.death_cause && (
                          <p className="text-xs text-gray-500">
                            {row.death_cause}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {feed != null
                        ? Number(feed).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DailyEntryRowActions
                        farmId={farmId}
                        entryId={row.id}
                        flockLabel={batch}
                        entryDateLabel={formatDailyEntryDate(row.date)}
                        variant="farm"
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <OfflineDailyEntriesSection farmId={farmId} from={from} to={to} />
    </div>
  )
}
