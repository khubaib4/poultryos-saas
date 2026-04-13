import Link from 'next/link'
import { DollarSign, Plus, Receipt, Tag, ListOrdered } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { ExpenseCategoryBadge } from '@/components/expenses/ExpenseCategoryBadge'
import { ExpenseRowActions } from '@/components/expenses/ExpenseRowActions'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { getExpenses, getExpensesSummary, getExpenseCategories } from '@/lib/queries/expenses'
import { formatExpensePaymentMethod } from '@/lib/expense-display'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

interface PageProps {
  searchParams: Promise<{
    farm?: string
    from?: string
    to?: string
    category?: string
  }>
}

export default async function FarmExpensesPage({ searchParams }: PageProps) {
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={DollarSign}
        title="Select a farm"
        description="Choose an assigned farm from the header to view expenses."
      />
    )
  }

  const activeFarmId = farmId
  const farmName = assigned.find((f) => f.id === activeFarmId)?.name ?? 'Farm'

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10)

  const monthSummary = await getExpensesSummary(activeFarmId, monthStart, monthEnd)

  const from = sp.from?.trim() ?? ''
  const to = sp.to?.trim() ?? ''
  const categoryFilter = sp.category?.trim() ?? ''

  const expenses = await getExpenses(activeFarmId, {
    dateFrom: from || undefined,
    dateTo: to || undefined,
    category: categoryFilter || undefined,
    limit: 500,
  })

  const categories = getExpenseCategories()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description={farmName}
        action={
          <Link
            href={withFarmQuery('/farm/expenses/new', activeFarmId)}
            className={cn(
              buttonVariants(),
              'bg-primary text-white hover:bg-primary-dark [a]:hover:bg-primary-dark'
            )}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total expenses (month)"
          value={formatCurrency(monthSummary.totalAmount)}
          description={`${monthStart} — ${monthEnd}`}
          icon={Receipt}
        />
        <StatCard
          title="Top category"
          value={
            monthSummary.topCategory
              ? `${monthSummary.topCategory.category}`
              : '—'
          }
          description={
            monthSummary.topCategory
              ? formatCurrency(monthSummary.topCategory.total)
              : 'No expenses this month'
          }
          icon={Tag}
        />
        <StatCard
          title="Entries (month)"
          value={monthSummary.entryCount}
          description="Records in date range"
          icon={ListOrdered}
        />
      </div>

      <form
        method="get"
        action="/farm/expenses"
        className="flex flex-col gap-3 rounded-xl border bg-white p-4 lg:flex-row lg:flex-wrap lg:items-end"
      >
        <input type="hidden" name="farm" value={activeFarmId} />
        <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">From</label>
            <Input type="date" name="from" defaultValue={from} className="h-9 w-40" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">To</label>
            <Input type="date" name="to" defaultValue={to} className="h-9 w-40" />
          </div>
          <div className="space-y-1 min-w-[220px]">
            <label className="text-xs font-medium text-gray-500">Category</label>
            <select
              name="category"
              defaultValue={categoryFilter}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="submit"
          className={cn(buttonVariants({ variant: 'secondary' }), 'lg:ml-2')}
        >
          Apply filters
        </button>
        <Link
          href={withFarmQuery('/farm/expenses', activeFarmId)}
          className={cn(buttonVariants({ variant: 'outline' }), 'lg:ml-0')}
        >
          Clear
        </Link>
      </form>

      {expenses.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No expenses match"
          description="Add an expense or adjust filters."
        />
      ) : (
        <div className="rounded-xl border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="w-[56px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap">
                    <Link
                      href={withFarmQuery(`/farm/expenses/${e.id}`, activeFarmId)}
                      className="text-primary-dark hover:underline"
                    >
                      {formatDate(e.expense_date)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <ExpenseCategoryBadge category={e.category ?? 'Other'} />
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-gray-700">
                    {e.description ?? '—'}
                  </TableCell>
                  <TableCell className="max-w-[140px] truncate text-gray-600">
                    {e.vendor ?? '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(e.amount ?? 0)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">
                    {formatExpensePaymentMethod(e.payment_method)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ExpenseRowActions expenseId={e.id} farmId={activeFarmId} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
