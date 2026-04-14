import Link from 'next/link'
import type { Sale, SaleLineItem } from '@/types/database'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { SaleStatusBadge } from '@/components/sales/SaleStatusBadge'
import { SaleRowActions } from '@/components/sales/SaleRowActions'

function lineSummary(line_items: SaleLineItem[] | undefined): string {
  const lines = line_items ?? []
  if (lines.length === 0) return '—'
  const first = lines[0]!
  if (lines.length === 1) {
    return `${Number(first.quantity).toLocaleString()} × ${first.type}`
  }
  return `${lines.length} items`
}

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length >= 2) return (p[0]![0]! + p[p.length - 1]![0]!).toUpperCase()
  return name.slice(0, 2).toUpperCase() || '—'
}

function categoryBadge(category: string | undefined | null) {
  const c = (category ?? '').toLowerCase()
  if (c === 'wholesaler')
    return { label: 'WHOLESALE', className: 'bg-green-100 text-green-700' }
  if (c === 'retailer')
    return { label: 'RETAIL', className: 'bg-blue-100 text-blue-700' }
  if (c === 'restaurant')
    return { label: 'RESTAURANT', className: 'bg-orange-100 text-orange-700' }
  if (c === 'individual')
    return { label: 'INDIVIDUAL', className: 'bg-gray-100 text-gray-700' }
  return { label: 'CONTRACTOR', className: 'bg-purple-100 text-purple-700' }
}

function avatarClass(category: string | undefined | null) {
  const c = (category ?? '').toLowerCase()
  if (c === 'wholesaler') return 'bg-blue-500'
  if (c === 'retailer') return 'bg-green-500'
  if (c === 'restaurant') return 'bg-orange-500'
  if (c === 'individual') return 'bg-gray-500'
  return 'bg-purple-500'
}

export function SalesTable({
  sales,
  farmId,
  basePath,
  query,
}: {
  sales: Sale[]
  farmId: string
  basePath: string
  query: Record<string, string | undefined>
}) {
  function rowHref(saleId: string) {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v) q.set(k, v)
    }
    q.set('farm', farmId)
    return `${basePath}/${saleId}?${q.toString()}`
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-card ring-1 ring-black/[0.04]">
      <table className="w-full min-w-[960px] text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">Invoice #</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Items</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3 text-right">Paid</th>
            <th className="px-4 py-3 text-right">Balance</th>
            <th className="px-4 py-3">Status</th>
            <th className="w-[52px] px-2 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sales.map((s) => {
            const cust = s.customers as
              | { name?: string; category?: string | null }
              | undefined
            const name = cust?.name ?? s.customer_name ?? 'Walk-in'
            const cat = cust?.category ?? null
            const badge = categoryBadge(cat)
            const bal = Number(s.balance_due ?? 0)
            return (
              <tr key={s.id} className="text-gray-800">
                <td className="px-4 py-3">
                  <Link
                    href={rowHref(s.id)}
                    className="font-semibold text-gray-900 hover:text-primary-dark"
                  >
                    {s.invoice_number}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                  {formatDate(s.sale_date)}
                </td>
                <td className="max-w-[220px] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white',
                        avatarClass(cat)
                      )}
                    >
                      {initials(name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{name}</p>
                      <span
                        className={cn(
                          'mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          badge.className
                        )}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="max-w-[200px] px-4 py-3 text-gray-600">
                  <span className="line-clamp-2">{lineSummary(s.line_items)}</span>
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {formatCurrency(s.total_amount ?? 0)}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums text-green-700">
                  {formatCurrency(s.paid_amount ?? 0)}
                </td>
                <td
                  className={cn(
                    'px-4 py-3 text-right font-semibold tabular-nums',
                    bal > 0 ? 'text-red-600' : 'text-green-700'
                  )}
                >
                  {formatCurrency(bal)}
                </td>
                <td className="px-4 py-3">
                  <SaleStatusBadge status={s.payment_status} />
                </td>
                <td className="px-2 py-3 text-right">
                  <SaleRowActions saleId={s.id} farmId={farmId} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
