'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export interface ReportColumn<T> {
  key: keyof T | string
  header: string
  className?: string
  render?: (row: T) => React.ReactNode
  numeric?: boolean
}

interface ReportTableProps<T extends Record<string, unknown>> {
  columns: ReportColumn<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  footer?: ReactNode
}

export function ReportTable<T extends Record<string, unknown>>({
  columns,
  rows,
  getRowKey,
  footer,
}: ReportTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const sorted = useMemo(() => {
    if (!sortKey) return rows
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = a[sortKey as keyof T]
      const bv = b[sortKey as keyof T]
      const an = typeof av === 'number' ? av : Number(av)
      const bn = typeof bv === 'number' ? bv : Number(bv)
      if (!Number.isNaN(an) && !Number.isNaN(bn)) {
        return sortDir === 'asc' ? an - bn : bn - an
      }
      const as = String(av ?? '')
      const bs = String(bv ?? '')
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as)
    })
    return copy
  }, [rows, sortKey, sortDir])

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="rounded-xl border bg-white overflow-x-auto print:border-gray-300">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead
                key={String(c.key)}
                className={cn(c.numeric && 'text-right', c.className)}
              >
                <button
                  type="button"
                  className="font-medium hover:text-primary-dark"
                  onClick={() => toggleSort(String(c.key))}
                >
                  {c.header}
                </button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => (
            <TableRow key={getRowKey(row)}>
              {columns.map((c) => (
                <TableCell
                  key={String(c.key)}
                  className={cn(c.numeric && 'text-right tabular-nums', c.className)}
                >
                  {c.render
                    ? c.render(row)
                    : String(row[c.key as keyof T] ?? '—')}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {footer}
        </TableBody>
      </Table>
    </div>
  )
}
