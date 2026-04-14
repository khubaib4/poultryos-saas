import { AlertTriangle, CalendarDays, CheckCircle2, FolderOpen, Syringe } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { HealthReportCard } from '@/components/vaccinations/HealthReportCard'
import { ScheduleVaccinationLauncher } from '@/components/vaccinations/ScheduleVaccinationLauncher'
import { UpcomingVaccinations } from '@/components/vaccinations/UpcomingVaccinations'
import { VaccinationDetailCard } from '@/components/vaccinations/VaccinationDetailCard'
import { VaccinationFilters } from '@/components/vaccinations/VaccinationFilters'
import { VaccinationStatCard } from '@/components/vaccinations/VaccinationStatCard'
import { VaccinationTimeline } from '@/components/vaccinations/VaccinationTimeline'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { getActiveFlocks } from '@/lib/queries/flocks'
import {
  addDaysIso,
  getOverdueVaccinations,
  getUpcomingPanelVaccinations,
  getVaccinationSpotlight,
  getVaccinationSummary,
  getVaccinationsForTimeline,
  isoDateToday,
  type VaccinationStatusTab,
} from '@/lib/queries/vaccinations'
import { withFarmQuery } from '@/lib/farm-worker-nav'

interface PageProps {
  searchParams: Promise<{
    farm?: string
    status?: string
    flock?: string
  }>
}

function parseStatusTab(s: string | undefined): VaccinationStatusTab {
  const v = (s ?? 'all').toLowerCase()
  if (v === 'scheduled') return 'scheduled'
  if (v === 'completed') return 'completed'
  if (v === 'overdue') return 'overdue'
  if (v === 'skipped') return 'skipped'
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
  const statusTab = parseStatusTab(sp.status)
  const flockFilter = sp.flock?.trim() ?? ''
  const flocks = await getActiveFlocks(activeFarmId)
  const flockIdFilter =
    flockFilter && flocks.some((f) => f.id === flockFilter) ? flockFilter : undefined

  const tStart = addDaysIso(isoDateToday(), -21)
  const tEnd = addDaysIso(isoDateToday(), 84)

  const [summary, overdue, panelItems, timelineEvents, spotlight] = await Promise.all([
    getVaccinationSummary(activeFarmId, flockIdFilter),
    getOverdueVaccinations(activeFarmId, flockIdFilter),
    getUpcomingPanelVaccinations(activeFarmId, { limit: 10, flockId: flockIdFilter }),
    getVaccinationsForTimeline(activeFarmId, tStart, tEnd, flockIdFilter),
    getVaccinationSpotlight(activeFarmId, flockIdFilter),
  ])

  const viewAllHref = withFarmQuery('/farm/vaccinations', activeFarmId, {
    ...(flockIdFilter ? { flock: flockIdFilter } : {}),
    status: 'scheduled',
  })

  const reportsHref = withFarmQuery('/farm/reports', activeFarmId)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Vaccinations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage flock health and immunization schedules
          </p>
        </div>
        <ScheduleVaccinationLauncher farmId={activeFarmId} flocks={flocks} />
      </div>

      {overdue.length > 0 ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" aria-hidden />
          <p>
            <strong>{overdue.length}</strong> vaccination{overdue.length === 1 ? ' is' : 's are'}{' '}
            overdue and require immediate attention.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <VaccinationStatCard
          icon={<CalendarDays className="h-6 w-6" aria-hidden />}
          iconBg="gray"
          value={summary.totalScheduled}
          label="Scheduled for this flock"
        />
        <VaccinationStatCard
          icon={<CheckCircle2 className="h-6 w-6" aria-hidden />}
          iconBg="green"
          value={summary.completedThisMonthCount}
          label="Done this month"
          labelColor="green"
        />
        <VaccinationStatCard
          icon={<FolderOpen className="h-6 w-6" aria-hidden />}
          iconBg="amber"
          value={String(summary.upcomingWeekCount).padStart(2, '0')}
          label="Next 7 days"
          labelColor="blue"
        />
        <VaccinationStatCard
          icon={<AlertTriangle className="h-6 w-6" aria-hidden />}
          iconBg="red"
          value={String(summary.overdueCount).padStart(2, '0')}
          label="Critical items"
          labelColor="red"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <VaccinationTimeline events={timelineEvents} farmId={activeFarmId} />
        </div>
        <div className="space-y-6 lg:col-span-2">
          <UpcomingVaccinations
            items={panelItems}
            farmId={activeFarmId}
            viewAllHref={viewAllHref}
          />
          <VaccinationFilters
            farmId={activeFarmId}
            flocks={flocks}
            selectedFlockId={flockIdFilter ?? 'all'}
            statusTab={statusTab}
          />
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Vaccination details</h2>
          <p className="text-sm text-gray-500">
            Comprehensive record of recent and upcoming administration
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {spotlight.completed ? (
            <VaccinationDetailCard
              vaccination={spotlight.completed}
              variant="completed"
              detailHref={withFarmQuery(
                `/farm/vaccinations/${spotlight.completed.id}`,
                activeFarmId
              )}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              No completed vaccination on record yet.
            </div>
          )}
          {spotlight.scheduled ? (
            <VaccinationDetailCard
              vaccination={spotlight.scheduled}
              variant="scheduled"
              detailHref={withFarmQuery(
                `/farm/vaccinations/${spotlight.scheduled.id}`,
                activeFarmId
              )}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              No upcoming scheduled vaccination.
            </div>
          )}
          <HealthReportCard reportsHref={reportsHref} />
        </div>
      </section>

    </div>
  )
}
