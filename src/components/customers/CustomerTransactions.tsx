'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ShoppingCart, Wallet } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { CustomerTransactionRow } from '@/lib/queries/customers'

function statusBadge(status: CustomerTransactionRow['status']) {
  if (status === 'completed' || status === 'confirmed') {
    return 'bg-green-100 text-green-700'
  }
  return 'bg-amber-100 text-amber-700'
}

export function CustomerTransactions({
  rows,
  farmId,
}: {
  rows: CustomerTransactionRow[]
  farmId: string
}) {
  const [tab, setTab] = useState<'all' | 'sales' | 'payments'>('all')

  const filtered = useMemo(() => {
    if (tab === 'sales') return rows.filter((r) => r.kind === 'sale')
    if (tab === 'payments') return rows.filter((r) => r.kind === 'payment')
    return rows
  }, [rows, tab])

  return (
    <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/[0.04]">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-gray-900">Transaction History</h3>
        <Tabs value={tab} onValueChange={(v) => setTab((v as any) ?? 'all')}>
          <TabsList variant="default">
            <TabsTrigger value="all">ALL</TabsTrigger>
            <TabsTrigger value="sales">SALES</TabsTrigger>
            <TabsTrigger value="payments">PAYMENTS</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} />
        </Tabs>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="pb-3 pr-4">Date</th>
              <th className="pb-3 pr-4">Transaction Type</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.slice(0, 6).map((r) => {
              const icon =
                r.kind === 'sale' ? (
                  <ShoppingCart className="h-4 w-4 text-gray-500" aria-hidden />
                ) : (
                  <Wallet className="h-4 w-4 text-gray-500" aria-hidden />
                )
              return (
                <tr key={`${r.kind}-${r.id}`} className="text-gray-700">
                  <td className="py-3 pr-4 whitespace-nowrap">
                    {formatDate(r.date)}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                        {icon}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{r.title}</p>
                        {r.subtitle && (
                          <p className="text-xs text-gray-500">{r.subtitle}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={cn(
                        'rounded-full px-2 py-1 text-[10px] font-semibold tracking-wide',
                        statusBadge(r.status)
                      )}
                    >
                      {r.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                    {formatCurrency(r.amount)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
        <span>
          Showing {Math.min(6, filtered.length)} of {rows.length} transactions
        </span>
        <Link
          href={`/farm/sales?farm=${encodeURIComponent(farmId)}`}
          className="font-semibold text-primary hover:text-primary-dark"
        >
          View all
        </Link>
      </div>
    </div>
  )
}

