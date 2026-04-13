'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState, useTransition } from 'react'
import { format, startOfMonth } from 'date-fns'
import { Filter, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Flock } from '@/types/database'

interface DailyEntriesFiltersProps {
  farmId: string
  flocks: Flock[]
  defaultFrom: string
  defaultTo: string
  /** default: admin farm URL */
  variant?: 'admin' | 'farm'
}

export function DailyEntriesFilters({
  farmId,
  flocks,
  defaultFrom,
  defaultTo,
  variant = 'admin',
}: DailyEntriesFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const initialFrom = searchParams.get('from') ?? defaultFrom
  const initialTo = searchParams.get('to') ?? defaultTo
  const initialFlock = searchParams.get('flockId') ?? 'all'

  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [flockId, setFlockId] = useState(initialFlock)

  const listBase =
    variant === 'farm'
      ? `/farm/daily-entry`
      : `/admin/farms/${farmId}/daily-entry`

  const apply = useCallback(() => {
    const p = new URLSearchParams()
    if (variant === 'farm') {
      p.set('farm', farmId)
    }
    p.set('from', from)
    p.set('to', to)
    if (flockId && flockId !== 'all') {
      p.set('flockId', flockId)
    }
    startTransition(() => {
      router.push(`${listBase}?${p.toString()}`)
    })
  }, [farmId, flockId, from, listBase, router, to, variant])

  const reset = useCallback(() => {
    const df = format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const dt = format(new Date(), 'yyyy-MM-dd')
    setFrom(df)
    setTo(dt)
    setFlockId('all')
    startTransition(() => {
      const p = new URLSearchParams()
      if (variant === 'farm') {
        p.set('farm', farmId)
      }
      router.push(
        variant === 'farm'
          ? `${listBase}?${p.toString()}`
          : listBase
      )
    })
  }, [farmId, listBase, router, variant])

  const flockOptions = useMemo(
    () =>
      flocks.map((f) => ({
        id: f.id,
        label: f.batch_number,
      })),
    [flocks]
  )

  return (
    <div className="rounded-xl border bg-white p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-700">
        <Filter className="h-4 w-4 text-primary" />
        Filters
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="filter-from">From</Label>
          <input
            id="filter-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-to">To</Label>
          <input
            id="filter-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Flock</Label>
          <Select
            value={flockId}
            onValueChange={(v) => setFlockId(v ?? 'all')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All flocks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All flocks</SelectItem>
              {flockOptions.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="bg-primary hover:bg-primary-dark"
            onClick={apply}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Apply'
            )}
          </Button>
          <Button type="button" variant="outline" onClick={reset}>
            Reset
          </Button>
        </div>
      </div>
    </div>
  )
}
