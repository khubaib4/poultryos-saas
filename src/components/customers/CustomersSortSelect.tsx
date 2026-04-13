'use client'

import { useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowUpDown } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CustomerSortKey } from '@/lib/queries/customers'

const SORT: { key: CustomerSortKey; label: string }[] = [
  { key: 'recent', label: 'Sort: Recent' },
  { key: 'name', label: 'Sort: Name' },
  { key: 'balance_desc', label: 'Sort: Balance' },
]

export function CustomersSortSelect({
  farmId,
  value,
}: {
  farmId: string
  value: CustomerSortKey
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const [, startTransition] = useTransition()

  function push(next: CustomerSortKey) {
    const p = new URLSearchParams(sp.toString())
    p.set('farm', farmId)
    if (next && next !== 'recent') p.set('sort', next)
    else p.delete('sort')
    startTransition(() => router.push(`/farm/customers?${p.toString()}`))
  }

  return (
    <Select
      value={value}
      onValueChange={(v) => push((v as CustomerSortKey) ?? 'recent')}
      items={SORT.reduce<Record<string, string>>((acc, s) => {
        acc[s.key] = s.label
        return acc
      }, {})}
    >
      <SelectTrigger className="h-9 w-[160px] rounded-xl">
        <ArrowUpDown className="mr-2 h-4 w-4 text-gray-500" />
        <SelectValue placeholder="Sort: Recent" />
      </SelectTrigger>
      <SelectContent>
        {SORT.map((s) => (
          <SelectItem key={s.key} value={s.key}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

