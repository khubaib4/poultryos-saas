import Link from 'next/link'
import {
  Syringe,
  Plus,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { VaccinationStatusBadge } from '@/components/vaccinations/VaccinationStatusBadge'
import { VaccinationRowActions } from '@/components/vaccinations/VaccinationRowActions'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import {
  getVaccinations,
  getVaccinationSummary,
  getOverdueVaccinations,
  getVaccinationDisplayStatus,
} from '@/lib/queries/vaccinations'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn, formatDate } from '@/lib/utils'

const FILTER_TABS = ['All', 'Scheduled', 'Completed', 'Skipped'] as const

interface PageProps {
  searchParams: Promise<{
    farm?: string
    status?: string
  }>
}

function tabToFilter(
  tab: string
): 'all' | 'scheduled' | 'completed' | 'skipped' {
  const t = tab.toLowerCase()
  if (t === 'scheduled') return 'scheduled'
  if (t === 'completed') return 'completed'
  if (t === 'skipped') return 'skipped'
  return 'all'
}

export default async function FarmVaccinationsPage({ searchParams }: PageProps) {
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={Syringe}
        title="Select a farm"
        description="Choose an assigned farm from the header to view vaccinations."
      />
    )
  }

  const activeFarmId = farmId
  const farmName = assigned.find((f) => f.id === activeFarmId)?.name ?? 'Farm'

  const rawTab = sp.status?.trim() ?? ''
  const tabLabel =
    rawTab && FILTER_TABS.some((t) => t.toLowerCase() === rawTab.toLowerCase())
      ? (FILTER_TABS.find((t) => t.toLowerCase() === rawTab.toLowerCase()) ??
        'All')
      : 'All'

  const filter = tabToFilter(tabLabel)

  const [rows, summary, overdue] = await Promise.all([
    getVaccinations(activeFarmId, { status: filter }),
    getVaccinationSummary(activeFarmId),
    getOverdueVaccinations(activeFarmId),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vaccinations"
        description={farmName}
        action={
          <Link
            href={withFarmQuery('/farm/vaccinations/new', activeFarmId)}
            className={cn(
              buttonVariants(),
              'bg-primary text-white hover:bg-primary-dark [a]:hover:bg-primary-dark'
            )}
          >
            <Plus className="mr-2 h-4 w-4" />
            Schedule vaccination
          </Link>
        }
      />

      {overdue.length > 0 && (
        <div
          role="alert"
          className="flex flex-wrap items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" aria-hidden />
          <div>
            <p className="font-semibold">
              {overdue.length} overdue vaccination
              {overdue.length === 1 ? '' : 's'}
            </p>
            <p className="text-red-800/90">
              Past scheduled date and still marked scheduled. Complete or update
              them soon.
            </p>
            <ul className="mt-2 list-inside list-disc text-red-800/90">
              {overdue.slice(0, 5).map((v) => (
                <li key={v.id}>
                  <Link
                    href={withFarmQuery(`/farm/vaccinations/${v.id}`, activeFarmId)}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {v.vaccine_name}
                  </Link>
                  {v.flocks?.batch_number
                    ? ` — ${v.flocks.batch_number}`
                    : ''}
                </li>
              ))}
            </ul>
            {overdue.length > 5 && (
              <p className="mt-1 text-xs text-red-700">…and more in the table below.</p>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Upcoming (7 days)"
          value={summary.upcomingWeekCount}
          description="Scheduled in the next week"
          icon={CalendarClock}
        />
        <StatCard
          title="Overdue"
          value={
            <span className="inline-flex items-center gap-2">
              {summary.overdueCount}
              {summary.overdueCount > 0 && (
                <AlertTriangle
                  className="h-6 w-6 text-red-500"
                  aria-hidden
                />
              )}
            </span>
          }
          description="Needs attention"
          icon={AlertTriangle}
        />
        <StatCard
          title="Completed (this month)"
          value={summary.completedThisMonthCount}
          description="Marked completed"
          icon={CheckCircle2}
        />
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-3">
        {FILTER_TABS.map((tab) => {
          const isActive = tabLabel === tab
          const href =
            tab === 'All'
              ? withFarmQuery('/farm/vaccinations', activeFarmId)
              : withFarmQuery('/farm/vaccinations', activeFarmId, {
                  status: tab,
                })
          return (
            <Link
              key={tab}
              href={href}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {tab}
            </Link>
          )
        })}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Syringe}
          title="No vaccinations"
          description="Schedule one or adjust the filter."
        />
      ) : (
        <div className="rounded-xl border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vaccine</TableHead>
                <TableHead>Flock</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead className="w-[56px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((v) => {
                const display = getVaccinationDisplayStatus(v)
                const flockLabel = v.flocks?.batch_number
                  ? `${v.flocks.batch_number} (${v.flocks.breed})`
                  : '—'
                const canEdit = v.status === 'scheduled'
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={withFarmQuery(
                          `/farm/vaccinations/${v.id}`,
                          activeFarmId
                        )}
                        className="text-primary-dark hover:underline"
                      >
                        {v.vaccine_name}
                      </Link>
                    </TableCell>
                    <TableCell>{flockLabel}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {v.scheduled_date
                        ? formatDate(v.scheduled_date)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <VaccinationStatusBadge status={display} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {v.completed_date
                        ? formatDate(v.completed_date)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <VaccinationRowActions
                        vaccinationId={v.id}
                        farmId={activeFarmId}
                        canEdit={canEdit}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
