import Link from 'next/link'
import {
  ShoppingCart,
  Plus,
  TrendingUp,
  Wallet,
  Clock,
  CalendarDays,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/EmptyState'
import { SalesStatCard } from '@/components/sales/SalesStatCard'
import { SalesTable } from '@/components/sales/SalesTable'
import { SalesPagination } from '@/components/sales/SalesPagination'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { getCustomers } from '@/lib/queries/customers'
import {
  getSales,
  getSalesCount,
  getSalesSummary,
} from '@/lib/queries/sales'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn, formatCurrency } from '@/lib/utils'

const PER_PAGE = 10

interface PageProps {
  searchParams: Promise<{
    farm?: string
    from?: string
    to?: string
    customer?: string
    status?: string
    q?: string
    page?: string
  }>
}

export default async function FarmSalesPage({ searchParams }: PageProps) {
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Select a farm"
        description="Choose an assigned farm from the header to view sales."
      />
    )
  }

  const activeFarmId = farmId

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10)

  const from = sp.from?.trim() || ''
  const to = sp.to?.trim() || ''
  const customerId = sp.customer?.trim() || ''
  const status =
    sp.status === 'paid' || sp.status === 'partial' || sp.status === 'unpaid'
      ? sp.status
      : 'all'
  const q = (sp.q ?? '').trim()
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)

  const filterBase = {
    dateFrom: from || undefined,
    dateTo: to || undefined,
    customerId: customerId || undefined,
    paymentStatus: status as 'all' | 'paid' | 'partial' | 'unpaid',
    invoiceSearch: q || undefined,
  }

  const [allTimeSummary, monthSummary, totalCount, customers] = await Promise.all([
    getSalesSummary(activeFarmId),
    getSalesSummary(activeFarmId, monthStart, monthEnd),
    getSalesCount(activeFarmId, filterBase),
    getCustomers(activeFarmId),
  ])

  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const offset = (safePage - 1) * PER_PAGE

  const sales = await getSales(activeFarmId, {
    ...filterBase,
    limit: PER_PAGE,
    offset,
  })

  const showingFrom = totalCount === 0 ? 0 : offset + 1
  const showingTo = Math.min(offset + sales.length, totalCount)

  const listExtra: Record<string, string> = {}
  if (from) listExtra.from = from
  if (to) listExtra.to = to
  if (customerId) listExtra.customer = customerId
  if (status !== 'all') listExtra.status = status
  if (q) listExtra.q = q
  if (safePage > 1) listExtra.page = String(safePage)

  const linkParams = { ...listExtra }
  delete linkParams.page

  function statusHref(next: 'all' | 'paid' | 'partial' | 'unpaid') {
    const e = { ...linkParams }
    if (next !== 'all') e.status = next
    else delete e.status
    return withFarmQuery('/farm/sales', activeFarmId, e)
  }

  const newHref = withFarmQuery('/farm/sales/new', activeFarmId)

  return (
    <div className="space-y-6 pb-20 sm:pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            Sales
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Track invoices and manage payments for your poultry output.
          </p>
        </div>
        <Link href={newHref}>
          <Button variant="primarySimple" className="gap-2">
            <Plus className="h-4 w-4" />
            New Sale
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SalesStatCard
          gradient="green"
          label="Total Sales"
          value={formatCurrency(allTimeSummary.totalSales)}
          icon={<TrendingUp className="h-5 w-5" aria-hidden />}
        />
        <SalesStatCard
          gradient="blue"
          label="Collected"
          value={formatCurrency(allTimeSummary.collected)}
          icon={<Wallet className="h-5 w-5" aria-hidden />}
        />
        <SalesStatCard
          gradient="amber"
          label="Outstanding"
          value={formatCurrency(allTimeSummary.outstanding)}
          icon={<Clock className="h-5 w-5" aria-hidden />}
        />
        <SalesStatCard
          gradient="slate"
          label="This Month"
          value={formatCurrency(monthSummary.totalSales)}
          icon={<CalendarDays className="h-5 w-5" aria-hidden />}
        />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-black/[0.04]">
        <form
          method="get"
          action="/farm/sales"
          className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end"
        >
          <input type="hidden" name="farm" value={activeFarmId} />
          {status !== 'all' && <input type="hidden" name="status" value={status} />}

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-700">
              <CalendarDays className="h-4 w-4 text-gray-500" />
              Date range
            </span>
            <div className="flex flex-wrap gap-2">
              <Input
                type="date"
                name="from"
                defaultValue={from}
                className="h-9 w-[150px] rounded-xl"
              />
              <Input
                type="date"
                name="to"
                defaultValue={to}
                className="h-9 w-[150px] rounded-xl"
              />
            </div>
          </div>

          <div className="min-w-[200px] space-y-1">
            <label className="text-xs font-medium text-gray-500">Customer</label>
            <select
              name="customer"
              defaultValue={customerId}
              className="flex h-9 w-full rounded-xl border border-input bg-background px-2.5 text-sm"
            >
              <option value="">All customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ['all', 'All'],
                ['paid', 'Paid'],
                ['partial', 'Partial'],
                ['unpaid', 'Unpaid'],
              ] as const
            ).map(([key, label]) => {
              const active = status === key
              return (
                <Link
                  key={key}
                  href={statusHref(key)}
                  className={cn(
                    'h-9 rounded-full px-4 text-sm font-semibold transition-colors',
                    active
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  {label}
                </Link>
              )
            })}
          </div>

          <div className="relative flex-1 lg:min-w-[220px] lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              name="q"
              placeholder="Search invoice number..."
              defaultValue={q}
              className="h-9 rounded-xl pl-9"
            />
          </div>

          <Button type="submit" variant="secondary" className="h-9 rounded-xl">
            Apply
          </Button>
        </form>
      </div>

      {sales.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No sales match"
          description="Create a sale or adjust filters."
        />
      ) : (
        <div className="space-y-0">
          <SalesTable
            sales={sales}
            farmId={activeFarmId}
            basePath="/farm/sales"
            query={linkParams}
          />
          <SalesPagination
            farmId={activeFarmId}
            page={safePage}
            totalPages={totalPages}
            totalItems={totalCount}
            showingFrom={showingFrom}
            showingTo={showingTo}
            extraParams={linkParams}
          />
        </div>
      )}

      <Link
        href={newHref}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary-gradient text-white shadow-card-md sm:hidden"
        aria-label="New sale"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  )
}
