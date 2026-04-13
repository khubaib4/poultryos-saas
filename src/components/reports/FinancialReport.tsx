'use client'

import type { FinancialPLData, FinancialSummaryData } from '@/lib/queries/reports'
import { ReportSummaryCard } from '@/components/reports/ReportSummaryCard'
import { ReportTable } from '@/components/reports/ReportTable'
import { ExportButtons } from '@/components/reports/ExportButtons'
import { downloadReportPdf } from '@/lib/export/pdf'
import { downloadReportExcel } from '@/lib/export/excel'
import { formatCurrency, formatDate } from '@/lib/utils'

interface FinancialReportProps {
  pl: FinancialPLData
  summary: FinancialSummaryData
  brandName: string
}

export function FinancialReport({ pl, summary, brandName }: FinancialReportProps) {
  function exportPdf() {
    downloadReportPdf({
      brandName,
      title: 'Financial report',
      subtitle: `${formatDate(pl.range.start)} — ${formatDate(pl.range.end)}`,
      filename: `financial-${pl.range.start}.pdf`,
      sections: [
        {
          title: 'P&L',
          head: [['Line', 'Amount']],
          body: [
            ['Revenue', formatCurrency(pl.revenueTotal)],
            ['COGS (Feed + Packaging)', formatCurrency(pl.cogsTotal)],
            ['Gross profit', formatCurrency(pl.grossProfit)],
            ['Operating expenses', formatCurrency(pl.operatingExpensesTotal)],
            ['Net profit', formatCurrency(pl.netProfit)],
          ],
        },
        {
          title: 'Receivables aging',
          head: [['Bucket', 'Amount']],
          body: [
            ['Current', formatCurrency(pl.receivablesAging.current)],
            ['1–30 days', formatCurrency(pl.receivablesAging.days30)],
            ['31–60 days', formatCurrency(pl.receivablesAging.days60)],
            ['90+ days', formatCurrency(pl.receivablesAging.days90Plus)],
          ],
        },
      ],
    })
  }

  function exportExcel() {
    downloadReportExcel({
      filename: `financial-${pl.range.start}.xlsx`,
      sheets: [
        {
          name: 'P_L',
          rows: [
            ['Line', 'Amount'],
            ['Revenue', pl.revenueTotal],
            ['COGS', pl.cogsTotal],
            ['Gross profit', pl.grossProfit],
            ['Operating expenses', pl.operatingExpensesTotal],
            ['Net profit', pl.netProfit],
          ],
        },
        {
          name: 'Operating',
          rows: [
            ['Category', 'Amount'],
            ...pl.operatingByCategory.map((x) => [x.category, x.amount]),
          ],
        },
        {
          name: 'Aging',
          rows: [
            ['Bucket', 'Amount'],
            ['Current', pl.receivablesAging.current],
            ['30d', pl.receivablesAging.days30],
            ['60d', pl.receivablesAging.days60],
            ['90+', pl.receivablesAging.days90Plus],
          ],
        },
      ],
    })
  }

  return (
    <div className="report-print space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Financial · {formatDate(pl.range.start)} — {formatDate(pl.range.end)}
        </h2>
        <ExportButtons onPdf={exportPdf} onExcel={exportExcel} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <ReportSummaryCard title="Revenue" value={formatCurrency(summary.totalRevenue)} />
        <ReportSummaryCard title="Expenses" value={formatCurrency(summary.totalExpenses)} />
        <ReportSummaryCard title="Gross profit" value={formatCurrency(summary.grossProfit)} />
        <ReportSummaryCard
          title="Outstanding"
          value={formatCurrency(summary.outstandingReceivables)}
        />
        <ReportSummaryCard title="Cash collected" value={formatCurrency(summary.cashCollected)} />
      </div>

      <div className="rounded-xl border bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold">Profit & loss</h3>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between border-b py-2">
            <dt>Revenue</dt>
            <dd className="font-medium">{formatCurrency(pl.revenueTotal)}</dd>
          </div>
          <div className="flex justify-between border-b py-2">
            <dt>Cost of goods (feed & packaging)</dt>
            <dd>{formatCurrency(pl.cogsTotal)}</dd>
          </div>
          <div className="flex justify-between border-b py-2 font-semibold text-primary-dark">
            <dt>Gross profit</dt>
            <dd>{formatCurrency(pl.grossProfit)}</dd>
          </div>
          <div className="flex justify-between border-b py-2">
            <dt>Operating expenses</dt>
            <dd>{formatCurrency(pl.operatingExpensesTotal)}</dd>
          </div>
          <div className="flex justify-between py-2 font-semibold">
            <dt>Net profit</dt>
            <dd>{formatCurrency(pl.netProfit)}</dd>
          </div>
        </dl>
        <div className="mt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">
            Revenue by line
          </h4>
          <ReportTable
            columns={[
              { key: 'name', header: 'Category' },
              {
                key: 'amount',
                header: 'Amount',
                numeric: true,
                render: (r) => formatCurrency(Number(r.amount ?? 0)),
              },
            ]}
            rows={pl.revenueByCategory as unknown as Record<string, unknown>[]}
            getRowKey={(r) => String(r.name)}
          />
        </div>
        <div className="mt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">
            Operating expenses
          </h4>
          <ReportTable
            columns={[
              { key: 'category', header: 'Category' },
              {
                key: 'amount',
                header: 'Amount',
                numeric: true,
                render: (r) => formatCurrency(Number(r.amount ?? 0)),
              },
            ]}
            rows={pl.operatingByCategory as unknown as Record<string, unknown>[]}
            getRowKey={(r) => String(r.category)}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold">Cash flow (period)</h3>
        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-gray-500">Collections</dt>
            <dd className="text-lg font-semibold">{formatCurrency(pl.cashCollections)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Expense payments (total)</dt>
            <dd className="text-lg font-semibold">{formatCurrency(pl.cashExpensePayments)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Net cash (simple)</dt>
            <dd className="text-lg font-semibold">{formatCurrency(pl.netCash)}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold">Receivables aging</h3>
        <ReportTable
          columns={[
            { key: 'bucket', header: 'Aging' },
            {
              key: 'amount',
              header: 'Amount',
              numeric: true,
              render: (r) => formatCurrency(Number(r.amount ?? 0)),
            },
          ]}
          rows={[
            { bucket: 'Current', amount: pl.receivablesAging.current },
            { bucket: '1–30 days past due', amount: pl.receivablesAging.days30 },
            { bucket: '31–60 days past due', amount: pl.receivablesAging.days60 },
            { bucket: '61+ days past due', amount: pl.receivablesAging.days90Plus },
          ] as unknown as Record<string, unknown>[]}
          getRowKey={(r) => String(r.bucket)}
        />
      </div>
    </div>
  )
}
