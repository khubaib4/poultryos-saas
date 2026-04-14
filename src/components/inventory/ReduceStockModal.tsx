'use client'

import { useState, useTransition, useEffect } from 'react'
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
import { reduceStockAction } from '@/lib/actions/inventory'
import { REDUCE_STOCK_REASONS } from '@/lib/inventory-constants'
import { useOfflineOptional } from '@/components/providers/OfflineProvider'
import { createOfflineInventoryOp } from '@/lib/offline/offlineCrud'
import { OP } from '@/lib/offline/ops'
import { toast } from 'sonner'

interface ReduceStockModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemId: string
  farmId: string
  itemName: string
  currentStock: number
}

export function ReduceStockModal({
  open,
  onOpenChange,
  itemId,
  farmId,
  itemName,
  currentStock,
}: ReduceStockModalProps) {
  const router = useRouter()
  const offline = useOfflineOptional()
  const isOnline = offline?.isOnline ?? true
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState<string>(REDUCE_STOCK_REASONS[0])
  const [isPending, startTransition] = useTransition()

  const max = Math.max(0, Number(currentStock))

  useEffect(() => {
    if (open) {
      setQuantity('')
      setReason(REDUCE_STOCK_REASONS[0])
    }
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = parseFloat(quantity)
    if (Number.isNaN(q) || q <= 0) {
      toast.error('Enter a quantity greater than zero.')
      return
    }
    if (q > max) {
      toast.error(`Quantity cannot exceed current stock (${max}).`)
      return
    }

    startTransition(async () => {
      if (!isOnline) {
        await createOfflineInventoryOp(OP.INVENTORY_REDUCE, {
          itemId,
          farmId,
          quantity: q,
          reason,
        })
        toast.success('Saved offline. Will sync when connected.')
        await offline?.refreshPending()
        onOpenChange(false)
        router.refresh()
        return
      }
      const result = await reduceStockAction(itemId, farmId, q, reason)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Stock reduced.')
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 rounded-2xl border-gray-200 p-0 sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-6">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-lg font-semibold">Reduce stock</DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                {itemName} — current: {max}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-5">
              <div className="space-y-2">
                <Label htmlFor="reduce-qty">Quantity to reduce (max {max})</Label>
                <Input
                  id="reduce-qty"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={max > 0 ? max : undefined}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={max <= 0}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Reason (required)</Label>
                <Select
                  value={reason}
                  onValueChange={(v) => setReason(v ?? REDUCE_STOCK_REASONS[0])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REDUCE_STOCK_REASONS.map((r) => (
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
              disabled={isPending || max <= 0}
              variant="secondary"
              className="rounded-xl"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Reduce stock'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
