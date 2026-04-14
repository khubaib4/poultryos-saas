import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InventoryActivityEntry } from '@/lib/queries/inventory'

interface RecentActivityProps {
  entries: InventoryActivityEntry[]
  className?: string
}

export function RecentActivity({ entries, className }: RecentActivityProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-100 bg-white p-6 shadow-sm',
        className
      )}
    >
      <h2 className="text-lg font-semibold text-gray-900">Recent activity</h2>
      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          Stock movements will show up here when you add or remove inventory.
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {entries.map((e) => {
            const iconWrap =
              e.kind === 'add'
                ? 'bg-emerald-100 text-emerald-600'
                : e.kind === 'threshold'
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-gray-100 text-gray-600'
            const Icon = e.kind === 'add' ? Plus : e.kind === 'threshold' ? AlertTriangle : Minus

            return (
              <li
                key={e.id}
                className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3"
              >
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                    iconWrap
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{e.title}</p>
                  <p className="mt-0.5 text-sm text-gray-600">{e.subtitle}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {formatDistanceToNow(new Date(e.at), { addSuffix: true })}
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
