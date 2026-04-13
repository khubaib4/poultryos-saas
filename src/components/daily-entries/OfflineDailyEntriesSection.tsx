'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PendingBadge } from '@/components/offline/PendingBadge'
import { getOfflineDailyEntriesForFarm } from '@/lib/offline/offlineCrud'
import type { OfflineDailyEntryRow } from '@/lib/offline/db'
import { DailyEntryEggCell, formatDailyEntryDate } from '@/components/daily-entries/daily-entry-list-parts'
import type { DailyEntryWithFlock } from '@/lib/queries/daily-entries'
import { withFarmQuery } from '@/lib/farm-worker-nav'

interface OfflineDailyEntriesSectionProps {
  farmId: string
  from: string
  to: string
}

/** Renders locally queued daily entries that are not on the server yet. */
export function OfflineDailyEntriesSection({ farmId, from, to }: OfflineDailyEntriesSectionProps) {
  const [rows, setRows] = useState<OfflineDailyEntryRow[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const list = await getOfflineDailyEntriesForFarm(farmId, from, to)
      if (!cancelled) setRows(list)
    })()
    return () => {
      cancelled = true
    }
  }, [farmId, from, to])

  if (rows.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-amber-900">Saved on this device (pending sync)</h3>
      <div className="rounded-xl border border-amber-200 bg-amber-50/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Flock</TableHead>
              <TableHead>Eggs</TableHead>
              <TableHead>Deaths</TableHead>
              <TableHead>Feed (kg)</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const batch = row.flocks?.batch_number ?? '—'
              const deaths = row.deaths ?? 0
              const feed = row.feed_consumed
              const pseudo = {
                id: row.id,
                flock_id: row.flockId,
                date: row.date,
                eggs_collected: row.eggs_collected,
                eggs_grade_a: row.eggs_grade_a,
                eggs_grade_b: row.eggs_grade_b,
                eggs_cracked: row.eggs_cracked,
                deaths: row.deaths,
                death_cause: row.death_cause,
                feed_consumed: row.feed_consumed,
                notes: row.notes,
                created_at: row.created_at,
                flocks: {
                  id: row.flockId,
                  batch_number: batch,
                  farm_id: farmId,
                },
              } satisfies DailyEntryWithFlock
              return (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {formatDailyEntryDate(row.date)}
                  </TableCell>
                  <TableCell>{batch}</TableCell>
                  <TableCell className="max-w-[200px]">
                    <DailyEntryEggCell row={pseudo} />
                  </TableCell>
                  <TableCell>
                    <span className={deaths > 0 ? 'font-medium text-red-600' : 'text-gray-600'}>
                      {deaths}
                    </span>
                  </TableCell>
                  <TableCell>
                    {feed != null
                      ? Number(feed).toLocaleString(undefined, { maximumFractionDigits: 2 })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <PendingBadge />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Open{' '}
        <Link href={withFarmQuery('/farm/settings', farmId)} className="text-primary-dark underline">
          Offline settings
        </Link>{' '}
        to sync or clear the queue.
      </p>
    </div>
  )
}
