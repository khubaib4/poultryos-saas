import Link from 'next/link'
import { Users, Plus, SlidersHorizontal, Users2, CheckCircle2, Receipt, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { FarmStatCard } from '@/components/dashboard/FarmStatCard'
import { CustomerCard } from '@/components/customers/CustomerCard'
import { RecentCollections } from '@/components/customers/RecentCollections'
import { CustomersSortSelect } from '@/components/customers/CustomersSortSelect'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import {
  CUSTOMER_CATEGORY_PILLS,
  getCustomersWithStats,
  getRecentCollections,
  type CustomerCategoryKey,
  type CustomerSortKey,
} from '@/lib/queries/customers'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn } from '@/lib/utils'

interface PageProps {
  searchParams: Promise<{ farm?: string; q?: string; category?: string; sort?: string }>
}

export default async function FarmCustomersPage({ searchParams }: PageProps) {
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={Users}
        title="Select a farm"
        description="Choose an assigned farm from the header to manage customers."
      />
    )
  }

  const activeFarmId = farmId

  const q = (sp.q ?? '').trim()
  const category = (sp.category ?? 'all').toLowerCase() as CustomerCategoryKey
  const sort = (sp.sort ?? 'recent') as CustomerSortKey

  const [{ customers, stats }, collections] = await Promise.all([
    getCustomersWithStats(activeFarmId, {
      search: q || undefined,
      categoryKey: category,
      sort,
    }),
    getRecentCollections(activeFarmId, 6),
  ])

  const newHref = withFarmQuery('/farm/customers/new', activeFarmId)

  function pillHref(key: CustomerCategoryKey) {
    const extra: Record<string, string> = {}
    if (q) extra.q = q
    if (key !== 'all') extra.category = key
    if (sort !== 'recent') extra.sort = sort
    return withFarmQuery('/farm/customers', activeFarmId, extra)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            Customers
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your buyers and track balances with precision.
          </p>
        </div>
        <Link href={newHref}>
          <Button variant="primarySimple" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <FarmStatCard
          icon={<Users2 className="h-6 w-6" aria-hidden />}
          iconBg="blue"
          label="Total customers"
          value={stats.totalCustomers.toLocaleString()}
          trend={{ value: '+12% from last month', direction: 'up' }}
        />
        <FarmStatCard
          icon={<CheckCircle2 className="h-6 w-6" aria-hidden />}
          iconBg="green"
          label="Active customers"
          value={stats.activeCustomers.toLocaleString()}
          trend={{
            value: `${stats.retentionRatePct.toFixed(1)}% retention rate`,
            direction: 'steady',
          }}
        />
        <FarmStatCard
          icon={<Receipt className="h-6 w-6" aria-hidden />}
          iconBg="amber"
          label="Total receivables"
          value={`Rs ${stats.totalReceivables.toLocaleString()}`}
          trend={{
            value: `${stats.overdueInvoices} invoices overdue`,
            direction: stats.overdueInvoices > 0 ? 'down' : 'steady',
          }}
        />
        <FarmStatCard
          icon={<BarChart3 className="h-6 w-6" aria-hidden />}
          iconBg="purple"
          label="This month sales"
          value={`Rs ${stats.monthSales.toLocaleString()}`}
          trend={{ value: 'On track for target', direction: 'up' }}
        />
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-black/[0.04]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {CUSTOMER_CATEGORY_PILLS.filter((p) => p.key !== 'other').map((p) => {
              const active = category === p.key || (p.key === 'all' && category === 'all')
              return (
                <Link
                  key={p.key}
                  href={pillHref(p.key)}
                  className={cn(
                    'h-9 rounded-full px-4 text-sm font-semibold transition-colors',
                    active
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  {p.label}
                </Link>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end">
            <Button variant="outline" className="h-9 rounded-xl gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              More Filters
            </Button>
            <CustomersSortSelect farmId={activeFarmId} value={sort} />
          </div>
        </div>
      </div>

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q || category !== 'all' ? 'No matching customers' : 'No customers yet'}
          description={
            q || category !== 'all'
              ? 'Try adjusting your filters.'
              : 'Add your first customer to track purchases and debt.'
          }
          action={
            <Link href={newHref}>
              <Button variant="primarySimple" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Customer
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {customers.map((c) => (
              <CustomerCard key={c.id} customer={c} farmId={activeFarmId} />
            ))}

            {/* Add new customer card */}
            <Link
              href={newHref}
              className="group relative flex min-h-[290px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white p-6 text-center shadow-card ring-1 ring-black/[0.04] transition-colors hover:border-gray-300"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-lighter text-primary shadow-sm ring-1 ring-black/[0.04]">
                <Users className="h-6 w-6" />
              </div>
              <p className="mt-4 text-sm font-semibold text-gray-900">Add New Customer</p>
              <p className="mt-1 text-sm text-gray-500">
                Register a new buyer to track their purchases and debt.
              </p>
              <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-card-md group-hover:bg-primary-dark">
                  <Plus className="h-5 w-5" />
                </div>
              </div>
            </Link>
          </div>

          <RecentCollections rows={collections} farmId={activeFarmId} />
        </>
      )}

      {/* Mobile FAB */}
      <Link
        href={newHref}
        className="fixed bottom-6 right-6 z-40 sm:hidden"
        aria-label="Add customer"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-gradient text-white shadow-card-md">
          <Plus className="h-5 w-5" />
        </div>
      </Link>
    </div>
  )
}
