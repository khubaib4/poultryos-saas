'use client'

import { ReportTable } from '@/components/reports/ReportTable'
import { formatCurrency } from '@/lib/utils'

interface Row {
  farmId: string
  farmName: string
  revenue: number
  expenses: number
  eggs: number
}

interface FarmComparisonTableProps {
  rows: Row[]
}

export function FarmComparisonTable({ rows }: FarmComparisonTableProps) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold">Farm comparison</h3>
      <ReportTable
        columns={[
          { key: 'farmName', header: 'Farm' },
          {
            key: 'revenue',
            header: 'Revenue',
            numeric: true,
            render: (r) => formatCurrency(Number(r.revenue ?? 0)),
          },
          {
            key: 'expenses',
            header: 'Expenses',
            numeric: true,
            render: (r) => formatCurrency(Number(r.expenses ?? 0)),
          },
          { key: 'eggs', header: 'Eggs', numeric: true },
        ]}
        rows={rows as unknown as Record<string, unknown>[]}
        getRowKey={(r) => String(r.farmId)}
      />
    </div>
  )
}
