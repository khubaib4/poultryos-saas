import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { SaleForm } from '@/components/sales/SaleForm'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { getCustomersForSaleForm } from '@/lib/queries/sales'
import { getEggCategories } from '@/lib/queries/egg-categories'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn } from '@/lib/utils'

interface PageProps {
  searchParams: Promise<{ farm?: string }>
}

export default async function NewSalePage({ searchParams }: PageProps) {
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Select a farm"
        description="Choose an assigned farm before recording a sale."
      />
    )
  }

  const [customers, eggCats] = await Promise.all([
    getCustomersForSaleForm(farmId),
    getEggCategories(farmId),
  ])
  const farmName = assigned.find((f) => f.id === farmId)?.name ?? 'Farm'
  const eggCategories = eggCats.map((c) => ({
    id: c.id,
    name: c.name,
    default_price: c.default_price,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="New sale"
        description={farmName}
        action={
          <Link
            href={withFarmQuery('/farm/sales', farmId)}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Back to sales
          </Link>
        }
      />
      <SaleForm
        farmId={farmId}
        customers={customers}
        mode="create"
        eggCategories={eggCategories}
      />
    </div>
  )
}
