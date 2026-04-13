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
import { deleteFlockAction } from '@/lib/actions/flocks'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { toast } from 'sonner'

interface DeleteFlockButtonProps {
  flockId: string
  flockLabel: string
  farmId: string
  variant?: 'button' | 'menu-item'
  /**
   * If true, redirect to the farm detail page after delete (e.g. when
   * deleting from the flock detail page). Default: stay on flocks list.
   */
  redirectToFarm?: boolean
  /** Farm worker portal vs admin URLs after delete. */
  navBase?: 'admin' | 'farm'
}

export function DeleteFlockButton({
  flockId,
  flockLabel,
  farmId,
  variant = 'button',
  redirectToFarm = false,
  navBase = 'admin',
}: DeleteFlockButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteFlockAction(flockId)
      if ('error' in result) {
        toast.error(result.error)
        setOpen(false)
        return
      }
      toast.success(`Flock "${flockLabel}" has been deleted.`)
      setOpen(false)
      if (navBase === 'farm') {
        router.push(withFarmQuery('/farm/flocks', farmId))
      } else {
        router.push(
          redirectToFarm
            ? `/admin/farms/${farmId}`
            : `/admin/farms/${farmId}/flocks`
        )
      }
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
        {variant === 'button' ? 'Delete Flock' : 'Delete'}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete flock &ldquo;{flockLabel}&rdquo;?</DialogTitle>
          <DialogDescription>
            This will permanently delete the flock and all associated daily
            entries. This action cannot be undone.
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
              'Yes, Delete Flock'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
