'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pencil, Plus, Minus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { AddStockModal } from '@/components/inventory/AddStockModal'
import { ReduceStockModal } from '@/components/inventory/ReduceStockModal'
import { DeleteInventoryButton } from '@/components/inventory/DeleteInventoryButton'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn } from '@/lib/utils'

interface InventoryItemDetailActionsProps {
  itemId: string
  farmId: string
  itemName: string
  currentStock: number
}

export function InventoryItemDetailActions({
  itemId,
  farmId,
  itemName,
  currentStock,
}: InventoryItemDetailActionsProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [reduceOpen, setReduceOpen] = useState(false)

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={cn(
          buttonVariants(),
          'bg-primary text-white hover:bg-primary-dark'
        )}
        onClick={() => setAddOpen(true)}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add stock
      </button>
      <button
        type="button"
        className={buttonVariants({ variant: 'secondary' })}
        onClick={() => setReduceOpen(true)}
        disabled={currentStock <= 0}
      >
        <Minus className="mr-2 h-4 w-4" />
        Reduce stock
      </button>
      <Link
        href={withFarmQuery(`/farm/inventory/${itemId}/edit`, farmId)}
        className={cn(buttonVariants({ variant: 'outline' }))}
      >
        <Pencil className="mr-2 h-4 w-4" />
        Edit
      </Link>
      <DeleteInventoryButton itemId={itemId} farmId={farmId} itemName={itemName} />
      <AddStockModal
        open={addOpen}
        onOpenChange={setAddOpen}
        itemId={itemId}
        farmId={farmId}
        itemName={itemName}
      />
      <ReduceStockModal
        open={reduceOpen}
        onOpenChange={setReduceOpen}
        itemId={itemId}
        farmId={farmId}
        itemName={itemName}
        currentStock={currentStock}
      />
    </div>
  )
}
