import { redirect } from 'next/navigation'
import { BarChart3 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { ReportsToolbar, type ReportType } from '@/components/reports/ReportsToolbar'
import { DailyReport } from '@/components/reports/DailyReport'
import { WeeklyReport } from '@/components/reports/WeeklyReport'
import { MonthlyReport } from '@/components/reports/MonthlyReport'
import { FinancialReport } from '@/components/reports/FinancialReport'
import { FlockPerformanceReport } from '@/components/reports/FlockPerformanceReport'
import { FarmComparisonTable } from '@/components/reports/FarmComparisonTable'
import { getSessionProfile } from '@/lib/auth/session'
import { getFarms } from '@/lib/queries/farms'
import {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getFinancialSummary,
  getFinancialPLReport,
  getFlockPerformanceReport,
  getFarmComparisonReport,
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
import {
  getFlockRowsForReportsFarmIds,
} from '@/lib/queries/reports-ui'
import { ReportsBarChart } from '@/components/charts/ReportsBarChart'

interface PageProps {
  searchParams: Promise<{
    type?: string
    date?: string
    weekStart?: string
    month?: string
    finPeriod?: string
    finAnchor?: string
    flockRangeStart?: string
    flockRangeEnd?: string
    flockId?: string
    farmScope?: string
    compare?: string
  }>
}

function parseType(raw?: string): ReportType {
  const t = raw?.toLowerCase()
  if (t === 'daily' || t === 'weekly' || t === 'monthly' || t === 'financial' || t === 'flock')
    return t
  return 'weekly'
}

export default async function AdminReportsPage({ searchParams }: PageProps) {
  const { profile } = await getSessionProfile()
  if (profile.role !== 'ADMIN' || !profile.organization_id) {
    redirect('/login')
  }

  const sp = await searchParams
  const farms = await getFarms(profile.organization_id)
  const farmOptions = farms.map((f) => ({ id: f.id, name: f.name }))
  const farmScope = sp.farmScope === 'all' || !sp.farmScope?.trim()
    ? 'all'
    : sp.farmScope.trim()
  const farmIds =
    farmScope === 'all' ? farms.map((f) => f.id) : [farmScope]

  const orgName = 'Organization'
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

  const defaultFlock = lastNDaysRange(30)
  const flockStart = sp.flockRangeStart?.trim() || defaultFlock.start
  const flockEnd = sp.flockRangeEnd?.trim() || defaultFlock.end
  const flockIdFilter =
    sp.flockId && sp.flockId !== 'all' ? sp.flockId : null

  const flockOptions =
    farmIds.length > 0
      ? await getFlockRowsForReportsFarmIds(farmIds)
      : []

  const compareOn = sp.compare === '1'
  const farmNames = Object.fromEntries(farms.map((f) => [f.id, f.name]))

  let comparison = null as Awaited<ReturnType<typeof getFarmComparisonReport>> | null
  if (compareOn && farmScope === 'all' && type === 'weekly') {
    comparison = await getFarmComparisonReport(farmIds, weekRange)
  }

  const brandName =
    farmScope === 'all'
      ? orgName
      : farms.find((f) => f.id === farmScope)?.name ?? orgName

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="All farms in your organization" />

      <ReportsToolbar
        action="/admin/reports"
        type={type}
        farmScope={farmScope}
        farmOptions={farmOptions}
        showCompare
        compare={compareOn}
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

      {comparison && comparison.length > 0 && (
        <div className="space-y-4">
          <FarmComparisonTable rows={comparison} />
          <div className="rounded-xl border bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold">Revenue by farm</h3>
            <ReportsBarChart
              data={comparison.map((c) => ({
                name: c.farmName.slice(0, 12),
                revenue: c.revenue,
              }))}
              bars={[{ key: 'revenue', name: 'Revenue' }]}
              valueFormat="currency"
            />
          </div>
        </div>
      )}

      {farmIds.length === 0 ? (
        <p className="text-sm text-gray-500">No farms in this organization.</p>
      ) : (
        <AdminReportBody
          type={type}
          farmIds={farmIds}
          brandName={brandName}
          date={date}
          weekRange={weekRange}
          monthRange={monthRange}
          financialRangeResolved={financialRangeResolved}
          flockRange={{ start: flockStart, end: flockEnd }}
          flockIdFilter={flockIdFilter}
          farmNames={farmNames}
        />
      )}
    </div>
  )
}

async function AdminReportBody({
  type,
  farmIds,
  brandName,
  date,
  weekRange,
  monthRange,
  financialRangeResolved,
  flockRange,
  flockIdFilter,
  farmNames,
}: {
  type: ReportType
  farmIds: string[]
  brandName: string
  date: string
  weekRange: { start: string; end: string }
  monthRange: { start: string; end: string }
  financialRangeResolved: { start: string; end: string }
  flockRange: { start: string; end: string }
  flockIdFilter: string | null
  farmNames: Record<string, string>
}) {
  if (type === 'daily') {
    const data = await getDailyReport(farmIds, date)
    return <DailyReport data={data} brandName={brandName} />
  }
  if (type === 'weekly') {
    const data = await getWeeklyReport(farmIds, weekRange)
    return <WeeklyReport data={data} brandName={brandName} />
  }
  if (type === 'monthly') {
    const data = await getMonthlyReport(farmIds, monthRange)
    return <MonthlyReport data={data} brandName={brandName} />
  }
  if (type === 'financial') {
    const [pl, summary] = await Promise.all([
      getFinancialPLReport(farmIds, financialRangeResolved),
      getFinancialSummary(farmIds, financialRangeResolved),
    ])
    return <FinancialReport pl={pl} summary={summary} brandName={brandName} />
  }
  const flockData = await getFlockPerformanceReport(
    farmIds,
    flockRange,
    flockIdFilter
  )
  return (
    <FlockPerformanceReport
      data={flockData}
      brandName={brandName}
      farmNames={farmNames}
    />
  )
}
