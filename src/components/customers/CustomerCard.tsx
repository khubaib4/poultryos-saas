'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, MoreVertical, Phone, Plus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, formatCurrency } from '@/lib/utils'
import type { CustomerWithStats } from '@/lib/queries/customers'
import { categoryColors, categoryKeyFromDb } from './customer-category-colors'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'CU'
  const first = parts[0]?.[0] ?? 'C'
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (first + last).toUpperCase()
}

function categoryLabel(v?: string | null) {
  const raw = String(v ?? '').trim()
  return raw ? raw.toUpperCase() : 'OTHER'
}

export function CustomerCard({
  customer,
  farmId,
  onDelete,
}: {
  customer: CustomerWithStats
  farmId: string
  onDelete?: (id: string) => void
}) {
  const router = useRouter()
  const key = categoryKeyFromDb(customer.category)
  const colors = categoryColors[key]
  const detailHref = `/farm/customers/${customer.id}?farm=${encodeURIComponent(farmId)}`
  const editHref = `/farm/customers/${customer.id}/edit?farm=${encodeURIComponent(farmId)}`

  const balance = Number(customer.balance_due ?? 0)

  return (
    <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white',
              colors.avatar
            )}
            aria-hidden
          >
            {initials(customer.name)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={detailHref}
                className="truncate text-sm font-semibold text-gray-900 hover:text-primary-dark"
              >
                {customer.name}
              </Link>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide',
                  colors.bg,
                  colors.text
                )}
              >
                {categoryLabel(customer.category)}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {customer.business_name ?? '—'}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 outline-none">
            <MoreVertical className="h-4 w-4 text-gray-500" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push(editHref)}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-red-600 focus:text-red-600"
              onClick={() => onDelete?.(customer.id)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 space-y-2 text-sm text-gray-700">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-gray-400" aria-hidden />
          <span className="truncate">{customer.phone ?? '—'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-400" aria-hidden />
          <span className="truncate">{customer.address ?? '—'}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Total purchases
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {formatCurrency(Number(customer.total_purchases ?? 0))}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Balance due
          </p>
          <p
            className={cn(
              'mt-1 text-sm font-semibold',
              balance > 0 ? 'text-red-600' : 'text-green-700'
            )}
          >
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Link
          href={`/farm/sales/new?farm=${encodeURIComponent(farmId)}&customer=${encodeURIComponent(customer.id)}`}
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'h-9 flex-1 rounded-xl border-primary/30 text-primary-dark hover:bg-primary-lightest'
          )}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Sale
        </Link>
        <Link
          href={detailHref}
          className={cn(
            buttonVariants({ variant: 'ghost' }),
            'h-9 flex-1 rounded-xl text-gray-700'
          )}
        >
          View History
        </Link>
      </div>
    </div>
  )
}

