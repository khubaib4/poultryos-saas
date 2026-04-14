import type { ReactNode } from 'react'
import {
  BarChart3,
  DollarSign,
  Egg,
  Receipt,
  Wallet,
} from 'lucide-react'
import { format } from 'date-fns'
import { EmptyState } from '@/components/shared/EmptyState'
import { ActiveFlockCards, buildActiveFlockCards } from '@/components/reports/ActiveFlockCards'
import { CashFlowChart } from '@/components/reports/CashFlowChart'
import { DateRangeSelector } from '@/components/reports/DateRangeSelector'
import { EggProductionChart } from '@/components/reports/EggProductionChart'
import { ExpenseBreakdownChart } from '@/components/reports/ExpenseBreakdownChart'
import { FlockEfficiencyList } from '@/components/reports/FlockEfficiencyList'
import { MortalityTrendChart } from '@/components/reports/MortalityTrendChart'
import { PerformanceVitals } from '@/components/reports/PerformanceVitals'
import { ProductionByFlockTable } from '@/components/reports/ProductionByFlockTable'
import { ProductionTrendChart } from '@/components/reports/ProductionTrendChart'
import { ProfitLossSummary } from '@/components/reports/ProfitLossSummary'
import { RecentReportsTable } from '@/components/reports/RecentReportsTable'
import { ReportStatCard } from '@/components/reports/ReportStatCard'
import { ReportsExportBar } from '@/components/reports/ReportsExportBar'
import { ReportsSidebarActions } from '@/components/reports/ReportsSidebarActions'
import { ReportsTabNav } from '@/components/reports/ReportsTabNav'
import { RevenueExpensesCard } from '@/components/reports/RevenueExpensesCard'
import { RevenueMixChart } from '@/components/reports/RevenueMixChart'
import { TopCustomersTable } from '@/components/reports/TopCustomersTable'
import { getSessionProfile } from '@/lib/auth/session'
import { formatRsFull } from '@/lib/reports-chart-theme'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { getFlockPerformanceReport } from '@/lib/queries/reports'
import {
  getFinancialDashboardData,
  getInventoryReportSummary,
  getOverviewAnalytics,
  getProductionIntelligence,
  getRecentReportsPlaceholder,
} from '@/lib/queries/reports-analytics'
import {
  parseReportTab,
  resolveReportDateRange,
} from '@/lib/report-range-url'

interface PageProps {
  searchParams: Promise<{
    farm?: string
    from?: string
    to?: string
    range?: string
    tab?: string
  }>
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
  const resolved = resolveReportDateRange({
    from: sp.from,
    to: sp.to,
    preset: sp.range,
  })
  const tab = parseReportTab(sp.tab)

  const rangeQuery: Record<string, string> =
    resolved.preset === 'custom'
      ? { from: resolved.start, to: resolved.end }
      : { range: resolved.preset }
  if (tab !== 'overview') rangeQuery.tab = tab

  const rangeLabel = `${format(new Date(resolved.start + 'T12:00:00'), 'MMM d, yyyy')} – ${format(new Date(resolved.end + 'T12:00:00'), 'MMM d, yyyy')}`

  const exportRows: string[][] = [
    ['Farm', farmName],
    ['Range', rangeLabel],
    ['Tab', tab],
  ]

  if (tab === 'overview') {
    const overview = await getOverviewAnalytics(farmId, resolved)
    exportRows.push(
      ['Total eggs', overview.stats.totalEggs.value],
      ['Revenue', overview.stats.totalRevenue.value],
      ['Expenses', overview.stats.totalExpenses.value],
      ['Net profit', overview.stats.netProfit.value]
    )
    return (
      <ReportsLayout
        farmId={farmId}
        farmName={farmName}
        tab={tab}
        resolved={resolved}
        rangeQuery={rangeQuery}
        rangeLabel={rangeLabel}
        exportRows={exportRows}
      >
        <div id="reports-export" className="grid gap-6 xl:grid-cols-[1fr_220px]">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ReportStatCard
                icon={<Egg className="h-6 w-6" />}
                iconBg="blue"
                label={overview.stats.totalEggs.label}
                value={overview.stats.totalEggs.value}
                trend={
                  overview.stats.totalEggs.trend
                    ? {
                        value: overview.stats.totalEggs.trend.text,
                        positive: overview.stats.totalEggs.trend.positive,
                      }
                    : undefined
                }
              />
              <ReportStatCard
                icon={<Wallet className="h-6 w-6" />}
                iconBg="green"
                label={overview.stats.totalRevenue.label}
                value={overview.stats.totalRevenue.value}
                trend={
                  overview.stats.totalRevenue.trend
                    ? {
                        value: overview.stats.totalRevenue.trend.text,
                        positive: overview.stats.totalRevenue.trend.positive,
                      }
                    : undefined
                }
              />
              <ReportStatCard
                icon={<Receipt className="h-6 w-6" />}
                iconBg="gray"
                label={overview.stats.totalExpenses.label}
                value={overview.stats.totalExpenses.value}
                trend={
                  overview.stats.totalExpenses.trend
                    ? {
                        value: overview.stats.totalExpenses.trend.text,
                        positive: overview.stats.totalExpenses.trend.positive,
                      }
                    : undefined
                }
                trendVariant="amber"
              />
              <ReportStatCard
                icon={<DollarSign className="h-6 w-6" />}
                iconBg="dark"
                label={overview.stats.netProfit.label}
                value={overview.stats.netProfit.value}
                subtitle={overview.stats.netProfit.subtitle}
                showStar
                trend={
                  overview.stats.netProfit.trend
                    ? {
                        value: overview.stats.netProfit.trend.text,
                        positive: overview.stats.netProfit.trend.positive,
                      }
                    : undefined
                }
              />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <ProductionTrendChart data={overview.productionTrend} />
              <RevenueExpensesCard
                revenue={overview.revenueVsExpenses.revenue}
                expenses={overview.revenueVsExpenses.expenses}
                revenueLabel={overview.revenueVsExpenses.revenueLabel}
                expensesLabel={overview.revenueVsExpenses.expensesLabel}
                insight={overview.financialInsight}
              />
            </div>
            <PerformanceVitals items={overview.vitals} />
            <RecentReportsTable rows={getRecentReportsPlaceholder()} farmId={farmId} />
          </div>
          <ReportsSidebarActions farmId={farmId} />
        </div>
      </ReportsLayout>
    )
  }

  if (tab === 'financial') {
    const fin = await getFinancialDashboardData(farmId, resolved)
    exportRows.push(
      ['Net revenue', String(fin.netRevenue)],
      ['Operational cost', String(fin.operationalCost)],
      ['Gross margin %', String(fin.grossMarginPct)]
    )
    return (
      <ReportsLayout
        farmId={farmId}
        farmName={farmName}
        tab={tab}
        resolved={resolved}
        rangeQuery={rangeQuery}
        rangeLabel={rangeLabel}
        exportRows={exportRows}
      >
        <div className="grid gap-6 xl:grid-cols-[1fr_220px]">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ReportStatCard
                icon={<Wallet className="h-6 w-6" />}
                iconBg="green"
                label="Net revenue"
                value={formatRsFull(fin.netRevenue)}
                trend={{
                  value: fin.netRevenueTrend,
                  positive:
                    fin.netRevenueTrend !== '—' && !/^-/.test(fin.netRevenueTrend.trim()),
                }}
              />
              <ReportStatCard
                icon={<Receipt className="h-6 w-6" />}
                iconBg="amber"
                label="Operational cost"
                value={formatRsFull(fin.operationalCost)}
                subtitle={fin.operationalLabel}
              />
              <ReportStatCard
                icon={<DollarSign className="h-6 w-6" />}
                iconBg="blue"
                label="Gross profit margin"
                value={`${fin.grossMarginPct.toFixed(1)}%`}
                trend={{
                  value: fin.grossMarginTrend,
                  positive:
                    !/^-/.test(fin.grossMarginTrend.trim()),
                }}
              />
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-md">
                <p className="text-sm text-emerald-100">Vibrant health bonus</p>
                <p className="mt-1 text-3xl font-bold">{formatRsFull(fin.bonusRebate)}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                  Efficiency rebate earned
                </p>
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <RevenueMixChart
                wholesale={fin.revenueMix.wholesale}
                retail={fin.revenueMix.retail}
                direct={fin.revenueMix.direct}
                wholesalePct={fin.revenueMix.wholesalePct}
              />
              <CashFlowChart data={fin.cashFlow} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <ExpenseBreakdownChart
                slices={fin.expenseSplit}
                totalExpenses={fin.operationalCost}
              />
              <ProfitLossSummary rows={fin.profitLoss} />
            </div>
            <TopCustomersTable rows={fin.topCustomers} farmId={farmId} />
          </div>
          <ReportsSidebarActions farmId={farmId} />
        </div>
      </ReportsLayout>
    )
  }

  if (tab === 'production') {
    const prod = await getProductionIntelligence(farmId, resolved)
    const bestFcr = prod.flockRows.length
      ? Math.min(...prod.flockRows.map((f) => f.feedConversion))
      : 0
    const avgMort =
      prod.flockRows.length > 0
        ? prod.flockRows.reduce((s, f) => s + f.mortalityRate, 0) / prod.flockRows.length
        : 0
    const flockCards = buildActiveFlockCards(
      farmId,
      prod.flockRows.slice(0, 3).map((f) => ({
        flockId: f.flockId,
        batchNumber: f.batchNumber,
        birdCount: f.birdCount,
        mortalityRate: f.mortalityRate,
      }))
    )
    exportRows.push(['Avg daily eggs', String(prod.totalDailyEggs)])
    return (
      <ReportsLayout
        farmId={farmId}
        farmName={farmName}
        tab={tab}
        resolved={resolved}
        rangeQuery={rangeQuery}
        rangeLabel={rangeLabel}
        exportRows={exportRows}
      >
        <div className="grid gap-6 xl:grid-cols-[1fr_220px]">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <ReportStatCard
                icon={<Egg className="h-6 w-6" />}
                iconBg="green"
                label="Total daily production"
                value={`${prod.totalDailyEggs.toLocaleString()} eggs`}
                trend={{ value: prod.dailyTrendPct, positive: prod.dailyTrendPct.startsWith('+') }}
              />
              <ReportStatCard
                icon={<Wallet className="h-6 w-6" />}
                iconBg="amber"
                label="Average lay rate"
                value={`${prod.avgLayRate.toFixed(1)}%`}
                subtitle="Optimal"
              />
              <ReportStatCard
                icon={<Receipt className="h-6 w-6" />}
                iconBg="gray"
                label="Current mortality"
                value={`${prod.mortalityPct.toFixed(2)}%`}
                trend={{ value: prod.mortalityTrend, positive: true }}
              />
            </div>
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <EggProductionChart data={prod.eggByDay} />
              </div>
              <div className="lg:col-span-2">
                <FlockEfficiencyList
                  items={prod.flocks}
                  bestFcr={bestFcr}
                  avgMortality={avgMort}
                />
              </div>
            </div>
            <ProductionByFlockTable rows={prod.flockRows} farmId={farmId} />
            <ActiveFlockCards cards={flockCards} />
            <MortalityTrendChart data={prod.mortalitySeries} />
          </div>
          <ReportsSidebarActions farmId={farmId} />
        </div>
      </ReportsLayout>
    )
  }

  if (tab === 'flock') {
    const flock = await getFlockPerformanceReport([farmId], {
      start: resolved.start,
      end: resolved.end,
    }, null)
    exportRows.push(['Flocks', String(flock.flocks.length)])
    return (
      <ReportsLayout
        farmId={farmId}
        farmName={farmName}
        tab={tab}
        resolved={resolved}
        rangeQuery={rangeQuery}
        rangeLabel={rangeLabel}
        exportRows={exportRows}
      >
        <div className="grid gap-6 xl:grid-cols-[1fr_220px]">
          <div className="space-y-6">
            <ProductionByFlockTable rows={flock.flocks} farmId={farmId} />
            <MortalityTrendChart
              data={flock.flocks.slice(0, 4).map((f, i) => ({
                label: `Flock ${i + 1}`,
                value: f.mortalityRate,
              }))}
            />
          </div>
          <ReportsSidebarActions farmId={farmId} />
        </div>
      </ReportsLayout>
    )
  }

  const inv = await getInventoryReportSummary(farmId)
  exportRows.push(['SKUs', String(inv.totalSkus)], ['Low stock', String(inv.lowStock)])
  return (
    <ReportsLayout
      farmId={farmId}
      farmName={farmName}
      tab="inventory"
      resolved={resolved}
      rangeQuery={rangeQuery}
      rangeLabel={rangeLabel}
      exportRows={exportRows}
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_220px]">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Inventory snapshot</h3>
          <p className="text-sm text-gray-500">
            {inv.totalSkus} items · {inv.lowStock} below minimum
          </p>
          <ul className="mt-4 divide-y divide-gray-100">
            {inv.items.map((it) => (
              <li key={it.id} className="flex justify-between py-3 text-sm">
                <span className="font-medium text-gray-900">{it.name}</span>
                <span className="text-gray-600">
                  {Number(it.current_stock).toLocaleString()} {it.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <ReportsSidebarActions farmId={farmId} />
      </div>
    </ReportsLayout>
  )
}

function ReportsLayout({
  children,
  farmId,
  farmName,
  tab,
  resolved,
  rangeQuery,
  rangeLabel,
  exportRows,
}: {
  children: ReactNode
  farmId: string
  farmName: string
  tab: string
  resolved: ReturnType<typeof resolveReportDateRange>
  rangeQuery: Record<string, string>
  rangeLabel: string
  exportRows: string[][]
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Analytics and insights for your farm performance
          </p>
        </div>
        <ReportsExportBar
          title="Farm analytics report"
          tab={tab}
          farmName={farmName}
          rangeLabel={rangeLabel}
          tableRows={exportRows}
        />
      </div>

      <DateRangeSelector
        farmId={farmId}
        tab={tab}
        preset={resolved.preset}
        from={resolved.start}
        to={resolved.end}
      />

      <ReportsTabNav farmId={farmId} active={tab} rangeQuery={rangeQuery} />

      {children}

      <p className="text-center text-xs text-gray-400">
        © {new Date().getFullYear()} PoultryOS precision farming. Analytics refresh on each load.
      </p>
    </div>
  )
}
