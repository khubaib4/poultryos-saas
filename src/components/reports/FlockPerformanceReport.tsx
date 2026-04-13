'use client'

import type { FlockPerformanceReportData } from '@/lib/queries/reports'
import { ReportTable } from '@/components/reports/ReportTable'
import { ExportButtons } from '@/components/reports/ExportButtons'
import { ReportsLineChart } from '@/components/charts/ReportsLineChart'
import { ReportsAreaChart } from '@/components/charts/ReportsAreaChart'
import { downloadReportPdf } from '@/lib/export/pdf'
import { downloadReportExcel } from '@/lib/export/excel'
import { formatDate } from '@/lib/utils'

interface FlockPerformanceReportProps {
  data: FlockPerformanceReportData
  brandName: string
  farmNames?: Record<string, string>
}

export function FlockPerformanceReport({
  data,
  brandName,
  farmNames,
}: FlockPerformanceReportProps) {
  function exportPdf() {
    downloadReportPdf({
      brandName,
      title: 'Flock performance',
      subtitle: `${formatDate(data.range.start)} — ${formatDate(data.range.end)}`,
      filename: `flocks-${data.range.start}.pdf`,
      sections: [
        {
          title: 'Flocks',
          head: [['Batch', 'Breed', 'Prod/bird', 'Mortality %', 'Feed/egg']],
          body: data.flocks.map((f) => [
            f.batchNumber,
            f.breed,
            f.productionRate,
            f.mortalityRate,
            f.feedConversion,
          ]),
        },
      ],
    })
  }

  function exportExcel() {
    downloadReportExcel({
      filename: `flocks-${data.range.start}.xlsx`,
      sheets: [
        {
          name: 'Metrics',
          rows: [
            ['Batch', 'Breed', 'Farm', 'Prod/bird', 'Mortality', 'Feed/egg', 'Eggs', 'Deaths'],
            ...data.flocks.map((f) => [
              f.batchNumber,
              f.breed,
              farmNames?.[f.farmId] ?? f.farmId,
              f.productionRate,
              f.mortalityRate,
              f.feedConversion,
              f.totalEggs,
              f.totalDeaths,
            ]),
          ],
        },
      ],
    })
  }

  const firstFlock = data.flocks[0]
  const series = firstFlock
    ? (() => {
        const raw = data.dailyByFlock[firstFlock.flockId] ?? []
        let cum = 0
        return raw.map((d) => {
          cum += d.deaths
          return { name: d.date.slice(5), cumulative: cum }
        })
      })()
    : []

  const prodLine = firstFlock
    ? (data.dailyByFlock[firstFlock.flockId] ?? []).map((d) => ({
        name: d.date.slice(5),
        eggs: d.eggs,
      }))
    : []

  return (
    <div className="report-print space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Flock performance · {formatDate(data.range.start)} — {formatDate(data.range.end)}
        </h2>
        <ExportButtons onPdf={exportPdf} onExcel={exportExcel} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Comparison</h3>
        <ReportTable
          columns={[
            {
              key: 'batchNumber',
              header: 'Batch',
              render: (r) =>
                farmNames?.[r.farmId as string]
                  ? `${String(r.batchNumber)} (${farmNames[r.farmId as string]})`
                  : String(r.batchNumber),
            },
            { key: 'breed', header: 'Breed' },
            { key: 'productionRate', header: 'Eggs / bird', numeric: true },
            { key: 'mortalityRate', header: 'Mortality %', numeric: true },
            { key: 'feedConversion', header: 'Feed / egg (kg)', numeric: true },
            { key: 'totalEggs', header: 'Eggs', numeric: true },
          ]}
          rows={data.flocks as unknown as Record<string, unknown>[]}
          getRowKey={(r) => String(r.flockId)}
        />
      </div>

      {firstFlock && prodLine.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold">
              Daily production — {firstFlock.batchNumber}
            </h3>
            <ReportsLineChart
              data={prodLine}
              lines={[{ key: 'eggs', name: 'Eggs' }]}
            />
          </div>
          <div className="rounded-xl border bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold">
              Cumulative mortality — {firstFlock.batchNumber}
            </h3>
            <ReportsAreaChart data={series} />
          </div>
        </div>
      )}
    </div>
  )
}
