'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { addStockAction } from '@/lib/actions/inventory'
import { ADD_STOCK_REASONS } from '@/lib/inventory-constants'
import { useOfflineOptional } from '@/components/providers/OfflineProvider'
import { createOfflineInventoryOp } from '@/lib/offline/offlineCrud'
import { OP } from '@/lib/offline/ops'
import { toast } from 'sonner'

interface AddStockModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemId: string
  farmId: string
  itemName: string
}

export function AddStockModal({
  open,
  onOpenChange,
  itemId,
  farmId,
  itemName,
}: AddStockModalProps) {
  const router = useRouter()
  const offline = useOfflineOptional()
  const isOnline = offline?.isOnline ?? true
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState<string>(ADD_STOCK_REASONS[0])
  const [isPending, startTransition] = useTransition()

  function reset() {
    setQuantity('')
    setReason(ADD_STOCK_REASONS[0])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = parseFloat(quantity)
    if (Number.isNaN(q) || q <= 0) {
      toast.error('Enter a quantity greater than zero.')
      return
    }

    startTransition(async () => {
      if (!isOnline) {
        await createOfflineInventoryOp(OP.INVENTORY_ADD, {
          itemId,
          farmId,
          quantity: q,
          reason,
        })
        toast.success('Saved offline. Will sync when connected.')
        await offline?.refreshPending()
        reset()
        onOpenChange(false)
        router.refresh()
        return
      }
      const result = await addStockAction(itemId, farmId, q, reason)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Stock added.')
      reset()
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent className="gap-0 rounded-2xl border-gray-200 p-0 sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-6">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-lg font-semibold">Add stock</DialogTitle>
              <DialogDescription className="text-sm text-gray-500">{itemName}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-5">
            <div className="space-y-2">
              <Label htmlFor="add-qty">Quantity to add</Label>
              <Input
                id="add-qty"
                type="number"
                step="0.01"
                min="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Select
                value={reason}
                onValueChange={(v) => setReason(v ?? ADD_STOCK_REASONS[0])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADD_STOCK_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            </div>
          </div>
          <DialogFooter className="gap-2 border-t border-gray-100 bg-gray-50/80 px-6 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-primary hover:bg-primary-dark"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Add stock'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
