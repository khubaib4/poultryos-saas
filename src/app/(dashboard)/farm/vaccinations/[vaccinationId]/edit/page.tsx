import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Syringe } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { VaccinationForm } from '@/components/vaccinations/VaccinationForm'
import { DeleteVaccinationButton } from '@/components/vaccinations/DeleteVaccinationButton'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { getVaccinationForFarm } from '@/lib/queries/vaccinations'
import { getFlocksForVaccinationForm } from '@/lib/queries/flocks'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{ vaccinationId: string }>
  searchParams: Promise<{ farm?: string }>
}

export default async function EditVaccinationPage({
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
        description="Choose an assigned farm to edit this record."
      />
    )
  }

  const vaccination = await getVaccinationForFarm(vaccinationId, farmId)
  if (!vaccination) notFound()

  if (vaccination.status !== 'scheduled') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Cannot edit"
          description="Only scheduled vaccinations can be edited."
          action={
            <Link
              href={withFarmQuery(`/farm/vaccinations/${vaccinationId}`, farmId)}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              View record
            </Link>
          }
        />
      </div>
    )
  }

  const farmName = assigned.find((f) => f.id === farmId)?.name ?? 'Farm'
  const flocks = await getFlocksForVaccinationForm(
    farmId,
    vaccination.flock_id
  )
  const detailHref = withFarmQuery(`/farm/vaccinations/${vaccinationId}`, farmId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit vaccination"
        description={farmName}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href={detailHref}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              View record
            </Link>
            <DeleteVaccinationButton
              vaccinationId={vaccinationId}
              farmId={farmId}
              label={vaccination.vaccine_name}
            />
          </div>
        }
      />
      <VaccinationForm
        farmId={farmId}
        vaccinationId={vaccinationId}
        initial={vaccination}
        flocks={flocks}
      />
    </div>
  )
}
