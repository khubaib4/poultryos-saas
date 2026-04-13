import Link from 'next/link'
import { Users } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { CustomerForm } from '@/components/customers/CustomerForm'
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

export default async function NewCustomerPage({ searchParams }: PageProps) {
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={Users}
        title="Select a farm"
        description="Choose an assigned farm from the header before adding a customer."
      />
    )
  }

  const farmName = assigned.find((f) => f.id === farmId)?.name ?? 'Farm'
  const backHref = withFarmQuery('/farm/customers', farmId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add customer"
        description={farmName}
        action={
          <Link
            href={backHref}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Back to list
          </Link>
        }
      />
      <CustomerForm farmId={farmId} />
    </div>
  )
}
