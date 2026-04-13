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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { markSkippedAction } from '@/lib/actions/vaccinations'
import { SKIP_VACCINATION_REASONS } from '@/lib/vaccination-constants'
import { toast } from 'sonner'

interface MarkSkippedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vaccinationId: string
  farmId: string
  vaccineLabel: string
}

export function MarkSkippedModal({
  open,
  onOpenChange,
  vaccinationId,
  farmId,
  vaccineLabel,
}: MarkSkippedModalProps) {
  const router = useRouter()
  const [reason, setReason] = useState<string>(SKIP_VACCINATION_REASONS[0])
  const [otherDetail, setOtherDetail] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setReason(SKIP_VACCINATION_REASONS[0])
      setOtherDetail('')
    }
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const finalReason =
      reason === 'Other'
        ? otherDetail.trim() || 'Other'
        : reason

    if (reason === 'Other' && !otherDetail.trim()) {
      toast.error('Please specify a reason.')
      return
    }

    startTransition(async () => {
      const result = await markSkippedAction(
        vaccinationId,
        farmId,
        finalReason
      )
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Marked as skipped.')
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Skip vaccination</DialogTitle>
            <DialogDescription>{vaccineLabel}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Reason (required)</Label>
              <Select
                value={reason}
                onValueChange={(v) => setReason(v ?? SKIP_VACCINATION_REASONS[0])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SKIP_VACCINATION_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {reason === 'Other' && (
              <div className="space-y-2">
                <Label htmlFor="skip-other">Details</Label>
                <textarea
                  id="skip-other"
                  rows={2}
                  className="flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={otherDetail}
                  onChange={(e) => setOtherDetail(e.target.value)}
                  required
                />
              </div>
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
            <Button type="submit" disabled={isPending} variant="secondary">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Confirm skip'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
