import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Package } from 'lucide-react'
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
import {
  InventoryStatusBadge,
  getInventoryStockStatus,
} from '@/components/inventory/InventoryStatusBadge'
import { InventoryItemDetailActions } from '@/components/inventory/InventoryItemDetailActions'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { getInventoryItemForFarm } from '@/lib/queries/inventory'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { buttonVariants } from '@/components/ui/button'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

interface PageProps {
  params: Promise<{ itemId: string }>
  searchParams: Promise<{ farm?: string }>
}

export default async function InventoryItemDetailPage({ params, searchParams }: PageProps) {
  const { itemId } = await params
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={Package}
        title="Select a farm"
        description="Choose an assigned farm to view this item."
      />
    )
  }

  const item = await getInventoryItemForFarm(itemId, farmId)
  if (!item) notFound()

  const farmName = assigned.find((f) => f.id === farmId)?.name ?? 'Farm'
  const cur = Number(item.current_stock ?? 0)
  const min = Number(item.min_stock ?? 0)
  const price = Number(item.unit_price ?? 0)
  const value = cur * price
  const status = getInventoryStockStatus(cur, min)
  const statusLabel =
    status === 'in_stock'
      ? 'In stock'
      : status === 'low_stock'
        ? 'Low stock'
        : 'Out of stock'

  const listHref = withFarmQuery('/farm/inventory', farmId)

  return (
    <div className="space-y-6">
      <PageHeader
        title={item.name}
        description={farmName}
        action={
          <Link
            href={listHref}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Back to inventory
          </Link>
        }
      />

      <div className="flex flex-wrap gap-3">
        <InventoryItemDetailActions
          itemId={itemId}
          farmId={farmId}
          itemName={item.name}
          currentStock={cur}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Current stock"
          value={`${cur} ${item.unit}`}
          description="On hand"
          icon={Package}
        />
        <StatCard
          title="Value (PKR)"
          value={formatCurrency(value)}
          description="Stock × unit price"
          icon={Package}
        />
        <StatCard
          title="Status"
          value={<InventoryStatusBadge currentStock={cur} minStock={min} />}
          description={statusLabel}
          icon={Package}
        />
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Details</h2>
        <dl className="grid gap-2 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-gray-500">Type</dt>
            <dd className="mt-0.5">
              <InventoryTypeBadge type={item.type} />
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Minimum stock</dt>
            <dd className="mt-0.5 font-medium">
              {min} {item.unit}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Unit price</dt>
            <dd className="mt-0.5">{formatCurrency(price)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Last restocked</dt>
            <dd className="mt-0.5">
              {item.last_restocked_at
                ? formatDate(item.last_restocked_at)
                : '—'}
            </dd>
          </div>
          {item.notes && (
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Notes</dt>
              <dd className="mt-0.5 whitespace-pre-wrap">{item.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Transaction history</h2>
        {item.transactions.length === 0 ? (
          <p className="text-sm text-gray-500">No stock movements yet.</p>
        ) : (
          <div className="rounded-xl border bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {item.transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(t.transaction_date)}
                    </TableCell>
                    <TableCell className="capitalize">{t.type}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.type === 'reduce' ? '−' : '+'}
                      {Number(t.quantity ?? 0)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.reason ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
