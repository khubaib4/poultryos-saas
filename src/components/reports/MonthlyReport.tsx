'use client'

import type { MonthlyReportData } from '@/lib/queries/reports'
import { ReportSummaryCard } from '@/components/reports/ReportSummaryCard'
import { ReportTable } from '@/components/reports/ReportTable'
import { ExportButtons } from '@/components/reports/ExportButtons'
import { ReportsLineChart } from '@/components/charts/ReportsLineChart'
import { ReportsPieChart } from '@/components/charts/ReportsPieChart'
import { downloadReportPdf } from '@/lib/export/pdf'
import { downloadReportExcel } from '@/lib/export/excel'
import { formatCurrency, formatDate } from '@/lib/utils'

interface MonthlyReportProps {
  data: MonthlyReportData
  brandName: string
}

export function MonthlyReport({ data, brandName }: MonthlyReportProps) {
  const weeklyChart = data.weekSummaries.map((w) => ({
    name: w.label,
    revenue: w.revenue,
    expenses: w.expenses,
  }))
  const pieData = data.expensesByCategory.map((x) => ({
    name: x.category,
    value: x.total,
  }))

  function exportPdf() {
    downloadReportPdf({
      brandName,
      title: 'Monthly report',
      subtitle: `${formatDate(data.range.start)} — ${formatDate(data.range.end)}`,
      filename: `monthly-${data.range.start}.pdf`,
      sections: [
        {
          title: 'Summary',
          head: [['Metric', 'Value']],
          body: [
            ['Revenue', formatCurrency(data.totalRevenue)],
            ['Expenses', formatCurrency(data.totalExpenses)],
            ['Net', formatCurrency(data.netProfit)],
          ],
        },
        {
          title: 'Flock performance',
          head: [['Batch', 'Eggs/bird', 'Mortality %', 'Feed/100 eggs']],
          body: data.flockPerformance.map((f) => [
            f.batchNumber,
            f.eggsPerBird,
            f.mortalityRate,
            f.feedPer100Eggs,
          ]),
        },
      ],
    })
  }

  function exportExcel() {
    downloadReportExcel({
      filename: `monthly-${data.range.start}.xlsx`,
      sheets: [
        {
          name: 'Summary',
          rows: [
            ['Revenue', data.totalRevenue],
            ['Expenses', data.totalExpenses],
            ['Net', data.netProfit],
          ],
        },
        {
          name: 'Flocks',
          rows: [
            ['Batch', 'Breed', 'Eggs/bird', 'Mortality', 'Feed/100 eggs'],
            ...data.flockPerformance.map((f) => [
              f.batchNumber,
              f.breed,
              f.eggsPerBird,
              f.mortalityRate,
              f.feedPer100Eggs,
            ]),
          ],
        },
        {
          name: 'Top customers',
          rows: [
            ['Customer', 'Revenue'],
            ...data.topCustomers.map((c) => [c.name, c.revenue]),
          ],
        },
      ],
    })
  }

  return (
    <div className="report-print space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Monthly report · {formatDate(data.range.start)} — {formatDate(data.range.end)}
        </h2>
        <ExportButtons onPdf={exportPdf} onExcel={exportExcel} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <ReportSummaryCard title="Revenue" value={formatCurrency(data.totalRevenue)} />
        <ReportSummaryCard title="Expenses" value={formatCurrency(data.totalExpenses)} />
        <ReportSummaryCard title="Net profit / loss" value={formatCurrency(data.netProfit)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold">Weekly revenue vs expenses</h3>
          <ReportsLineChart
            data={weeklyChart}
            lines={[
              { key: 'revenue', name: 'Revenue' },
              { key: 'expenses', name: 'Expenses', color: '#94a3b8' },
            ]}
            valueFormat="currency"
          />
        </div>
        <div className="rounded-xl border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold">Expense categories</h3>
          <ReportsPieChart data={pieData} valueFormat="currency" />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Flock performance</h3>
        <ReportTable
          columns={[
            { key: 'batchNumber', header: 'Batch' },
            { key: 'breed', header: 'Breed' },
            { key: 'eggsPerBird', header: 'Eggs / bird', numeric: true },
            { key: 'mortalityRate', header: 'Mortality %', numeric: true },
            { key: 'feedPer100Eggs', header: 'Feed / 100 eggs', numeric: true },
          ]}
          rows={data.flockPerformance as unknown as Record<string, unknown>[]}
          getRowKey={(r) => String(r.flockId)}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Top customers</h3>
        <ReportTable
          columns={[
            { key: 'name', header: 'Customer' },
            {
              key: 'revenue',
              header: 'Revenue',
              numeric: true,
              render: (r) => formatCurrency(Number(r.revenue ?? 0)),
            },
          ]}
          rows={data.topCustomers as unknown as Record<string, unknown>[]}
          getRowKey={(r) => String(r.customerId ?? r.name)}
        />
      </div>
    </div>
  )
}
