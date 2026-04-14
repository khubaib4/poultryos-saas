import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { buttonVariants } from '@/components/ui/button'
import { ExpenseRowActions } from '@/components/expenses/ExpenseRowActions'
import {
  categoryColors,
  categoryIcons,
  resolveExpenseCategoryKey,
  shortCategoryBadgeLabel,
} from '@/components/expenses/expense-category-icons'
import { isExpensePaymentPending } from '@/lib/expense-display'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn, formatCurrency, formatExpenseDateTime } from '@/lib/utils'
import type { Expense } from '@/types/database'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ExpensesTableProps {
  expenses: Expense[]
  farmId: string
  page: number
  pageSize: number
  total: number
  prevHref: string | null
  nextHref: string | null
}

export function ExpensesTable({
  expenses,
  farmId,
  page,
  pageSize,
  total,
  prevHref,
  nextHref,
}: ExpensesTableProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-100 hover:bg-transparent">
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Date
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Expense details
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Vendor
              </TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Amount
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </TableHead>
              <TableHead className="w-[56px] text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((e) => {
              const catKey = resolveExpenseCategoryKey(e.category ?? 'Other')
              const Icon = categoryIcons[catKey]
              const colors = categoryColors[catKey]
              const pending = isExpensePaymentPending(e.payment_method)
              return (
                <TableRow key={e.id} className="border-gray-100">
                  <TableCell className="whitespace-nowrap align-top text-sm text-gray-700">
                    <Link
                      href={withFarmQuery(`/farm/expenses/${e.id}`, farmId)}
                      className="text-primary-dark hover:underline"
                    >
                      {formatExpenseDateTime(e.expense_date, e.created_at)}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[min(280px,40vw)] align-top">
                    <div className="flex gap-3">
                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                          colors.bg
                        )}
                      >
                        <Icon className={cn('h-5 w-5', colors.icon)} aria-hidden />
                      </div>
                      <div className="min-w-0 space-y-1.5">
                        <p className="truncate font-medium text-gray-900">
                          {e.description ?? '—'}
                        </p>
                        <span
                          className={cn(
                            'inline-block rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide',
                            colors.bg,
                            colors.text
                          )}
                        >
                          {shortCategoryBadgeLabel(e.category ?? 'Other')}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[140px] truncate align-top text-sm text-gray-600">
                    {e.vendor ?? '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right align-top text-sm font-bold text-gray-900">
                    {formatCurrency(e.amount ?? 0).replace('PKR', 'Rs')}
                  </TableCell>
                  <TableCell className="align-top">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide',
                        pending
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      )}
                    >
                      {pending ? 'PENDING' : 'PAID'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <ExpenseRowActions expenseId={e.id} farmId={farmId} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-gray-500">
          Showing {from} to {to} of {total} expenses
        </p>
        <div className="flex items-center gap-2">
          {prevHref ? (
            <Link
              href={prevHref}
              aria-label="Previous page"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'icon-sm' }),
                'rounded-xl'
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          ) : (
            <span
              className={cn(
                buttonVariants({ variant: 'outline', size: 'icon-sm' }),
                'pointer-events-none rounded-xl opacity-50'
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </span>
          )}
          {nextHref ? (
            <Link
              href={nextHref}
              aria-label="Next page"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'icon-sm' }),
                'rounded-xl'
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span
              className={cn(
                buttonVariants({ variant: 'outline', size: 'icon-sm' }),
                'pointer-events-none rounded-xl opacity-50'
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
