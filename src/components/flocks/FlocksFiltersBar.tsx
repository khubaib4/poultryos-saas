'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FlockSortKey, FlockStatusFilter } from '@/lib/queries/flocks'
import { cn } from '@/lib/utils'

interface FlocksFiltersBarProps {
  farmId: string
  initialQuery?: string
  initialStatus?: FlockStatusFilter
  initialSort?: FlockSortKey
}

const STATUS: { key: FlockStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'sold', label: 'Sold' },
  { key: 'archived', label: 'Archived' },
]

const SORT: { key: FlockSortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'most-birds', label: 'Most Birds' },
  { key: 'best-production', label: 'Best Production' },
]

export function FlocksFiltersBar({
  farmId,
  initialQuery = '',
  initialStatus = 'all',
  initialSort = 'newest',
}: FlocksFiltersBarProps) {
  const router = useRouter()
  const sp = useSearchParams()
  const [pending, startTransition] = useTransition()

  const [q, setQ] = useState(initialQuery)

  const status = (sp.get('status') as FlockStatusFilter) || initialStatus
  const sort = (sp.get('sort') as FlockSortKey) || initialSort

  const hrefBase = useMemo(() => '/farm/flocks', [])

  function push(next: { q?: string; status?: FlockStatusFilter; sort?: FlockSortKey }) {
    const p = new URLSearchParams(sp.toString())
    p.set('farm', farmId)

    const nq = next.q ?? p.get('q') ?? ''
    const ns = next.status ?? (p.get('status') as FlockStatusFilter) ?? initialStatus
    const so = next.sort ?? (p.get('sort') as FlockSortKey) ?? initialSort

    if (nq) p.set('q', nq)
    else p.delete('q')

    if (ns && ns !== 'all') p.set('status', ns)
    else p.delete('status')

    if (so && so !== 'newest') p.set('sort', so)
    else p.delete('sort')

    startTransition(() => {
      router.push(`${hrefBase}?${p.toString()}`)
    })
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                push({ q })
              }
            }}
            placeholder="Search by batch number..."
            className="pl-9"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS.map((s) => {
              const active = status === s.key || (s.key === 'all' && !status)
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => push({ status: s.key })}
                  className={cn(
                    'h-9 rounded-full px-4 text-sm font-semibold transition-colors',
                    active
                      ? 'bg-primary-lighter text-primary-dark'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {s.label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={sort}
              onValueChange={(v) => push({ sort: (v as FlockSortKey) ?? 'newest' })}
              items={SORT.reduce<Record<string, string>>((acc, s) => {
                acc[s.key] = s.label
                return acc
              }, {})}
            >
              <SelectTrigger className="h-9 w-[180px] rounded-xl">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {SORT.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl"
              disabled={pending}
              onClick={() => push({ q })}
            >
              Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

