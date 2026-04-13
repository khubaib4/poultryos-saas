'use client'

import { formatCurrency, formatDate } from '@/lib/utils'
import type { Sale, SaleLineItem } from '@/types/database'
import type { Payment } from '@/types/database'

interface InvoicePreviewProps {
  sale: Sale
  farmName: string
  customerLabel: string
  payments?: Payment[]
  className?: string
}

export function InvoicePreview({
  sale,
  farmName,
  customerLabel,
  payments = [],
  className,
}: InvoicePreviewProps) {
  const lines = (sale.line_items ?? []) as SaleLineItem[]

  return (
    <div
      className={`invoice-print space-y-6 rounded-xl border bg-white p-8 text-gray-900 ${className ?? ''}`}
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Invoice</h1>
          <p className="mt-1 text-sm text-gray-600">{farmName}</p>
        </div>
        <div className="text-right text-sm">
          <p>
            <span className="text-gray-500">Invoice #</span>{' '}
            <span className="font-semibold">{sale.invoice_number}</span>
          </p>
          <p className="mt-1">
            <span className="text-gray-500">Date</span>{' '}
            {formatDate(sale.sale_date)}
          </p>
          {sale.due_date && (
            <p className="mt-1">
              <span className="text-gray-500">Due</span>{' '}
              {formatDate(sale.due_date)}
            </p>
          )}
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Bill to
        </p>
        <p className="font-medium">{customerLabel}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 font-medium">Item</th>
              <th className="pb-2 font-medium text-right">Qty</th>
              <th className="pb-2 font-medium text-right">Unit</th>
              <th className="pb-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2">{line.type}</td>
                <td className="py-2 text-right">{line.quantity}</td>
                <td className="py-2 text-right">
                  {formatCurrency(line.unit_price ?? 0)}
                </td>
                <td className="py-2 text-right font-medium">
                  {formatCurrency(line.total ?? line.quantity * line.unit_price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span>{formatCurrency(sale.subtotal ?? 0)}</span>
        </div>
        {(sale.discount_amount ?? 0) > 0 && (
          <div className="flex justify-between text-amber-800">
            <span>Discount</span>
            <span>− {formatCurrency(sale.discount_amount ?? 0)}</span>
          </div>
        )}
        <div className="flex justify-between border-t pt-2 text-base font-semibold">
          <span>Total</span>
          <span>{formatCurrency(sale.total_amount ?? 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Paid</span>
          <span>{formatCurrency(sale.paid_amount ?? 0)}</span>
        </div>
        <div className="flex justify-between font-medium text-amber-900">
          <span>Balance due</span>
          <span>{formatCurrency(sale.balance_due ?? 0)}</span>
        </div>
      </div>

      {payments.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Payments
          </p>
          <ul className="space-y-1 text-sm text-gray-700">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>
                  {formatDate(p.payment_date)} · {p.payment_method}
                </span>
                <span>{formatCurrency(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sale.notes && (
        <div className="border-t pt-4 text-sm text-gray-600">
          <p className="text-xs font-semibold uppercase text-gray-500">Notes</p>
          <p className="mt-1 whitespace-pre-wrap">{sale.notes}</p>
        </div>
      )}
    </div>
  )
}
