'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Printer } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { RecordPaymentModal } from '@/components/sales/RecordPaymentModal'
import { DeleteSaleButton } from '@/components/sales/DeleteSaleButton'
import { cn } from '@/lib/utils'

interface SaleDetailActionsProps {
  saleId: string
  farmId: string
  invoiceNumber: string
  balanceDue: number
  saleDate: string
}

export function SaleDetailActions({
  saleId,
  farmId,
  invoiceNumber,
  balanceDue,
  saleDate,
}: SaleDetailActionsProps) {
  const [payOpen, setPayOpen] = useState(false)

  return (
    <>
      <div className="flex flex-wrap gap-2 justify-end">
        <Link
          href={`/farm/sales?farm=${encodeURIComponent(farmId)}`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          All sales
        </Link>
        <button
          type="button"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          onClick={() => window.print()}
        >
          <Printer className="mr-2 h-4 w-4" />
          Print invoice
        </button>
        {balanceDue > 0 && (
          <button
            type="button"
            className={cn(
              buttonVariants({ size: 'sm' }),
              'bg-primary text-white hover:bg-primary-dark'
            )}
            onClick={() => setPayOpen(true)}
          >
            Record payment
          </button>
        )}
        <Link
          href={`/farm/sales/${saleId}/edit?farm=${encodeURIComponent(farmId)}`}
          className={cn(
            buttonVariants({ size: 'sm' }),
            'bg-primary text-white hover:bg-primary-dark'
          )}
        >
          Edit
        </Link>
        <DeleteSaleButton
          saleId={saleId}
          farmId={farmId}
          invoiceNumber={invoiceNumber}
        />
      </div>
      <RecordPaymentModal
        open={payOpen}
        onOpenChange={setPayOpen}
        saleId={saleId}
        farmId={farmId}
        balanceDue={balanceDue}
        defaultDate={saleDate.slice(0, 10)}
      />
    </>
  )
}
