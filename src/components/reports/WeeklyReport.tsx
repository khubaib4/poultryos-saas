'use client'

import { TrendingUp, DollarSign, PieChart as PieIcon } from 'lucide-react'
import type { WeeklyReportData } from '@/lib/queries/reports'
import { ReportSummaryCard } from '@/components/reports/ReportSummaryCard'
import { ReportTable } from '@/components/reports/ReportTable'
import { ExportButtons } from '@/components/reports/ExportButtons'
import { ReportsLineChart } from '@/components/charts/ReportsLineChart'
import { ReportsBarChart } from '@/components/charts/ReportsBarChart'
import { downloadReportPdf } from '@/lib/export/pdf'
import { downloadReportExcel } from '@/lib/export/excel'
import { formatCurrency, formatDate } from '@/lib/utils'

interface WeeklyReportProps {
  data: WeeklyReportData
  brandName: string
}

export function WeeklyReport({ data, brandName }: WeeklyReportProps) {
  const lineData = data.daily.map((d) => ({
    name: d.date.slice(5),
    eggs: d.eggs,
  }))
  const revExp = data.daily.map((d) => ({
    name: d.date.slice(5),
    revenue: 0,
    expenses: 0,
  }))
  const dayIndex = new Map(data.daily.map((d, i) => [d.date, i]))
  for (const s of data.sales) {
    const d = (s.sale_date as string)?.slice(0, 10)
    const i = dayIndex.get(d)
    if (i !== undefined) {
      revExp[i].revenue += Number(s.total_amount ?? 0)
    }
  }
  for (const e of data.expenses) {
    const d = e.expense_date?.slice(0, 10)
    const i = dayIndex.get(d)
    if (i !== undefined) {
      revExp[i].expenses += Number(e.amount ?? 0)
    }
  }

  function exportPdf() {
    downloadReportPdf({
      brandName,
      title: 'Weekly report',
      subtitle: `${formatDate(data.range.start)} — ${formatDate(data.range.end)}`,
      filename: `weekly-${data.range.start}.pdf`,
      sections: [
        {
          title: 'Summary',
          head: [['Metric', 'Value']],
          body: [
            ['Total eggs', data.totalEggs],
            ['Deaths', data.totalDeaths],
            ['Feed (kg)', data.totalFeed],
            ['Revenue', formatCurrency(data.totalRevenue)],
            ['Expenses', formatCurrency(data.totalExpenses)],
            ['Net', formatCurrency(data.netProfit)],
          ],
        },
        {
          title: 'Expenses by category',
          head: [['Category', 'Amount']],
          body: data.expensesByCategory.map((x) => [x.category, formatCurrency(x.total)]),
        },
      ],
    })
  }

  function exportExcel() {
    downloadReportExcel({
      filename: `weekly-${data.range.start}.xlsx`,
      sheets: [
        {
          name: 'Summary',
          rows: [
            ['Metric', 'Value'],
            ['Eggs', data.totalEggs],
            ['Deaths', data.totalDeaths],
            ['Feed', data.totalFeed],
            ['Revenue', data.totalRevenue],
            ['Expenses', data.totalExpenses],
            ['Net profit', data.netProfit],
          ],
        },
        {
          name: 'Daily',
          rows: [
            ['Date', 'Eggs', 'Deaths', 'Feed'],
            ...data.daily.map((d) => [d.date, d.eggs, d.deaths, d.feed]),
          ],
        },
        {
          name: 'Expenses by category',
          rows: [
            ['Category', 'Total'],
            ...data.expensesByCategory.map((x) => [x.category, x.total]),
          ],
        },
      ],
    })
  }

  return (
    <div className="report-print space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Weekly report · {formatDate(data.range.start)} — {formatDate(data.range.end)}
        </h2>
        <ExportButtons onPdf={exportPdf} onExcel={exportExcel} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportSummaryCard title="Eggs" value={data.totalEggs} icon={TrendingUp} />
        <ReportSummaryCard title="Revenue" value={formatCurrency(data.totalRevenue)} icon={DollarSign} />
        <ReportSummaryCard title="Expenses" value={formatCurrency(data.totalExpenses)} icon={PieIcon} />
        <ReportSummaryCard title="Net profit / loss" value={formatCurrency(data.netProfit)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold">Daily eggs</h3>
          <ReportsLineChart
            data={lineData}
            lines={[{ key: 'eggs', name: 'Eggs' }]}
            valueFormat="number"
          />
        </div>
        <div className="rounded-xl border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold">Revenue vs expenses (by day)</h3>
          <ReportsBarChart
            data={revExp}
            bars={[
              { key: 'revenue', name: 'Revenue' },
              { key: 'expenses', name: 'Expenses' },
            ]}
            valueFormat="currency"
          />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Daily breakdown</h3>
        <ReportTable
          columns={[
            { key: 'date', header: 'Date' },
            { key: 'eggs', header: 'Eggs', numeric: true },
            { key: 'deaths', header: 'Deaths', numeric: true },
            { key: 'feed', header: 'Feed', numeric: true },
          ]}
          rows={data.daily as unknown as Record<string, unknown>[]}
          getRowKey={(r) => String(r.date)}
        />
      </div>
    </div>
  )
}
