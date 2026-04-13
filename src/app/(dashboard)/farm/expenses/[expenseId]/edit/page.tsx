import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DollarSign } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExpenseForm } from '@/components/expenses/ExpenseForm'
import { DeleteExpenseButton } from '@/components/expenses/DeleteExpenseButton'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { getExpenseForFarm } from '@/lib/queries/expenses'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{ expenseId: string }>
  searchParams: Promise<{ farm?: string }>
}

export default async function EditExpensePage({ params, searchParams }: PageProps) {
  const { expenseId } = await params
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={DollarSign}
        title="Select a farm"
        description="Choose an assigned farm to edit this expense."
      />
    )
  }

  const expense = await getExpenseForFarm(expenseId, farmId)
  if (!expense) {
    notFound()
  }

  const farmName = assigned.find((f) => f.id === farmId)?.name ?? 'Farm'
  const detailHref = withFarmQuery(`/farm/expenses/${expenseId}`, farmId)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Edit expense"
        description={`${farmName} · ${expense.description?.slice(0, 60) ?? expense.id}`}
        action={
          <Link
            href={detailHref}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            View details
          </Link>
        }
      />

      <ExpenseForm farmId={farmId} expenseId={expenseId} initial={expense} />

      <div className="border-t pt-8 max-w-xl">
        <p className="text-sm text-gray-500 mb-3">Danger zone</p>
        <DeleteExpenseButton
          expenseId={expenseId}
          farmId={farmId}
          label={expense.description ?? expense.category}
        />
      </div>
    </div>
  )
}
