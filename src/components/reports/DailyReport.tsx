'use client'

import { Egg, Skull, Wheat, ShoppingCart, Receipt } from 'lucide-react'
import type { DailyReportData } from '@/lib/queries/reports'
import { ReportSummaryCard } from '@/components/reports/ReportSummaryCard'
import { ReportTable, type ReportColumn } from '@/components/reports/ReportTable'
import { ExportButtons } from '@/components/reports/ExportButtons'
import { downloadReportPdf } from '@/lib/export/pdf'
import { downloadReportExcel } from '@/lib/export/excel'
import { formatCurrency, formatDate } from '@/lib/utils'

interface DailyReportProps {
  data: DailyReportData
  brandName: string
}

export function DailyReport({ data, brandName }: DailyReportProps) {
  const entryRows = data.entries.map((e) => ({
    id: e.id,
    flock: e.flockBatch,
    eggs: e.eggs.totalCollected,
    gradeA: e.eggs.gradeA,
    gradeB: e.eggs.gradeB,
    cracked: e.eggs.cracked,
    deaths: e.deaths,
    feed: e.feed,
  })) as unknown as Record<string, unknown>[]

  const entryCols: ReportColumn<Record<string, unknown>>[] = [
    { key: 'flock', header: 'Flock' },
    { key: 'eggs', header: 'Eggs', numeric: true },
    { key: 'gradeA', header: 'Grade A', numeric: true },
    { key: 'gradeB', header: 'Grade B', numeric: true },
    { key: 'cracked', header: 'Cracked', numeric: true },
    { key: 'deaths', header: 'Deaths', numeric: true },
    { key: 'feed', header: 'Feed (kg)', numeric: true },
  ]

  function exportPdf() {
    downloadReportPdf({
      brandName,
      title: 'Daily report',
      subtitle: formatDate(data.date),
      filename: `daily-report-${data.date}.pdf`,
      sections: [
        {
          title: 'Summary',
          head: [['Metric', 'Value']],
          body: [
            ['Grade A eggs', data.eggs.gradeA],
            ['Grade B eggs', data.eggs.gradeB],
            ['Cracked', data.eggs.cracked],
            ['Total collected', data.eggs.totalCollected],
            ['Deaths', data.totalDeaths],
            ['Feed (kg)', data.totalFeed],
            ['Sales total', formatCurrency(data.salesTotal)],
            ['Expenses total', formatCurrency(data.expensesTotal)],
          ],
        },
        {
          title: 'Daily entries',
          head: [entryCols.map((c) => c.header)],
          body: entryRows.map((r) =>
            entryCols.map((c) => r[String(c.key)] as string | number)
          ),
        },
      ],
    })
  }

  function exportExcel() {
    downloadReportExcel({
      filename: `daily-report-${data.date}.xlsx`,
      sheets: [
        {
          name: 'Summary',
          rows: [
            ['Metric', 'Value'],
            ['Grade A', data.eggs.gradeA],
            ['Grade B', data.eggs.gradeB],
            ['Cracked', data.eggs.cracked],
            ['Total eggs', data.eggs.totalCollected],
            ['Deaths', data.totalDeaths],
            ['Feed', data.totalFeed],
            ['Sales', data.salesTotal],
            ['Expenses', data.expensesTotal],
          ],
        },
        {
          name: 'Entries',
          rows: [
            entryCols.map((c) => c.header),
            ...entryRows.map((r) => entryCols.map((c) => r[String(c.key)] as string | number)),
          ],
        },
      ],
    })
  }

  return (
    <div className="report-print space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Daily report · {formatDate(data.date)}
        </h2>
        <ExportButtons onPdf={exportPdf} onExcel={exportExcel} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <ReportSummaryCard
          title="Eggs (total)"
          value={data.eggs.totalCollected}
          icon={Egg}
        />
        <ReportSummaryCard title="Deaths" value={data.totalDeaths} icon={Skull} />
        <ReportSummaryCard
          title="Feed (kg)"
          value={Math.round(data.totalFeed * 100) / 100}
          icon={Wheat}
        />
        <ReportSummaryCard
          title="Sales"
          value={formatCurrency(data.salesTotal)}
          description={`${data.salesCount} invoices`}
          icon={ShoppingCart}
        />
        <ReportSummaryCard
          title="Expenses"
          value={formatCurrency(data.expensesTotal)}
          description={`${data.expensesCount} entries`}
          icon={Receipt}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-800">Eggs by grade</h3>
        <div className="grid gap-2 sm:grid-cols-3 rounded-lg border bg-white p-4 text-sm">
          <div>
            <span className="text-gray-500">Grade A</span>
            <p className="text-xl font-semibold">{data.eggs.gradeA}</p>
          </div>
          <div>
            <span className="text-gray-500">Grade B</span>
            <p className="text-xl font-semibold">{data.eggs.gradeB}</p>
          </div>
          <div>
            <span className="text-gray-500">Cracked</span>
            <p className="text-xl font-semibold">{data.eggs.cracked}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-800">Daily entries</h3>
        <ReportTable
          columns={entryCols}
          rows={entryRows}
          getRowKey={(r) => String(r.id)}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-800">Sales</h3>
        <ReportTable
          columns={[
            { key: 'invoice_number', header: 'Invoice' },
            { key: 'sale_date', header: 'Date' },
            {
              key: 'total_amount',
              header: 'Amount',
              numeric: true,
              render: (r) => formatCurrency(Number(r.total_amount ?? 0)),
            },
          ]}
          rows={data.sales as unknown as Record<string, unknown>[]}
          getRowKey={(r) => String(r.id)}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-800">Expenses</h3>
        <ReportTable
          columns={[
            { key: 'expense_date', header: 'Date' },
            { key: 'category', header: 'Category' },
            { key: 'description', header: 'Description' },
            {
              key: 'amount',
              header: 'Amount',
              numeric: true,
              render: (r) => formatCurrency(Number(r.amount ?? 0)),
            },
          ]}
          rows={data.expenses as unknown as Record<string, unknown>[]}
          getRowKey={(r) => String(r.id)}
        />
      </div>
    </div>
  )
}
