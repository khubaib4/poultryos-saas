'use client'

import { cn } from '@/lib/utils'

interface PendingBadgeProps {
  className?: string
  label?: string
}

/** Small indicator for rows not yet synced to the server. */
export function PendingBadge({ className, label = 'Pending sync' }: PendingBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900',
        className
      )}
      title={label}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
      Sync
    </span>
  )
}
