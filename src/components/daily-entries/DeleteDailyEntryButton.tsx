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
  DialogTrigger,
} from '@/components/ui/dialog'
import { deleteDailyEntryAction } from '@/lib/actions/daily-entries'
import { toast } from 'sonner'

interface DeleteDailyEntryButtonProps {
  entryId: string
  farmId: string
  flockLabel: string
  entryDate: string
  variant?: 'button' | 'menu-item'
}

export function DeleteDailyEntryButton({
  entryId,
  farmId,
  flockLabel,
  entryDate,
  variant = 'button',
}: DeleteDailyEntryButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteDailyEntryAction(entryId, farmId)
      if ('error' in result) {
        toast.error(result.error)
        setOpen(false)
        return
      }
      toast.success('Daily entry deleted.')
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={
          variant === 'button'
            ? 'inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors'
            : 'flex w-full items-center gap-2 px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors'
        }
      >
        <Trash2 className="h-4 w-4" />
        {variant === 'button' ? 'Delete' : 'Delete'}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete daily entry?</DialogTitle>
          <DialogDescription>
            {flockLabel} — {entryDate}. Bird deaths on this entry will be
            restored to the flock count. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              'Delete entry'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
