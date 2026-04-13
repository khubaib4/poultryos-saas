import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Package } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { InventoryForm } from '@/components/inventory/InventoryForm'
import { DeleteInventoryButton } from '@/components/inventory/DeleteInventoryButton'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { getInventoryItemForFarm } from '@/lib/queries/inventory'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{ itemId: string }>
  searchParams: Promise<{ farm?: string }>
}

export default async function EditInventoryItemPage({ params, searchParams }: PageProps) {
  const { itemId } = await params
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={Package}
        title="Select a farm"
        description="Choose an assigned farm to edit this item."
      />
    )
  }

  const item = await getInventoryItemForFarm(itemId, farmId)
  if (!item) notFound()

  const farmName = assigned.find((f) => f.id === farmId)?.name ?? 'Farm'
  const detailHref = withFarmQuery(`/farm/inventory/${itemId}`, farmId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit item"
        description={farmName}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href={detailHref}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              View item
            </Link>
            <DeleteInventoryButton
              itemId={itemId}
              farmId={farmId}
              itemName={item.name}
            />
          </div>
        }
      />
      <InventoryForm farmId={farmId} itemId={itemId} initial={item} />
    </div>
  )
}
