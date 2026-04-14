import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { withFarmQuery } from '@/lib/farm-worker-nav'

export function SalesPagination({
  farmId,
  page,
  totalPages,
  totalItems,
  showingFrom,
  showingTo,
  extraParams,
}: {
  farmId: string
  page: number
  totalPages: number
  totalItems: number
  showingFrom: number
  showingTo: number
  extraParams: Record<string, string>
}) {
  function href(p: number) {
    const next = { ...extraParams }
    if (p > 1) next.page = String(p)
    else delete next.page
    return withFarmQuery('/farm/sales', farmId, next)
  }

  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5) return i + 1
    if (page <= 3) return i + 1
    if (page >= totalPages - 2) return totalPages - 4 + i
    return page - 2 + i
  }).filter((n) => n >= 1 && n <= totalPages)

  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        Showing {showingFrom}–{showingTo} of {totalItems} sales
      </p>
      <div className="flex items-center gap-1">
        <Link
          href={href(Math.max(1, page - 1))}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
            page <= 1 && 'pointer-events-none opacity-40'
          )}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        {pages.map((p) => (
          <Link
            key={p}
            href={href(p)}
            className={cn(
              'flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold',
              p === page
                ? 'bg-primary text-white'
                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            )}
          >
            {p}
          </Link>
        ))}
        <Link
          href={href(Math.min(totalPages, page + 1))}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
            page >= totalPages && 'pointer-events-none opacity-40'
          )}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
