import Link from 'next/link'
import { Package, Plus, AlertTriangle, Banknote, ListOrdered } from 'lucide-react'
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
import { InventoryTypeBadge } from '@/components/inventory/InventoryTypeBadge'
import { InventoryStatusBadge } from '@/components/inventory/InventoryStatusBadge'
import { InventoryRowActions } from '@/components/inventory/InventoryRowActions'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import {
  getInventory,
  getInventorySummary,
  INVENTORY_TYPES,
} from '@/lib/queries/inventory'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn, formatCurrency } from '@/lib/utils'

const FILTER_TABS = ['All', ...INVENTORY_TYPES] as const

interface PageProps {
  searchParams: Promise<{
    farm?: string
    type?: string
  }>
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
  const farmName = assigned.find((f) => f.id === activeFarmId)?.name ?? 'Farm'

  const rawType = sp.type?.trim() ?? ''
  const typeFilter =
    rawType && FILTER_TABS.includes(rawType as (typeof FILTER_TABS)[number])
      ? rawType
      : 'All'

  const [items, summary] = await Promise.all([
    getInventory(activeFarmId, {
      type: typeFilter === 'All' ? undefined : typeFilter,
    }),
    getInventorySummary(activeFarmId),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description={farmName}
        action={
          <Link
            href={withFarmQuery('/farm/inventory/new', activeFarmId)}
            className={cn(
              buttonVariants(),
              'bg-primary text-white hover:bg-primary-dark [a]:hover:bg-primary-dark'
            )}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add item
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total items"
          value={summary.totalItems}
          description="SKUs tracked"
          icon={ListOrdered}
        />
        <StatCard
          title="Low stock items"
          value={
            <span className="inline-flex items-center gap-2">
              {summary.lowStockCount}
              {summary.lowStockCount > 0 && (
                <AlertTriangle
                  className="h-6 w-6 text-amber-500"
                  aria-hidden
                />
              )}
            </span>
          }
          description="At or below minimum"
          icon={Package}
        />
        <StatCard
          title="Total value"
          value={formatCurrency(summary.totalValue)}
          description="current stock × unit price (PKR)"
          icon={Banknote}
        />
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-3">
        {FILTER_TABS.map((tab) => {
          const isActive =
            tab === 'All' ? typeFilter === 'All' : typeFilter === tab
          const href =
            tab === 'All'
              ? withFarmQuery('/farm/inventory', activeFarmId)
              : withFarmQuery('/farm/inventory', activeFarmId, { type: tab })
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

      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No inventory items"
          description="Add an item or change the type filter."
        />
      ) : (
        <div className="rounded-xl border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Min</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[56px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => {
                const cur = Number(row.current_stock ?? 0)
                const min = Number(row.min_stock ?? 0)
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={withFarmQuery(`/farm/inventory/${row.id}`, activeFarmId)}
                        className="text-primary-dark hover:underline"
                      >
                        {row.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <InventoryTypeBadge type={row.type} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {cur}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {min}
                    </TableCell>
                    <TableCell>{row.unit}</TableCell>
                    <TableCell>
                      <InventoryStatusBadge
                        currentStock={cur}
                        minStock={min}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <InventoryRowActions
                        itemId={row.id}
                        farmId={activeFarmId}
                        itemName={row.name}
                        currentStock={cur}
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
