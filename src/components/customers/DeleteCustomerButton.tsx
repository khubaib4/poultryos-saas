'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { deleteCustomerAction } from '@/lib/actions/customers'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface DeleteCustomerButtonProps {
  customerId: string
  farmId: string
  customerName: string
  variant?: 'button' | 'destructive-outline'
}

export function DeleteCustomerButton({
  customerId,
  farmId,
  customerName,
  variant = 'destructive-outline',
}: DeleteCustomerButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteCustomerAction(customerId, farmId)
      if ('error' in result) {
        toast.error(result.error)
        setOpen(false)
        return
      }
      toast.success(`"${customerName}" has been removed.`)
      setOpen(false)
      router.push(withFarmQuery('/farm/customers', farmId))
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          variant === 'button'
            ? buttonVariants({ variant: 'destructive' })
            : buttonVariants({ variant: 'outline' }),
          variant === 'destructive-outline' &&
            'border-red-200 text-red-700 hover:bg-red-50'
        )}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete customer
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{customerName}&rdquo;?</DialogTitle>
          <DialogDescription>
            This removes the customer record. Linked sales will keep their amounts
            but will no longer reference this customer. This cannot be undone.
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
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
