import Link from 'next/link'
import {
  AlertTriangle,
  Box,
  Coins,
  Package,
  Plus,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { InventoryStatCard } from '@/components/inventory/InventoryStatCard'
import { LowStockAlert } from '@/components/inventory/LowStockAlert'
import { InventoryTable } from '@/components/inventory/InventoryTable'
import { RecentActivity } from '@/components/inventory/RecentActivity'
import { QuickActions } from '@/components/inventory/QuickActions'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import {
  INVENTORY_CATEGORY_PILLS,
  getInventorySummary,
  getInventoryWithStats,
  getRecentInventoryActivity,
  type InventorySortKey,
  type InventoryStatusFilter,
} from '@/lib/queries/inventory'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn } from '@/lib/utils'

interface PageProps {
  searchParams: Promise<{
    farm?: string
    category?: string
    type?: string
    status?: string
    sort?: string
    page?: string
  }>
}

function parseCategory(raw: string | undefined): string {
  const c = (raw ?? 'All').trim()
  if (!c || c === 'All') return 'All'
  const allowed = ['Feed', 'Medicine', 'Equipment', 'Packaging'] as const
  if ((allowed as readonly string[]).includes(c)) return c
  return 'All'
}

function parseStatus(raw: string | undefined): InventoryStatusFilter {
  const v = (raw ?? 'all').toLowerCase()
  if (v === 'in' || v === 'in_stock') return 'in'
  if (v === 'low' || v === 'low_stock') return 'low'
  if (v === 'out' || v === 'out_of_stock') return 'out'
  return 'all'
}

function parseSort(raw: string | undefined): InventorySortKey {
  const v = (raw ?? 'newest').toLowerCase()
  if (v === 'name') return 'name'
  if (v === 'quantity' || v === 'quantity_desc') return 'quantity_desc'
  return 'newest'
}

function listParams(opts: {
  category: string
  status: InventoryStatusFilter
  sort: InventorySortKey
  page: number
}): Record<string, string> {
  const extra: Record<string, string> = {}
  if (opts.category !== 'All') extra.category = opts.category
  if (opts.status !== 'all') extra.status = opts.status
  if (opts.sort !== 'newest') extra.sort = opts.sort
  if (opts.page > 1) extra.page = String(opts.page)
  return extra
}

export default async function FarmInventoryPage({ searchParams }: PageProps) {
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={Package}
        title="Select a farm"
        description="Choose an assigned farm from the header to view inventory."
      />
    )
  }

  const activeFarmId = farmId

  const category = parseCategory(sp.category ?? sp.type)
  const status = parseStatus(sp.status)
  const sort = parseSort(sp.sort)
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)

  const [summary, list, activity] = await Promise.all([
    getInventorySummary(activeFarmId),
    getInventoryWithStats(activeFarmId, {
      categoryPill: category,
      status,
      sort,
      page,
      pageSize: 10,
    }),
    getRecentInventoryActivity(activeFarmId, 8),
  ])

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize))
  const prevPage = page > 1 ? page - 1 : null
  const nextPage = page < totalPages ? page + 1 : null

  const base = (p: number) =>
    withFarmQuery(
      '/farm/inventory',
      activeFarmId,
      listParams({ category, status, sort, page: p })
    )

  const pillHref = (pill: string) =>
    withFarmQuery(
      '/farm/inventory',
      activeFarmId,
      listParams({
        category: pill,
        status,
        sort,
        page: 1,
      })
    )

  const viewLowStockHref = withFarmQuery(
    '/farm/inventory',
    activeFarmId,
    listParams({ category, status: 'low', sort, page: 1 })
  )

  const itemsTrend =
    summary.itemsTrendPct != null
      ? `${summary.itemsTrendPct >= 0 ? '+' : ''}${summary.itemsTrendPct}%`
      : undefined

  const newItemHref = withFarmQuery('/farm/inventory/new', activeFarmId)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Inventory</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage stock levels and supplies across all units
          </p>
        </div>
        <Link href={newItemHref}>
          <Button variant="primarySimple" className="gap-2">
            <Plus className="h-4 w-4" />
            Add item
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InventoryStatCard
          icon={<Box className="h-6 w-6" aria-hidden />}
          iconBg="blue"
          label="Total items"
          value={summary.totalItems}
          trend={itemsTrend}
        />
        <InventoryStatCard
          icon={<Coins className="h-6 w-6" aria-hidden />}
          iconBg="green"
          label="Total value"
          value={`Rs ${Math.round(summary.totalValue).toLocaleString()}`}
          trend={summary.valueTrendLabel ?? undefined}
        />
        <InventoryStatCard
          icon={<AlertTriangle className="h-6 w-6" aria-hidden />}
          iconBg="amber"
          label="Low stock"
          value={String(summary.lowStockCount).padStart(2, '0')}
          tint="amber"
        />
        <InventoryStatCard
          icon={<XCircle className="h-6 w-6" aria-hidden />}
          iconBg="red"
          label="Out of stock"
          value={String(summary.outOfStockCount).padStart(2, '0')}
          tint="red"
        />
      </div>

      <LowStockAlert count={summary.lowStockCount} viewLowStockHref={viewLowStockHref} />

      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {INVENTORY_CATEGORY_PILLS.map((pill) => {
            const isActive = pill === category
            return (
              <Link
                key={pill}
                href={pillHref(pill)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {pill}
              </Link>
            )
          })}
        </div>

        <form
          method="get"
          action="/farm/inventory"
          className="flex flex-wrap items-center gap-3"
        >
          <input type="hidden" name="farm" value={activeFarmId} />
          {category !== 'All' ? <input type="hidden" name="category" value={category} /> : null}
          <input type="hidden" name="sort" value={sort} />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="whitespace-nowrap">Status</span>
            <select
              name="status"
              defaultValue={status}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <option value="all">All</option>
              <option value="in">In stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
          </label>
          <Button type="submit" variant="secondary" size="sm" className="rounded-xl">
            Apply
          </Button>
        </form>

        <form
          method="get"
          action="/farm/inventory"
          className="flex flex-wrap items-center gap-3"
        >
          <input type="hidden" name="farm" value={activeFarmId} />
          {category !== 'All' ? <input type="hidden" name="category" value={category} /> : null}
          <input type="hidden" name="status" value={status} />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="whitespace-nowrap">Sort</span>
            <select
              name="sort"
              defaultValue={sort}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <option value="newest">Newest</option>
              <option value="name">Name</option>
              <option value="quantity_desc">Quantity (high → low)</option>
            </select>
          </label>
          <Button type="submit" variant="secondary" size="sm" className="rounded-xl">
            Apply
          </Button>
        </form>
      </div>

      {list.total === 0 ? (
        <EmptyState
          icon={Package}
          title="No inventory items"
          description="Add an item or change filters."
        />
      ) : (
        <InventoryTable
          rows={list.rows}
          farmId={activeFarmId}
          page={list.page}
          pageSize={list.pageSize}
          total={list.total}
          prevHref={prevPage ? base(prevPage) : null}
          nextHref={nextPage ? base(nextPage) : null}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentActivity entries={activity} />
        <QuickActions
          newOrderHref={newItemHref}
          scanHref={withFarmQuery('/farm/inventory', activeFarmId)}
        />
      </div>
    </div>
  )
}
