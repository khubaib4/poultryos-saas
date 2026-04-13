'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Eye,
  MoreVertical,
  Pencil,
  Plus,
  Minus,
  Trash2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AddStockModal } from '@/components/inventory/AddStockModal'
import { ReduceStockModal } from '@/components/inventory/ReduceStockModal'
import { DeleteInventoryButton } from '@/components/inventory/DeleteInventoryButton'
import { withFarmQuery } from '@/lib/farm-worker-nav'

interface InventoryRowActionsProps {
  itemId: string
  farmId: string
  itemName: string
  currentStock: number
}

export function InventoryRowActions({
  itemId,
  farmId,
  itemName,
  currentStock,
}: InventoryRowActionsProps) {
  const router = useRouter()
  const q = `?farm=${encodeURIComponent(farmId)}`
  const [addOpen, setAddOpen] = useState(false)
  const [reduceOpen, setReduceOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded hover:bg-gray-100 outline-none">
          <MoreVertical className="h-4 w-4 text-gray-500" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            className="gap-2 cursor-pointer"
            onClick={() => router.push(`/farm/inventory/${itemId}${q}`)}
          >
            <Eye className="h-4 w-4" />
            View
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 cursor-pointer"
            onClick={() =>
              router.push(withFarmQuery(`/farm/inventory/${itemId}/edit`, farmId))
            }
          >
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 cursor-pointer"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add stock
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 cursor-pointer"
            onClick={() => setReduceOpen(true)}
            disabled={currentStock <= 0}
          >
            <Minus className="h-4 w-4" />
            Reduce stock
          </DropdownMenuItem>
          <DeleteInventoryButton
            itemId={itemId}
            farmId={farmId}
            itemName={itemName}
            variant="menu"
          />
        </DropdownMenuContent>
      </DropdownMenu>

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
    </>
  )
}
