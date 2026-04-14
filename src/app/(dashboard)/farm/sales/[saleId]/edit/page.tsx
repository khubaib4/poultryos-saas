import { notFound } from 'next/navigation'
import { ShoppingCart } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { SaleForm } from '@/components/sales/SaleForm'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { getCustomersForSaleForm, getSaleForFarm } from '@/lib/queries/sales'
import { getEggCategories } from '@/lib/queries/egg-categories'

interface PageProps {
  params: Promise<{ saleId: string }>
  searchParams: Promise<{ farm?: string }>
}

export default async function EditSalePage({ params, searchParams }: PageProps) {
  const { saleId } = await params
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Select a farm"
        description="Choose an assigned farm to edit this sale."
      />
    )
  }

  const sale = await getSaleForFarm(saleId, farmId)
  if (!sale) {
    notFound()
  }

  const [customers, eggCats] = await Promise.all([
    getCustomersForSaleForm(farmId),
    getEggCategories(farmId),
  ])
  const eggCategories = eggCats.map((c) => ({
    id: c.id,
    name: c.name,
    default_price: c.default_price,
  }))

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <SaleForm
        farmId={farmId}
        customers={customers}
        mode="edit"
        initialSale={sale}
        eggCategories={eggCategories}
      />
    </div>
  )
}
