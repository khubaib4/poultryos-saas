import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type InventoryStockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

export function getInventoryStockStatus(
  current: number,
  min: number
): InventoryStockStatus {
  const c = Number(current)
  const m = Number(min)
  if (c <= 0) return 'out_of_stock'
  if (m > 0 && c > 0 && c <= m) return 'low_stock'
  if (c > m) return 'in_stock'
  return 'in_stock'
}

const STYLES: Record<InventoryStockStatus, string> = {
  in_stock: 'bg-green-100 text-green-800 border-green-200',
  low_stock: 'bg-amber-100 text-amber-900 border-amber-200',
  out_of_stock: 'bg-red-100 text-red-800 border-red-200',
}

const LABELS: Record<InventoryStockStatus, string> = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  out_of_stock: 'Out of stock',
}

interface InventoryStatusBadgeProps {
  currentStock: number
  minStock: number
  className?: string
}

export function InventoryStatusBadge({
  currentStock,
  minStock,
  className,
}: InventoryStatusBadgeProps) {
  const status = getInventoryStockStatus(currentStock, minStock)
  return (
    <Badge
      variant="outline"
      className={cn('font-medium border', STYLES[status], className)}
    >
      {LABELS[status]}
    </Badge>
  )
}
