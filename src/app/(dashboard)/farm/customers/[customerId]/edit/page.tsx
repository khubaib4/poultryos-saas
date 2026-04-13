import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Users } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { CustomerForm } from '@/components/customers/CustomerForm'
import { DeleteCustomerButton } from '@/components/customers/DeleteCustomerButton'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { getCustomerForFarm } from '@/lib/queries/customers'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{ customerId: string }>
  searchParams: Promise<{ farm?: string }>
}

export default async function EditCustomerPage({ params, searchParams }: PageProps) {
  const { customerId } = await params
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={Users}
        title="Select a farm"
        description="Choose an assigned farm from the header to edit this customer."
      />
    )
  }

  const customer = await getCustomerForFarm(customerId, farmId)
  if (!customer) {
    notFound()
  }

  const farmName = assigned.find((f) => f.id === farmId)?.name ?? 'Farm'
  const detailHref = withFarmQuery(`/farm/customers/${customerId}`, farmId)

  const categoryOptions = [
    'Individual',
    'Retailer',
    'Wholesaler',
    'Restaurant',
    'Other',
  ] as const
  const safeCategory = categoryOptions.includes(
    customer.category as (typeof categoryOptions)[number]
  )
    ? (customer.category as (typeof categoryOptions)[number])
    : 'Other'

  return (
    <div className="space-y-8">
      <PageHeader
        title="Edit customer"
        description={`${farmName} · ${customer.name}`}
        action={
          <div className="flex flex-wrap gap-2 justify-end">
            <Link
              href={detailHref}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              View profile
            </Link>
            <Link
              href={withFarmQuery('/farm/customers', farmId)}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              All customers
            </Link>
          </div>
        }
      />

      <CustomerForm
        farmId={farmId}
        customerId={customerId}
        initialValues={{
          name: customer.name,
          phone: customer.phone ?? '',
          business_name: customer.business_name ?? '',
          address: customer.address ?? '',
          category: safeCategory,
          notes: customer.notes ?? '',
        }}
      />

      <div className="border-t pt-8 max-w-xl">
        <p className="text-sm text-gray-500 mb-3">Danger zone</p>
        <DeleteCustomerButton
          customerId={customerId}
          farmId={farmId}
          customerName={customer.name}
        />
      </div>
    </div>
  )
}
