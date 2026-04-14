import Link from 'next/link'
import { cn, formatCompactPkr } from '@/lib/utils'
import type { TopVendorRow } from '@/lib/queries/expenses'

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_BG = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
]

interface VendorAnalysisProps {
  vendors: TopVendorRow[]
  viewAllHref: string
  className?: string
}

export function VendorAnalysis({ vendors, viewAllHref, className }: VendorAnalysisProps) {
  const max = vendors[0]?.total ?? 1

  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-100 bg-white p-6 shadow-sm',
        className
      )}
    >
      <div className="mb-5 flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-gray-900">Vendor analysis</h3>
        <Link
          href={viewAllHref}
          className="text-sm font-medium text-primary-dark hover:underline"
        >
          View all
        </Link>
      </div>

      {vendors.length === 0 ? (
        <p className="text-sm text-gray-500">
          Add vendors to your expenses to see spend by supplier.
        </p>
      ) : (
        <ul className="space-y-5">
          {vendors.map((v, i) => {
            const pct = max > 0 ? Math.round((v.total / max) * 100) : 0
            return (
              <li key={v.vendor} className="flex items-center gap-4">
                <div
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                    AVATAR_BG[i % AVATAR_BG.length]
                  )}
                >
                  {initials(v.vendor)}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="truncate font-medium text-gray-900">{v.vendor}</p>
                    <p className="shrink-0 text-sm font-bold text-gray-900">
                      {formatCompactPkr(v.total)}
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-600"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {v.count} transaction{v.count === 1 ? '' : 's'}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
