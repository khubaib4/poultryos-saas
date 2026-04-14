'use client'

import Link from 'next/link'
import type { TopCustomerRow } from '@/lib/queries/reports-analytics'
import { formatRsFull } from '@/lib/reports-chart-theme'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn } from '@/lib/utils'

interface TopCustomersTableProps {
  rows: TopCustomerRow[]
  farmId: string
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function TopCustomersTable({ rows, farmId }: TopCustomersTableProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Top high-value customers</h3>
          <p className="text-sm text-gray-500">
            Based on lifetime poultry intake and payment health
          </p>
        </div>
        <Link
          href={withFarmQuery('/farm/sales', farmId)}
          className="text-sm font-medium text-primary hover:underline"
        >
          View ledger →
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
              <th className="px-5 py-3 font-semibold">Client name</th>
              <th className="px-5 py-3 font-semibold">Category</th>
              <th className="px-5 py-3 font-semibold">Total purchases</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Balance due</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                  No customer sales recorded yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/80">
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-700">
                        {initials(r.name)}
                      </span>
                      <span className="font-medium text-gray-900">{r.name}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-bold uppercase',
                        r.category === 'WHOLESALER' && 'bg-blue-100 text-blue-800',
                        r.category === 'RETAILER' && 'bg-emerald-100 text-emerald-800',
                        r.category === 'DIRECT' && 'bg-amber-100 text-amber-800'
                      )}
                    >
                      {r.category}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {formatRsFull(r.totalPurchases)}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {formatRsFull(r.balanceDue)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-100 px-5 py-4">
        <button
          type="button"
          className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Load more customers
        </button>
      </div>
    </div>
  )
}
