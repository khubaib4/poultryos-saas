import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ShoppingCart,
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  Clock,
  FileText,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { SaleStatusBadge } from '@/components/sales/SaleStatusBadge'
import { PaymentMethodBadge } from '@/components/sales/PaymentMethodBadge'
import { SaleDetailActions } from '@/components/sales/SaleDetailActions'
import { InvoiceTimeline } from '@/components/sales/InvoiceTimeline'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { getSaleForFarm } from '@/lib/queries/sales'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { buildInvoicePdfData } from '@/lib/export/invoice-pdf'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { SaleLineItem } from '@/types/database'

interface PageProps {
  params: Promise<{ saleId: string }>
  searchParams: Promise<{ farm?: string }>
}

export default async function SaleDetailPage({ params, searchParams }: PageProps) {
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
        description="Choose an assigned farm to view this sale."
      />
    )
  }

  const sale = await getSaleForFarm(saleId, farmId)
  if (!sale) {
    notFound()
  }

  const farmRow = assigned.find((f) => f.id === farmId)
  const farmName = farmRow?.name ?? 'Farm'
  const invoicePdfData = buildInvoicePdfData(sale, {
    name: farmName,
    location: farmRow?.location ?? null,
  })
  const customerLabel =
    sale.customers?.name ?? sale.customer_name ?? 'Walk-in / no customer'
  const customerAddr = sale.customers?.business_name
    ? `${sale.customers.business_name}`
    : '—'

  const lines = (sale.line_items ?? []) as SaleLineItem[]
  const balance = Number(sale.balance_due ?? 0)
  const paid = Number(sale.paid_amount ?? 0)

  const todayIso = new Date().toISOString().slice(0, 10)
  const dueIso = sale.due_date?.slice(0, 10)
  const dueOverdue =
    Boolean(dueIso && dueIso < todayIso && balance > 0.009)

  const listHref = withFarmQuery('/farm/sales', farmId)

  const timelineItems = [
    {
      id: 'created',
      title: 'Invoice Created',
      subtitle: sale.created_at
        ? `${formatDate(sale.created_at.split('T')[0] ?? sale.sale_date)} · ${new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : formatDate(sale.sale_date),
      tone: 'done' as const,
    },
    {
      id: 'email',
      title: `Emailed to ${customerLabel.split(' ')[0] ?? 'customer'}`,
      subtitle: 'Pending email integration',
      tone: 'pending' as const,
    },
    ...(sale.payments.length > 0
      ? [
          {
            id: 'pay',
            title: 'Payment Received',
            subtitle: `${formatDate(sale.payments[0]!.payment_date)} · ${formatCurrency(sale.payments[0]!.amount)}`,
            tone: 'action' as const,
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-6 print:max-w-none">
      <div className="flex flex-col gap-4 print:hidden">
        <Link href={listHref}>
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Sales
          </Button>
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Invoice # {sale.invoice_number}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <SaleStatusBadge status={sale.payment_status} />
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                <Calendar className="h-4 w-4" aria-hidden />
                Issued on {formatDate(sale.sale_date)}
              </span>
            </div>
          </div>
          <SaleDetailActions
            saleId={sale.id}
            farmId={farmId}
            invoiceNumber={sale.invoice_number}
            balanceDue={balance}
            saleDate={sale.sale_date}
            pdfData={invoicePdfData}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-black/[0.04] print:shadow-none print:ring-0">
            <div className="border-b border-gray-100 p-6 sm:p-8">
              <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                    <Building2 className="h-6 w-6" aria-hidden />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      From
                    </p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{farmName}</p>
                    <p className="mt-1 text-sm text-gray-600">Poultry farm · PKR invoices</p>
                    <p className="text-sm text-gray-600">Phone: —</p>
                  </div>
                </div>
                <div className="lg:text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Billed To
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{customerLabel}</p>
                  <p className="mt-1 text-sm text-gray-600">{customerAddr}</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto px-4 sm:px-8">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    <th className="py-3 pr-4">Description</th>
                    <th className="py-3 pr-4">Quantity</th>
                    <th className="py-3 pr-4 text-right">Unit Price</th>
                    <th className="py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {lines.map((line, i) => (
                    <tr key={i}>
                      <td className="py-3 pr-4 font-medium text-gray-900">{line.type}</td>
                      <td className="py-3 pr-4 text-gray-700 tabular-nums">
                        {Number(line.quantity).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-gray-700">
                        {formatCurrency(line.unit_price ?? 0)}
                      </td>
                      <td className="py-3 text-right font-semibold tabular-nums text-gray-900">
                        {formatCurrency(line.total ?? line.quantity * line.unit_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-100 p-6 sm:p-8">
              <div className="ml-auto max-w-sm space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(sale.subtotal ?? 0)}</span>
                </div>
                {(sale.discount_amount ?? 0) > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Discount</span>
                    <span className="tabular-nums">
                      − {formatCurrency(sale.discount_amount ?? 0)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900">
                  <span>Total Amount</span>
                  <span className="tabular-nums">{formatCurrency(sale.total_amount ?? 0)}</span>
                </div>
                <div className="flex justify-between font-medium text-green-700">
                  <span>Amount Paid</span>
                  <span className="tabular-nums">− {formatCurrency(paid)}</span>
                </div>
              </div>
              <div className="mt-6 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Balance Due
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">
                  {formatCurrency(balance)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/[0.04] print:hidden">
            <div className="flex items-center gap-2 text-gray-900">
              <Clock className="h-5 w-5 text-gray-500" aria-hidden />
              <h3 className="text-base font-semibold">Payment History</h3>
            </div>
            <div className="mt-4 space-y-3">
              {sale.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-700">
                      <Check className="h-4 w-4" aria-hidden />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        <PaymentMethodBadge method={p.payment_method} />
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(p.payment_date)}
                        {p.reference ? ` · Ref ${p.reference}` : ''}
                      </p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-green-700 tabular-nums">
                    {formatCurrency(p.amount)}
                  </p>
                </div>
              ))}
              {balance > 0.009 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-gray-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                      <MoreHorizontal className="h-4 w-4" aria-hidden />
                    </div>
                    <p className="text-sm font-medium text-gray-600">
                      Awaiting remaining balance…
                    </p>
                  </div>
                  <p className="text-lg font-bold text-gray-900 tabular-nums">
                    {formatCurrency(balance)}
                  </p>
                </div>
              )}
              {sale.payments.length === 0 && balance <= 0.009 && (
                <p className="text-sm text-gray-500">No payments recorded.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 print:hidden">
          <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/[0.04]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Invoice Details
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Due Date</dt>
                <dd
                  className={cn(
                    'font-semibold tabular-nums',
                    dueOverdue ? 'text-red-600' : 'text-gray-900'
                  )}
                >
                  {sale.due_date ? formatDate(sale.due_date) : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Terms</dt>
                <dd className="font-medium text-gray-900">Net 14</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Account Manager</dt>
                <dd className="font-medium text-gray-900">—</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Currency</dt>
                <dd className="font-medium text-gray-900">PKR (Rs)</dd>
              </div>
            </dl>
          </div>

          {sale.notes && (
            <div className="rounded-2xl bg-primary-lighter/80 p-5 ring-1 ring-primary/15">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary-dark" aria-hidden />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-dark">
                  Farmer&apos;s Notes
                </p>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                {sale.notes}
              </p>
            </div>
          )}

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-800 to-green-700 p-5 text-white shadow-card-md">
            <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
            <p className="relative text-3xl font-bold">+12.4%</p>
            <p className="relative mt-2 text-sm text-white/90">
              This client has increased their purchase volume compared to last quarter.
            </p>
            <Sparkles className="relative mt-3 h-5 w-5 text-primary-light" aria-hidden />
          </div>

          <InvoiceTimeline items={timelineItems} />
        </div>
      </div>
    </div>
  )
}
