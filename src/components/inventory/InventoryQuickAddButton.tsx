'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AddStockModal } from '@/components/inventory/AddStockModal'
import { cn } from '@/lib/utils'

interface InventoryQuickAddButtonProps {
  itemId: string
  farmId: string
  itemName: string
  className?: string
}

export function InventoryQuickAddButton({
  itemId,
  farmId,
  itemName,
  className,
}: InventoryQuickAddButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm transition-colors hover:bg-primary-dark',
          className
        )}
        aria-label={`Add stock to ${itemName}`}
      >
        <Plus className="h-4 w-4" />
      </button>
      <AddStockModal
        open={open}
        onOpenChange={setOpen}
        itemId={itemId}
        farmId={farmId}
        itemName={itemName}
      />
    </>
  )
}
