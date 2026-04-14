import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_CLASS: Record<string, string> = {
  paid: 'bg-green-100 text-green-800 border-green-200',
  partial: 'bg-amber-100 text-amber-900 border-amber-200',
  unpaid: 'bg-red-100 text-red-800 border-red-200',
}

const STATUS_LABEL: Record<string, string> = {
  paid: 'PAID',
  partial: 'PARTIAL',
  unpaid: 'UNPAID',
}

interface SaleStatusBadgeProps {
  status: string
  className?: string
}

export function SaleStatusBadge({ status, className }: SaleStatusBadgeProps) {
  const key = status?.toLowerCase() ?? 'unpaid'
  const style = STATUS_CLASS[key] ?? STATUS_CLASS.unpaid
  const label = STATUS_LABEL[key] ?? status

  return (
    <Badge variant="outline" className={cn('font-medium border', style, className)}>
      {label}
    </Badge>
  )
}
