import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { buttonVariants } from '@/components/ui/button'
import { InventoryQuickAddButton } from '@/components/inventory/InventoryQuickAddButton'
import {
  inventoryCategoryColors,
  inventoryCategoryIcons,
  resolveInventoryCategoryKey,
  shortInventoryTypeBadge,
} from '@/components/inventory/inventory-category-icons'
import {
  calculateStockPercentage,
  getStockBarStatus,
  STOCK_BAR_STYLES,
} from '@/lib/inventory-stock-level'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import type { InventoryItem } from '@/types/database'

function formatRsValue(amount: number): string {
  return formatCurrency(amount).replace('PKR', 'Rs')
}

function itemSubline(item: InventoryItem): string {
  const t = item.type.toLowerCase()
  const notes = item.notes?.trim()
  if ((t === 'medicine' || t === 'vaccine') && notes) {
    const n = notes.slice(0, 48)
    if (/^exp/i.test(notes)) return n
    return `Notes: ${n}`
  }
  if (t === 'medicine' || t === 'vaccine') {
    if (item.last_restocked_at) {
      return `Restocked ${formatDate(item.last_restocked_at)}`
    }
  }
  if (notes) return notes.slice(0, 48)
  return `Batch #${item.id.slice(0, 8)}`
}

function StockLevelBar({
  current,
  minStock,
}: {
  current: number
  minStock: number
}) {
  const percentage = calculateStockPercentage(current, minStock)
  const status = getStockBarStatus(percentage)
  const styles = STOCK_BAR_STYLES[status]

  return (
    <div className="w-36 min-w-[8rem]">
      <div className="mb-1 flex justify-between gap-2 text-xs">
        <span className={cn('font-semibold uppercase tracking-wide', styles.text)}>
          {styles.label}
        </span>
        <span className="tabular-nums text-gray-500">{percentage}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn('h-full rounded-full transition-all', styles.bar)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

interface InventoryTableProps {
  rows: InventoryItem[]
  farmId: string
  page: number
  pageSize: number
  total: number
  prevHref: string | null
  nextHref: string | null
}

export function InventoryTable({
  rows,
  farmId,
  page,
  pageSize,
  total,
  prevHref,
  nextHref,
}: InventoryTableProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-100 hover:bg-transparent">
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Item
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Category
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Quantity
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Reorder
              </TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Value (Rs)
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status &amp; stock level
              </TableHead>
              <TableHead className="w-14 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const cur = Number(row.current_stock ?? 0)
              const min = Number(row.min_stock ?? 0)
              const value = cur * Number(row.unit_price ?? 0)
              const catKey = resolveInventoryCategoryKey(row.type)
              const Icon = inventoryCategoryIcons[catKey]
              const colors = inventoryCategoryColors[catKey]
              const unit = (row.unit ?? '').toUpperCase()

              return (
                <TableRow key={row.id} className="border-gray-100">
                  <TableCell className="align-top">
                    <div className="flex gap-3">
                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                          colors.bg
                        )}
                      >
                        <Icon className={cn('h-5 w-5', colors.text)} aria-hidden />
                      </div>
                      <div className="min-w-0 max-w-[220px]">
                        <Link
                          href={withFarmQuery(`/farm/inventory/${row.id}`, farmId)}
                          className="font-semibold text-gray-900 hover:text-primary-dark hover:underline"
                        >
                          {row.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-gray-500">{itemSubline(row)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <span
                      className={cn(
                        'inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide',
                        colors.badge
                      )}
                    >
                      {shortInventoryTypeBadge(row.type)}
                    </span>
                  </TableCell>
                  <TableCell className="align-top tabular-nums">
                    <span className="font-bold text-gray-900">
                      {cur.toLocaleString()}
                    </span>{' '}
                    <span className="text-xs font-medium uppercase text-gray-500">
                      {unit}
                    </span>
                  </TableCell>
                  <TableCell className="align-top text-sm tabular-nums text-gray-600">
                    {min.toLocaleString()}{' '}
                    <span className="text-xs uppercase text-gray-400">{row.unit}</span>
                  </TableCell>
                  <TableCell className="align-top text-right text-sm font-semibold text-gray-900">
                    {formatRsValue(value)}
                  </TableCell>
                  <TableCell className="align-top">
                    <StockLevelBar current={cur} minStock={min} />
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <InventoryQuickAddButton
                      itemId={row.id}
                      farmId={farmId}
                      itemName={row.name}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-gray-500">
          Showing {from}-{to} of {total} items
        </p>
        <div className="flex items-center gap-2">
          {prevHref ? (
            <Link
              href={prevHref}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-xl')}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Link>
          ) : (
            <span
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'pointer-events-none rounded-xl opacity-50'
              )}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </span>
          )}
          {nextHref ? (
            <Link
              href={nextHref}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-xl')}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          ) : (
            <span
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'pointer-events-none rounded-xl opacity-50'
              )}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
