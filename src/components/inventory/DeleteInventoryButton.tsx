'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { deleteInventoryItemAction } from '@/lib/actions/inventory'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { toast } from 'sonner'

interface DeleteInventoryButtonProps {
  itemId: string
  farmId: string
  itemName: string
  /** Use inside a row dropdown (smaller trigger). */
  variant?: 'button' | 'menu'
}

export function DeleteInventoryButton({
  itemId,
  farmId,
  itemName,
  variant = 'button',
}: DeleteInventoryButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteInventoryItemAction(itemId, farmId)
      if ('error' in result) {
        toast.error(result.error)
        setOpen(false)
        return
      }
      toast.success('Item removed.')
      setOpen(false)
      router.push(withFarmQuery('/farm/inventory', farmId))
    })
  }

  const trigger =
    variant === 'menu' ? (
      <DropdownMenuItem
        className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
        onSelect={(e) => {
          e.preventDefault()
          setOpen(true)
        }}
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </DropdownMenuItem>
    ) : (
      <Button
        type="button"
        variant="outline"
        className="border-red-200 text-red-700 hover:bg-red-50"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>
    )

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{itemName}&rdquo;?</DialogTitle>
            <DialogDescription>
              This removes the inventory item and its transaction history. This cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete item'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
