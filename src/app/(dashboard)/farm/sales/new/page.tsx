import { ShoppingCart } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { SaleForm } from '@/components/sales/SaleForm'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { getCustomersForSaleForm, generateInvoiceNumber } from '@/lib/queries/sales'
import { getEggCategories } from '@/lib/queries/egg-categories'

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

  const [customers, eggCats, suggestedInvoice] = await Promise.all([
    getCustomersForSaleForm(farmId),
    getEggCategories(farmId),
    generateInvoiceNumber(farmId),
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
        mode="create"
        eggCategories={eggCategories}
        suggestedInvoiceNumber={suggestedInvoice}
      />
    </div>
  )
}
