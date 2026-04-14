import Link from 'next/link'
import { Syringe } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { VaccinationScheduleForm } from '@/components/vaccinations/VaccinationScheduleForm'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { getActiveFlocks } from '@/lib/queries/flocks'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn } from '@/lib/utils'

interface PageProps {
  searchParams: Promise<{ farm?: string }>
}

export default async function NewVaccinationPage({ searchParams }: PageProps) {
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={Syringe}
        title="Select a farm"
        description="Choose an assigned farm before scheduling a vaccination."
      />
    )
  }

  const farmName = assigned.find((f) => f.id === farmId)?.name ?? 'Farm'
  const flocks = await getActiveFlocks(farmId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule vaccination"
        description={farmName}
        action={
          <Link
            href={withFarmQuery('/farm/vaccinations', farmId)}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Back to list
          </Link>
        }
      />
      <VaccinationScheduleForm farmId={farmId} flocks={flocks} variant="page" />
    </div>
  )
}
