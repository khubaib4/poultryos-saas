import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LowStockAlertProps {
  count: number
  viewLowStockHref: string
  className?: string
}

export function LowStockAlert({ count, viewLowStockHref, className }: LowStockAlertProps) {
  if (count <= 0) return null

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100"
          aria-hidden
        >
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        </div>
        <p className="text-sm text-gray-700">
          <strong>{count}</strong> items are running low on stock and need attention
        </p>
      </div>
      <Link
        href={viewLowStockHref}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'shrink-0 bg-white text-center'
        )}
      >
        View low stock
      </Link>
    </div>
  )
}
