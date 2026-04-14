import Link from 'next/link'
import { FileBarChart, Download } from 'lucide-react'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import type { RecentReportRow } from '@/lib/queries/reports-analytics'
import { cn } from '@/lib/utils'

interface RecentReportsTableProps {
  rows: RecentReportRow[]
  farmId: string
}

export function RecentReportsTable({ rows, farmId }: RecentReportsTableProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent detailed reports</h3>
        <Link
          href={withFarmQuery('/farm/reports', farmId)}
          className="text-sm font-medium text-primary hover:underline"
        >
          View all reports
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
              <th className="px-5 py-3 font-semibold">Report name</th>
              <th className="px-5 py-3 font-semibold">Category</th>
              <th className="px-5 py-3 font-semibold">Date generated</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/80">
                <td className="px-5 py-3">
                  <span className="flex items-center gap-2 font-medium text-gray-900">
                    <FileBarChart className="h-4 w-4 text-gray-400" />
                    {r.name}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-600">{r.category}</td>
                <td className="px-5 py-3 text-gray-600">{r.generatedAt}</td>
                <td className="px-5 py-3">
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-bold uppercase',
                      r.status === 'ready'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    )}
                  >
                    {r.status === 'ready' ? 'Ready' : 'Processing'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <button
                    type="button"
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                    aria-label="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
