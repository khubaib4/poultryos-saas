import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Syringe } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { VaccinationStatusBadge } from '@/components/vaccinations/VaccinationStatusBadge'
import { VaccinationDetailActions } from '@/components/vaccinations/VaccinationDetailActions'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import {
  getVaccinationForFarm,
  getVaccinationDisplayStatus,
} from '@/lib/queries/vaccinations'
import { getInventory } from '@/lib/queries/inventory'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { buttonVariants } from '@/components/ui/button'
import { cn, formatDate } from '@/lib/utils'

interface PageProps {
  params: Promise<{ vaccinationId: string }>
  searchParams: Promise<{ farm?: string }>
}

export default async function VaccinationDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { vaccinationId } = await params
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={Syringe}
        title="Select a farm"
        description="Choose an assigned farm to view this record."
      />
    )
  }

  const vaccination = await getVaccinationForFarm(vaccinationId, farmId)
  if (!vaccination) notFound()

  const vaccineInventory = await getInventory(farmId, {
    type: 'Vaccine',
    limit: 200,
  })

  const display = getVaccinationDisplayStatus(vaccination)
  const isScheduled = vaccination.status === 'scheduled'
  const flock = vaccination.flocks
  const listHref = withFarmQuery('/farm/vaccinations', farmId)

  return (
    <div className="space-y-6">
      <PageHeader
        title={vaccination.vaccine_name}
        description={
          flock
            ? `Flock ${flock.batch_number} · ${flock.breed}`
            : 'Vaccination'
        }
        action={
          <Link
            href={listHref}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Back to list
          </Link>
        }
      />

      <VaccinationDetailActions
        vaccinationId={vaccinationId}
        farmId={farmId}
        vaccineLabel={vaccination.vaccine_name}
        isScheduled={isScheduled}
        vaccineInventory={vaccineInventory}
      />

      <div className="rounded-xl border bg-white p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-500">Status</span>
          <VaccinationStatusBadge status={display} />
        </div>

        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-gray-500">Scheduled date</dt>
            <dd className="font-medium">
              {vaccination.scheduled_date
                ? formatDate(vaccination.scheduled_date)
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Completed date</dt>
            <dd className="font-medium">
              {vaccination.completed_date
                ? formatDate(vaccination.completed_date)
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Dosage</dt>
            <dd>{vaccination.dosage ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Method</dt>
            <dd>{vaccination.method ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Administered by</dt>
            <dd>{vaccination.administered_by ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Batch number</dt>
            <dd>{vaccination.batch_number ?? '—'}</dd>
          </div>
          {vaccination.status === 'skipped' && vaccination.skipped_reason && (
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Skip reason</dt>
              <dd>{vaccination.skipped_reason}</dd>
            </div>
          )}
          {(vaccination.inventory_id || vaccination.quantity_used != null) && (
            <>
              <div>
                <dt className="text-gray-500">Inventory use</dt>
                <dd>
                  {vaccination.quantity_used != null
                    ? `${vaccination.quantity_used} deducted`
                    : '—'}
                </dd>
              </div>
            </>
          )}
          {vaccination.notes && (
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Notes</dt>
              <dd className="whitespace-pre-wrap">{vaccination.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      {flock && (
        <div className="rounded-xl border bg-gray-50/80 p-4 text-sm">
          <h2 className="font-semibold text-gray-900">Flock</h2>
          <p className="mt-1 text-gray-700">
            Batch <strong>{flock.batch_number}</strong> · {flock.breed} · status{' '}
            <span className="capitalize">{flock.status}</span>
          </p>
          <Link
            href={withFarmQuery(`/farm/flocks/${flock.id}`, farmId)}
            className="mt-2 inline-block text-primary-dark hover:underline"
          >
            Open flock
          </Link>
        </div>
      )}
    </div>
  )
}
