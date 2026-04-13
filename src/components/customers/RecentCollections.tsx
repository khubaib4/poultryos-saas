import Link from 'next/link'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { RecentCollectionRow } from '@/lib/queries/customers'
import { categoryColors, categoryKeyFromDb } from '@/components/customers/customer-category-colors'
import { withFarmQuery } from '@/lib/farm-worker-nav'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'CU'
  const first = parts[0]?.[0] ?? 'C'
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (first + last).toUpperCase()
}

function methodLabel(raw: string) {
  const r = String(raw ?? '').toUpperCase().replace(/_/g, ' ')
  if (!r) return 'CASH'
  if (r === 'BANK TRANSFER') return 'BANK TRANSFER'
  if (r === 'EASYPAISA') return 'EASYPAISA'
  if (r === 'JAZZCASH') return 'JAZZCASH'
  if (r === 'CHEQUE') return 'CHEQUE'
  return r
}

function methodTone(raw: string) {
  const r = String(raw ?? '').toLowerCase()
  if (r === 'bank_transfer') return 'bg-blue-100 text-blue-700'
  if (r === 'cash') return 'bg-gray-100 text-gray-700'
  return 'bg-green-100 text-green-700'
}

export function RecentCollections({
  rows,
  farmId,
}: {
  rows: RecentCollectionRow[]
  farmId: string
}) {
  const link = withFarmQuery('/farm/sales', farmId, { paymentStatus: 'paid' })

  return (
    <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/[0.04]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-primary" aria-hidden />
          <h3 className="text-sm font-semibold text-gray-900">Recent Collections</h3>
        </div>
        <Link href={link} className="text-sm font-semibold text-primary hover:text-primary-dark">
          View All Transactions
        </Link>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="pb-3 pr-4">Customer</th>
              <th className="pb-3 pr-4">Date</th>
              <th className="pb-3 pr-4">Method</th>
              <th className="pb-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => {
              const key = categoryKeyFromDb(r.customer_category)
              const colors = categoryColors[key]
              const customerHref = r.customer_id
                ? withFarmQuery(`/farm/customers/${r.customer_id}`, farmId)
                : withFarmQuery('/farm/customers', farmId)
              return (
                <tr key={r.id} className="text-gray-700">
                  <td className="py-3 pr-4">
                    <Link href={customerHref} className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white',
                          colors.avatar
                        )}
                        aria-hidden
                      >
                        {initials(r.customer_name)}
                      </div>
                      <span className="font-semibold text-gray-900">
                        {r.customer_name}
                      </span>
                    </Link>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">{formatDate(r.payment_date)}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={cn(
                        'rounded-full px-2 py-1 text-[10px] font-semibold tracking-wide',
                        methodTone(r.payment_method)
                      )}
                    >
                      {methodLabel(r.payment_method)}
                    </span>
                  </td>
                  <td className="py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(r.amount)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

