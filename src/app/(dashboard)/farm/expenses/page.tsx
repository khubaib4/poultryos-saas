import Link from 'next/link'
import {
  Calendar,
  Clock,
  DollarSign,
  Filter,
  Plus,
  Wheat,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/EmptyState'
import { CategoryBreakdownChart } from '@/components/expenses/CategoryBreakdownChart'
import { CostOptimizationTip } from '@/components/expenses/CostOptimizationTip'
import { ExpenseStatCard } from '@/components/expenses/ExpenseStatCard'
import { ExpensesTable } from '@/components/expenses/ExpensesTable'
import { VendorAnalysis } from '@/components/expenses/VendorAnalysis'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import {
  getExpenseAnalyticsBundle,
  getExpenseCategories,
  getExpensesWithStats,
  type PaymentStatusFilter,
} from '@/lib/queries/expenses'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn } from '@/lib/utils'

interface PageProps {
  searchParams: Promise<{
    farm?: string
    status?: string
    category?: string
    page?: string
    from?: string
    to?: string
  }>
}

function parseStatus(raw: string | undefined): PaymentStatusFilter {
  const s = (raw ?? 'all').toLowerCase()
  if (s === 'paid' || s === 'pending') return s
  return 'all'
}

function listExtraParams(opts: {
  status: PaymentStatusFilter
  category: string
  page: number
  from: string
  to: string
}): Record<string, string> {
  const extra: Record<string, string> = {}
  if (opts.status !== 'all') extra.status = opts.status
  if (opts.category && opts.category !== 'all') extra.category = opts.category
  if (opts.page > 1) extra.page = String(opts.page)
  if (opts.from) extra.from = opts.from
  if (opts.to) extra.to = opts.to
  return extra
}

export default async function FarmExpensesPage({ searchParams }: PageProps) {
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={DollarSign}
        title="Select a farm"
        description="Choose an assigned farm from the header to view expenses."
      />
    )
  }

  const activeFarmId = farmId

  const status = parseStatus(sp.status)
  const categoryFilter = (sp.category ?? '').trim()
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const from = (sp.from ?? '').trim()
  const to = (sp.to ?? '').trim()

  const analyticsRange =
    from || to
      ? { dateFrom: from || undefined, dateTo: to || undefined }
      : undefined

  const [{ stats, categoryBreakdown, topVendors }, list] = await Promise.all([
    getExpenseAnalyticsBundle(activeFarmId, analyticsRange),
    getExpensesWithStats(activeFarmId, {
      status,
      category: categoryFilter || undefined,
      page,
      pageSize: 12,
      dateFrom: from || undefined,
      dateTo: to || undefined,
    }),
  ])

  const categories = getExpenseCategories()
  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize))
  const prevPage = page > 1 ? page - 1 : null
  const nextPage = page < totalPages ? page + 1 : null

  const baseList = (p: number) =>
    withFarmQuery(
      '/farm/expenses',
      activeFarmId,
      listExtraParams({
        status,
        category: categoryFilter,
        page: p,
        from,
        to,
      })
    )

  const statusHref = (s: PaymentStatusFilter) =>
    withFarmQuery(
      '/farm/expenses',
      activeFarmId,
      listExtraParams({
        status: s,
        category: categoryFilter,
        page: 1,
        from,
        to,
      })
    )

  const newExpenseHref = withFarmQuery('/farm/expenses/new', activeFarmId)

  const quarterTrend =
    stats.quarterSpendChangePct != null && stats.lastQuarterTotal > 0
      ? stats.quarterSpendChangePct > 0
        ? {
            value: `↓ ${stats.quarterSpendChangePct}% from last quarter`,
            direction: 'down' as const,
          }
        : stats.quarterSpendChangePct < 0
          ? {
              value: `↑ ${Math.abs(stats.quarterSpendChangePct)}% from last quarter`,
              direction: 'up' as const,
            }
          : undefined
      : undefined

  let tipBody =
    'Buying in bulk (500+ bags) could save you up to Rs 15,000 per shipment based on current vendor rates.'
  if (stats.feedMonthOverMonthPct != null && stats.feedMonthOverMonthPct > 0) {
    tipBody = `Your feed costs have risen by ${stats.feedMonthOverMonthPct}% this month due to market fluctuations. Buying in bulk (500+ bags) could save you up to Rs 15,000 per shipment based on current vendor rates.`
  } else if (stats.feedMonthOverMonthPct != null && stats.feedMonthOverMonthPct < 0) {
    tipBody = `Your feed spend is down ${Math.abs(stats.feedMonthOverMonthPct)}% vs last month. ${tipBody}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Expenses</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage your farm operating costs
          </p>
        </div>
        <Link href={newExpenseHref}>
          <Button variant="primarySimple" className="gap-2">
            <Plus className="h-4 w-4" />
            Add expense
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ExpenseStatCard
          tint="coral"
          label="Total expenses"
          value={`Rs ${stats.totalAllTime.toLocaleString()}`}
          trend={quarterTrend}
          trendClassName="text-red-600"
          icon={<Wheat className="text-red-400" strokeWidth={1.25} />}
        />
        <ExpenseStatCard
          tint="blue"
          label="This month"
          value={`Rs ${stats.thisMonthTotal.toLocaleString()}`}
          extra={
            <p className="flex items-center gap-2 text-sm text-gray-600">
              <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
              Current billing cycle
            </p>
          }
          icon={<Calendar className="text-blue-400" strokeWidth={1.25} />}
        />
        <ExpenseStatCard
          tint="amber"
          label="Feed costs"
          value={`Rs ${stats.feedCostsTotal.toLocaleString()}`}
          extra={
            <p className="flex items-center gap-2 text-sm text-gray-600">
              <Wheat className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
              {stats.totalAllTime > 0
                ? `${stats.feedPctOfTotal}% of total spend`
                : 'No spend yet'}
            </p>
          }
          icon={<Wheat className="text-amber-400" strokeWidth={1.25} />}
        />
        <ExpenseStatCard
          tint="gray"
          label="Pending bills"
          value={`Rs ${stats.pendingAmount.toLocaleString()}`}
          extra={
            <p className="flex items-center gap-2 text-sm text-gray-600">
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
              {stats.pendingDueThisWeekCount > 0
                ? `${stats.pendingDueThisWeekCount} invoice${
                    stats.pendingDueThisWeekCount === 1 ? '' : 's'
                  } due this week`
                : stats.pendingCount > 0
                  ? `${stats.pendingCount} open bill${
                      stats.pendingCount === 1 ? '' : 's'
                    }`
                  : 'No pending bills'}
            </p>
          }
          icon={<Clock className="text-gray-400" strokeWidth={1.25} />}
        />
      </div>

      <form
        method="get"
        action="/farm/expenses"
        className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
      >
        <input type="hidden" name="farm" value={activeFarmId} />
        <input type="hidden" name="status" value={status} />
        {categoryFilter ? (
          <input type="hidden" name="category" value={categoryFilter} />
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500" htmlFor="exp-from">
              From
            </label>
            <Input
              id="exp-from"
              type="date"
              name="from"
              defaultValue={from}
              className="h-10 w-40 rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500" htmlFor="exp-to">
              To
            </label>
            <Input
              id="exp-to"
              type="date"
              name="to"
              defaultValue={to}
              className="h-10 w-40 rounded-xl"
            />
          </div>
        </div>
        <Button type="submit" variant="secondary" size="sm" className="rounded-xl">
          Apply date range
        </Button>
        <Link
          href={withFarmQuery(
            '/farm/expenses',
            activeFarmId,
            listExtraParams({ status, category: categoryFilter, page: 1, from: '', to: '' })
          )}
          className={cn(
            'inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50'
          )}
        >
          Clear dates
        </Link>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Category breakdown</h2>
          <CategoryBreakdownChart
            data={categoryBreakdown}
            totalAmount={stats.totalAllTime}
            className="mt-4"
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['all', 'All'],
                  ['paid', 'Paid'],
                  ['pending', 'Pending'],
                ] as const
              ).map(([key, label]) => (
                <Link
                  key={key}
                  href={statusHref(key)}
                  className={cn(
                    'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                    status === key
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>

            <form
              method="get"
              action="/farm/expenses"
              className="flex flex-wrap items-center gap-2"
            >
              <input type="hidden" name="farm" value={activeFarmId} />
              <input type="hidden" name="status" value={status} />
              {from ? <input type="hidden" name="from" value={from} /> : null}
              {to ? <input type="hidden" name="to" value={to} /> : null}
              <Filter className="h-4 w-4 text-gray-400" aria-hidden />
              <select
                name="category"
                defaultValue={categoryFilter}
                className="h-10 min-w-[180px] rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="secondary" size="sm" className="rounded-xl">
                Apply
              </Button>
            </form>
          </div>

          {list.total === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No expenses match"
              description="Add an expense or adjust filters."
            />
          ) : (
            <ExpensesTable
              expenses={list.rows}
              farmId={activeFarmId}
              page={list.page}
              pageSize={list.pageSize}
              total={list.total}
              prevHref={prevPage ? baseList(prevPage) : null}
              nextHref={nextPage ? baseList(nextPage) : null}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <VendorAnalysis
          vendors={topVendors}
          viewAllHref={withFarmQuery('/farm/expenses', activeFarmId)}
        />
        <CostOptimizationTip
          body={tipBody}
          ctaHref={withFarmQuery('/farm/inventory', activeFarmId)}
        />
      </div>
    </div>
  )
}
