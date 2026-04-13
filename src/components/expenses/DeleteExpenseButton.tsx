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
import { deleteExpenseAction } from '@/lib/actions/expenses'
import { toast } from 'sonner'

interface DeleteExpenseButtonProps {
  expenseId: string
  farmId: string
  label: string
  variant?: 'default' | 'outline-danger'
}

export function DeleteExpenseButton({
  expenseId,
  farmId,
  label,
  variant = 'outline-danger',
}: DeleteExpenseButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteExpenseAction(expenseId, farmId)
      if ('error' in result) {
        toast.error(result.error)
        setOpen(false)
        return
      }
      toast.success('Expense deleted.')
      setOpen(false)
      router.push(`/farm/expenses?farm=${encodeURIComponent(farmId)}`)
    })
  }

  return (
    <>
      <Button
        type="button"
        variant={variant === 'default' ? 'destructive' : 'outline'}
        className={
          variant === 'outline-danger'
            ? 'border-red-200 text-red-700 hover:bg-red-50'
            : undefined
        }
        onClick={() => setOpen(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this expense?</DialogTitle>
            <DialogDescription>
              {label} — this cannot be undone.
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
                'Delete expense'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
