import Link from 'next/link'
import { AlertTriangle, Syringe } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { getCountdownBadge } from '@/lib/vaccination-badges'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import type { Vaccination } from '@/types/database'
import { cn } from '@/lib/utils'

interface UpcomingVaccinationsProps {
  items: Vaccination[]
  farmId: string
  viewAllHref: string
  className?: string
}

function badgeClass(variant: 'amber' | 'red' | 'gray'): string {
  if (variant === 'red') return 'bg-red-100 text-red-800'
  if (variant === 'amber') return 'bg-amber-100 text-amber-800'
  return 'bg-gray-100 text-gray-700'
}

export function UpcomingVaccinations({
  items,
  farmId,
  viewAllHref,
  className,
}: UpcomingVaccinationsProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-100 bg-white p-5 shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Next 7 days</h2>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600">
          {items.length} items
        </span>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No scheduled vaccinations in the next week.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((v) => {
            const sched = v.scheduled_date
              ? new Date(`${v.scheduled_date.slice(0, 10)}T12:00:00`)
              : new Date()
            const cd = getCountdownBadge(sched)
            const isOverdue = cd.variant === 'red'
            const birds = v.flocks?.current_count
            const flockLine = v.flocks?.batch_number
              ? `Flock #${v.flocks.batch_number}${birds != null ? ` • ${Number(birds).toLocaleString()} birds` : ''}`
              : '—'

            return (
              <li key={v.id}>
                <Link
                  href={withFarmQuery(`/farm/vaccinations/${v.id}`, farmId)}
                  className="flex gap-3 rounded-xl border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      isOverdue
                        ? 'bg-red-100 text-red-600'
                        : cd.variant === 'amber'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-500'
                    )}
                  >
                    {isOverdue ? (
                      <AlertTriangle className="h-5 w-5" aria-hidden />
                    ) : (
                      <Syringe className="h-5 w-5" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{v.vaccine_name}</p>
                    <p className="mt-0.5 text-sm text-gray-600">{flockLine}</p>
                    <span
                      className={cn(
                        'mt-2 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                        badgeClass(cd.variant)
                      )}
                    >
                      {cd.text}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <Link
        href={viewAllHref}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'mt-4 w-full rounded-xl'
        )}
      >
        View all schedule
      </Link>
    </div>
  )
}
