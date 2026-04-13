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
import { markCompletedAction } from '@/lib/actions/vaccinations'
import { isoDateToday } from '@/lib/vaccination-constants'
import type { InventoryItem } from '@/types/database'
import { toast } from 'sonner'

interface MarkCompleteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vaccinationId: string
  farmId: string
  vaccineLabel: string
  /** Vaccine-type inventory rows for optional stock deduction */
  vaccineInventory: InventoryItem[]
}

export function MarkCompleteModal({
  open,
  onOpenChange,
  vaccinationId,
  farmId,
  vaccineLabel,
  vaccineInventory,
}: MarkCompleteModalProps) {
  const router = useRouter()
  const [completedDate, setCompletedDate] = useState(isoDateToday())
  const [administeredBy, setAdministeredBy] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [inventoryId, setInventoryId] = useState<string>('')
  const [quantityUsed, setQuantityUsed] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setCompletedDate(isoDateToday())
      setAdministeredBy('')
      setBatchNumber('')
      setNotes('')
      setInventoryId('')
      setQuantityUsed('')
    }
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const qty =
      quantityUsed.trim() === '' ? null : parseFloat(quantityUsed)
    if (inventoryId && (qty == null || Number.isNaN(qty) || qty <= 0)) {
      toast.error('Enter quantity used when selecting inventory.')
      return
    }

    startTransition(async () => {
      const result = await markCompletedAction(vaccinationId, farmId, {
        completed_date: completedDate,
        administered_by: administeredBy.trim() || null,
        batch_number: batchNumber.trim() || null,
        notes: notes.trim() || null,
        inventory_id: inventoryId || null,
        quantity_used: qty != null && !Number.isNaN(qty) ? qty : null,
      })
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Marked completed.')
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Mark complete</DialogTitle>
            <DialogDescription>{vaccineLabel}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mc-date">Completed date</Label>
              <Input
                id="mc-date"
                type="date"
                value={completedDate}
                onChange={(e) => setCompletedDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc-by">Administered by (optional)</Label>
              <Input
                id="mc-by"
                value={administeredBy}
                onChange={(e) => setAdministeredBy(e.target.value)}
                placeholder="Name or role"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc-batch">Batch number (optional)</Label>
              <Input
                id="mc-batch"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mc-notes">Notes</Label>
              <textarea
                id="mc-notes"
                rows={2}
                className="flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            {vaccineInventory.length > 0 && (
              <>
                <div className="space-y-2">
                  <Label>Vaccine from inventory (optional)</Label>
                  <Select
                    value={inventoryId || '__none__'}
                    onValueChange={(v) =>
                      setInventoryId(v === '__none__' ? '' : (v ?? ''))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No deduction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No stock deduction</SelectItem>
                      {vaccineInventory.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.name} ({inv.current_stock} {inv.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {inventoryId && (
                  <div className="space-y-2">
                    <Label htmlFor="mc-qty">Quantity used</Label>
                    <Input
                      id="mc-qty"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={quantityUsed}
                      onChange={(e) => setQuantityUsed(e.target.value)}
                      required
                    />
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary hover:bg-primary-dark"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
