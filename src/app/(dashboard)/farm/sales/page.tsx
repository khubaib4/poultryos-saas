import Link from 'next/link'
import { ShoppingCart, Plus, Banknote, TrendingUp, AlertCircle } from 'lucide-react'
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
import { SaleStatusBadge } from '@/components/sales/SaleStatusBadge'
import { SaleRowActions } from '@/components/sales/SaleRowActions'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { getCustomers } from '@/lib/queries/customers'
import { getSales, getSalesSummary } from '@/lib/queries/sales'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

interface PageProps {
  searchParams: Promise<{
    farm?: string
    from?: string
    to?: string
    customer?: string
    status?: string
  }>
}

export default async function FarmSalesPage({ searchParams }: PageProps) {
  const { profile } = await getSessionProfile()
  const sp = await searchParams
  const assigned = await getAssignedFarms(profile.id)
  const farmId = resolveWorkerFarmId(assigned, sp.farm)

  if (!farmId) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Select a farm"
        description="Choose an assigned farm from the header to view sales."
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

  const summary = await getSalesSummary(activeFarmId, monthStart, monthEnd)

  const from = sp.from?.trim() || ''
  const to = sp.to?.trim() || ''
  const customerId = sp.customer?.trim() || ''
  const status =
    sp.status === 'paid' || sp.status === 'partial' || sp.status === 'unpaid'
      ? sp.status
      : 'all'

  const [sales, customers] = await Promise.all([
    getSales(activeFarmId, {
      dateFrom: from || undefined,
      dateTo: to || undefined,
      customerId: customerId || undefined,
      paymentStatus: status,
      limit: 500,
    }),
    getCustomers(activeFarmId),
  ])

  function customerLabel(s: (typeof sales)[0]) {
    const c = s.customers as { name?: string } | null | undefined
    return c?.name ?? s.customer_name ?? '—'
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        description={farmName}
        action={
          <Link
            href={withFarmQuery('/farm/sales/new', activeFarmId)}
            className={cn(
              buttonVariants(),
              'bg-primary text-white hover:bg-primary-dark [a]:hover:bg-primary-dark'
            )}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Sale
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total sales (month)"
          value={formatCurrency(summary.totalSales)}
          description={`${monthStart} — ${monthEnd}`}
          icon={TrendingUp}
        />
        <StatCard
          title="Collected"
          value={formatCurrency(summary.collected)}
          description="Payments received"
          icon={Banknote}
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(summary.outstanding)}
          description="Balance due on invoices"
          icon={AlertCircle}
        />
      </div>

      <form
        method="get"
        action="/farm/sales"
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
          <div className="space-y-1 min-w-[180px]">
            <label className="text-xs font-medium text-gray-500">Customer</label>
            <select
              name="customer"
              defaultValue={customerId}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              <option value="">All customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 min-w-[140px]">
            <label className="text-xs font-medium text-gray-500">Status</label>
            <select
              name="status"
              defaultValue={status}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
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
          href={withFarmQuery('/farm/sales', activeFarmId)}
          className={cn(buttonVariants({ variant: 'outline' }), 'lg:ml-0')}
        >
          Clear
        </Link>
      </form>

      {sales.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No sales match"
          description="Create a sale or adjust filters."
        />
      ) : (
        <div className="rounded-xl border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[56px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={withFarmQuery(`/farm/sales/${s.id}`, activeFarmId)}
                      className="text-primary-dark hover:underline"
                    >
                      {s.invoice_number}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(s.sale_date)}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate">
                    {customerLabel(s)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(s.total_amount ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(s.paid_amount ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(s.balance_due ?? 0)}
                  </TableCell>
                  <TableCell>
                    <SaleStatusBadge status={s.payment_status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <SaleRowActions saleId={s.id} farmId={activeFarmId} />
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
