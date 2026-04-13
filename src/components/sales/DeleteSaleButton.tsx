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
import { deleteSaleAction } from '@/lib/actions/sales'
import { toast } from 'sonner'

interface DeleteSaleButtonProps {
  saleId: string
  farmId: string
  invoiceNumber: string
}

export function DeleteSaleButton({
  saleId,
  farmId,
  invoiceNumber,
}: DeleteSaleButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSaleAction(saleId, farmId)
      if ('error' in result) {
        toast.error(result.error)
        setOpen(false)
        return
      }
      toast.success('Sale deleted.')
      setOpen(false)
      router.push(`/farm/sales?farm=${encodeURIComponent(farmId)}`)
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="border-red-200 text-red-700 hover:bg-red-50"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete invoice {invoiceNumber}?</DialogTitle>
            <DialogDescription>
              This removes the sale and all payment records linked to it. This cannot
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
                'Delete sale'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
