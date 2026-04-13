import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DollarSign, Pencil } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExpenseCategoryBadge } from '@/components/expenses/ExpenseCategoryBadge'
import { DeleteExpenseButton } from '@/components/expenses/DeleteExpenseButton'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { getExpenseForFarm } from '@/lib/queries/expenses'
import { formatExpensePaymentMethod } from '@/lib/expense-display'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

interface PageProps {
  params: Promise<{ expenseId: string }>
  searchParams: Promise<{ farm?: string }>
}

export default async function ExpenseDetailPage({ params, searchParams }: PageProps) {
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
        description="Choose an assigned farm to view this expense."
      />
    )
  }

  const expense = await getExpenseForFarm(expenseId, farmId)
  if (!expense) {
    notFound()
  }

  const farmName = assigned.find((f) => f.id === farmId)?.name ?? 'Farm'
  const editHref = withFarmQuery(`/farm/expenses/${expenseId}/edit`, farmId)
  const listHref = withFarmQuery('/farm/expenses', farmId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense"
        description={farmName}
        action={
          <div className="flex flex-wrap gap-2 justify-end">
            <Link
              href={listHref}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              All expenses
            </Link>
            <Link
              href={editHref}
              className={cn(
                buttonVariants({ size: 'sm' }),
                'bg-primary text-white hover:bg-primary-dark'
              )}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
            <DeleteExpenseButton
              expenseId={expenseId}
              farmId={farmId}
              label={expense.description ?? expense.category}
              variant="default"
            />
          </div>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">
              {formatCurrency(expense.amount)}
            </CardTitle>
            <ExpenseCategoryBadge category={expense.category ?? 'Other'} />
          </div>
          <p className="text-sm text-gray-500 font-normal mt-1">
            {formatDate(expense.expense_date)}
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Description
            </p>
            <p className="text-gray-900 mt-1">{expense.description ?? '—'}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Vendor</p>
              <p className="mt-1">{expense.vendor ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Payment method
              </p>
              <p className="mt-1">
                {formatExpensePaymentMethod(expense.payment_method)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Reference</p>
              <p className="mt-1">{expense.reference ?? '—'}</p>
            </div>
          </div>
          {expense.notes && (
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Notes</p>
              <p className="text-gray-800 mt-1 whitespace-pre-wrap">{expense.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
