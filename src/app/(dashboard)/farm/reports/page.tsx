import { BarChart3 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ReportsToolbar, type ReportType } from '@/components/reports/ReportsToolbar'
import { DailyReport } from '@/components/reports/DailyReport'
import { WeeklyReport } from '@/components/reports/WeeklyReport'
import { MonthlyReport } from '@/components/reports/MonthlyReport'
import { FinancialReport } from '@/components/reports/FinancialReport'
import { FlockPerformanceReport } from '@/components/reports/FlockPerformanceReport'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getFinancialSummary,
  getFinancialPLReport,
  getFlockPerformanceReport,
} from '@/lib/queries/reports'
import {
  todayISO,
  defaultWeekRange,
  parseWeekFromParam,
  parseMonthFromParam,
  financialRange,
  lastNDaysRange,
  type FinancialPeriod,
} from '@/lib/report-dates'
import { getFlockRowsForReports } from '@/lib/queries/reports-ui'

interface PageProps {
  searchParams: Promise<{
    farm?: string
    type?: string
    date?: string
    weekStart?: string
    month?: string
    finPeriod?: string
    finAnchor?: string
    flockRangeStart?: string
    flockRangeEnd?: string
    flockId?: string
  }>
}

function parseType(raw?: string): ReportType {
  const t = raw?.toLowerCase()
  if (t === 'daily' || t === 'weekly' || t === 'monthly' || t === 'financial' || t === 'flock')
    return t
  return 'weekly'
}

export default async function FarmReportsPage({ searchParams }: PageProps) {
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Select a farm"
        description="Choose an assigned farm to view reports."
      />
    )
  }

  const farmName = assigned.find((f) => f.id === farmId)?.name ?? 'Farm'
  const type = parseType(sp.type)
  const date = sp.date?.trim() || todayISO()
  const weekRange = parseWeekFromParam(sp.weekStart)
  const monthRange = parseMonthFromParam(sp.month)
  const finPeriod = (sp.finPeriod as FinancialPeriod) || 'month'
  const finAnchor = sp.finAnchor?.trim() || todayISO()
  const financialRangeResolved =
    finPeriod === 'month'
      ? parseMonthFromParam(sp.month)
      : financialRange(finPeriod, finAnchor)

  const flockDefault = lastNDaysRange(30)
  const flockStart = sp.flockRangeStart?.trim() || flockDefault.start
  const flockEnd = sp.flockRangeEnd?.trim() || flockDefault.end
  const flockIdFilter =
    sp.flockId && sp.flockId !== 'all' ? sp.flockId : null

  const flockOptions = await getFlockRowsForReports(farmId)

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description={farmName} />

      <ReportsToolbar
        action="/farm/reports"
        type={type}
        farmId={farmId}
        date={date}
        weekStart={sp.weekStart?.trim() || defaultWeekRange().start}
        month={sp.month?.trim() || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}
        finPeriod={finPeriod}
        finAnchor={finAnchor}
        flockRangeStart={flockStart}
        flockRangeEnd={flockEnd}
        flockId={sp.flockId ?? 'all'}
        flockOptions={flockOptions}
      />

      <ReportBody
        type={type}
        farmId={farmId}
        farmName={farmName}
        date={date}
        weekRange={weekRange}
        monthRange={monthRange}
        financialRangeResolved={financialRangeResolved}
        flockRange={{ start: flockStart, end: flockEnd }}
        flockIdFilter={flockIdFilter}
      />
    </div>
  )
}

async function ReportBody({
  type,
  farmId,
  farmName,
  date,
  weekRange,
  monthRange,
  financialRangeResolved,
  flockRange,
  flockIdFilter,
}: {
  type: ReportType
  farmId: string
  farmName: string
  date: string
  weekRange: { start: string; end: string }
  monthRange: { start: string; end: string }
  financialRangeResolved: { start: string; end: string }
  flockRange: { start: string; end: string }
  flockIdFilter: string | null
}) {
  const ids = [farmId]

  if (type === 'daily') {
    const data = await getDailyReport(ids, date)
    return <DailyReport data={data} brandName={farmName} />
  }
  if (type === 'weekly') {
    const data = await getWeeklyReport(ids, weekRange)
    return <WeeklyReport data={data} brandName={farmName} />
  }
  if (type === 'monthly') {
    const data = await getMonthlyReport(ids, monthRange)
    return <MonthlyReport data={data} brandName={farmName} />
  }
  if (type === 'financial') {
    const [pl, summary] = await Promise.all([
      getFinancialPLReport(ids, financialRangeResolved),
      getFinancialSummary(ids, financialRangeResolved),
    ])
    return <FinancialReport pl={pl} summary={summary} brandName={farmName} />
  }
  const flockData = await getFlockPerformanceReport(ids, flockRange, flockIdFilter)
  return (
    <FlockPerformanceReport data={flockData} brandName={farmName} />
  )
}
