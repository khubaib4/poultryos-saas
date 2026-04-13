import Link from 'next/link'
import { DollarSign } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExpenseForm } from '@/components/expenses/ExpenseForm'
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

export default async function NewExpensePage({ searchParams }: PageProps) {
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={DollarSign}
        title="Select a farm"
        description="Choose an assigned farm before recording an expense."
      />
    )
  }

  const farmName = assigned.find((f) => f.id === farmId)?.name ?? 'Farm'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add expense"
        description={farmName}
        action={
          <Link
            href={withFarmQuery('/farm/expenses', farmId)}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Back to list
          </Link>
        }
      />
      <ExpenseForm farmId={farmId} />
    </div>
  )
}
