'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CreditCard, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CustomerCategoryBadge } from '@/components/customers/CustomerCategoryBadge'
import { RecordPaymentModal, type OpenSaleOption } from '@/components/customers/RecordPaymentModal'

export function CustomerDetailHeader({
  farmId,
  customerName,
  initials,
  avatarClass,
  category,
  location,
  editHref,
  openSales,
  defaultDate,
}: {
  farmId: string
  customerName: string
  initials: string
  avatarClass: string
  category: string
  location: string
  editHref: string
  openSales: OpenSaleOption[]
  defaultDate: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/[0.04]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-2xl text-white text-base font-bold',
              avatarClass
            )}
            aria-hidden
          >
            {initials || 'CU'}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-2xl font-semibold tracking-tight text-gray-900">
                {customerName}
              </p>
              <CustomerCategoryBadge category={category} />
            </div>
            <p className="mt-1 text-sm text-gray-500">{location}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <Link href={editHref}>
            <Button variant="outline" className="gap-2">
              <Pencil className="h-4 w-4" />
              Edit Profile
            </Button>
          </Link>
          <Button
            type="button"
            variant="primarySimple"
            className="gap-2"
            onClick={() => setOpen(true)}
            disabled={openSales.length === 0}
          >
            <CreditCard className="h-4 w-4" />
            Record Payment
          </Button>
        </div>
      </div>

      <RecordPaymentModal
        open={open}
        onOpenChange={setOpen}
        farmId={farmId}
        openSales={openSales}
        defaultDate={defaultDate}
      />
    </div>
  )
}

