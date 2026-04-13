import { notFound } from 'next/navigation'
import { ShoppingCart } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { InvoicePreview } from '@/components/sales/InvoicePreview'
import { SaleStatusBadge } from '@/components/sales/SaleStatusBadge'
import { PaymentMethodBadge } from '@/components/sales/PaymentMethodBadge'
import { SaleDetailActions } from '@/components/sales/SaleDetailActions'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getSessionProfile } from '@/lib/auth/session'
import {
  getAssignedFarms,
  resolveWorkerFarmId,
} from '@/lib/queries/farm-user'
import { getSaleForFarm } from '@/lib/queries/sales'
import { formatCurrency, formatDate } from '@/lib/utils'

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

  const farmName = assigned.find((f) => f.id === farmId)?.name ?? 'Farm'
  const customerLabel =
    sale.customers?.name ?? sale.customer_name ?? 'Walk-in / no customer'

  return (
    <div className="space-y-6 print:space-y-4">
      <PageHeader
        title={sale.invoice_number}
        description={farmName}
        action={
          <SaleDetailActions
            saleId={sale.id}
            farmId={farmId}
            invoiceNumber={sale.invoice_number}
            balanceDue={Number(sale.balance_due ?? 0)}
            saleDate={sale.sale_date}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <span className="text-sm text-gray-500">Status</span>
        <SaleStatusBadge status={sale.payment_status} />
      </div>

      <div className="print:hidden">
        <InvoicePreview
          sale={sale}
          farmName={farmName}
          customerLabel={customerLabel}
          payments={sale.payments}
        />
      </div>

      {/* Print-only duplicate so layout is clean on paper */}
      <div className="hidden print:block">
        <InvoicePreview
          sale={sale}
          farmName={farmName}
          customerLabel={customerLabel}
          payments={sale.payments}
        />
      </div>

      <div className="rounded-xl border bg-white p-4 print:hidden">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment history</h3>
        {sale.payments.length === 0 ? (
          <p className="text-sm text-gray-500">No payments recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(p.payment_date)}
                  </TableCell>
                  <TableCell>
                    <PaymentMethodBadge method={p.payment_method} />
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {p.reference ?? '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(p.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
