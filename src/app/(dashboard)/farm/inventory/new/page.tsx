import Link from 'next/link'
import { Package } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { InventoryForm } from '@/components/inventory/InventoryForm'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn } from '@/lib/utils'

interface PageProps {
  searchParams: Promise<{ farm?: string }>
}

export default async function NewInventoryPage({ searchParams }: PageProps) {
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={Package}
        title="Select a farm"
        description="Choose an assigned farm before adding inventory."
      />
    )
  }

  const farmName = assigned.find((f) => f.id === farmId)?.name ?? 'Farm'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add inventory item"
        description={farmName}
        action={
          <Link
            href={withFarmQuery('/farm/inventory', farmId)}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Back to list
          </Link>
        }
      />
      <InventoryForm farmId={farmId} />
    </div>
  )
}
