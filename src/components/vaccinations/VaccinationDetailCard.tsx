import Link from 'next/link'
import { CheckCircle2, Droplets } from 'lucide-react'
import { vaccinationStatusStyles } from '@/lib/vaccination-badges'
import type { Vaccination } from '@/types/database'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface VaccinationDetailCardProps {
  vaccination: Vaccination
  variant: 'completed' | 'scheduled'
  detailHref: string
}

export function VaccinationDetailCard({
  vaccination,
  variant,
  detailHref,
}: VaccinationDetailCardProps) {
  const styles =
    variant === 'completed'
      ? vaccinationStatusStyles.completed
      : vaccinationStatusStyles.scheduled

  const flockLabel = vaccination.flocks?.batch_number
    ? `${vaccination.flocks.batch_number} (${vaccination.flocks.breed})`
    : '—'
  const birds = vaccination.flocks?.current_count

  return (
    <Link
      href={detailHref}
      className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
            variant === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
          )}
        >
          {variant === 'completed' ? (
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          ) : (
            <Droplets className="h-5 w-5" aria-hidden />
          )}
        </div>
        <span
          className={cn(
            'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
            styles.badge
          )}
        >
          {variant === 'completed' ? 'Completed' : 'Scheduled'}
        </span>
      </div>
      <p className="mt-3 text-lg font-semibold text-gray-900">{vaccination.vaccine_name}</p>
      <p className="mt-1 text-sm text-gray-600">
        {vaccination.method ? `${vaccination.method}` : 'Method not recorded'}
      </p>
      <dl className="mt-4 grid gap-2 text-xs text-gray-600">
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="font-semibold uppercase tracking-wide text-gray-400">Flock</dt>
          <dd className="font-medium text-gray-800">{flockLabel}</dd>
        </div>
        {variant === 'completed' ? (
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="font-semibold uppercase tracking-wide text-gray-400">Bird count</dt>
            <dd className="font-medium text-gray-800">
              {birds != null ? `${Number(birds).toLocaleString()} birds` : '—'}
            </dd>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="font-semibold uppercase tracking-wide text-gray-400">Dosage</dt>
              <dd className="font-medium text-gray-800">{vaccination.dosage?.trim() || '—'}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="font-semibold uppercase tracking-wide text-gray-400">Scheduled date</dt>
              <dd className="font-medium text-gray-800">
                {vaccination.scheduled_date ? formatDate(vaccination.scheduled_date) : '—'}
              </dd>
            </div>
          </>
        )}
      </dl>
    </Link>
  )
}
