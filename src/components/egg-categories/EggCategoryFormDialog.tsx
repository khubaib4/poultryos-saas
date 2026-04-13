'use client'

import { useEffect, useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createEggCategoryAction,
  updateEggCategoryAction,
} from '@/lib/actions/egg-categories'
import type { EggCategory } from '@/types/database'
import { toast } from 'sonner'

interface EggCategoryFormDialogProps {
  farmId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, dialog is in edit mode */
  category: EggCategory | null
  onSaved: () => void
}

export function EggCategoryFormDialog({
  farmId,
  open,
  onOpenChange,
  category,
  onSaved,
}: EggCategoryFormDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [defaultPrice, setDefaultPrice] = useState('0')

  useEffect(() => {
    if (!open) return
    if (category) {
      setName(category.name)
      setDescription(category.description ?? '')
      setDefaultPrice(String(category.default_price ?? 0))
    } else {
      setName('')
      setDescription('')
      setDefaultPrice('0')
    }
  }, [open, category])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) {
      toast.error('Name is required.')
      return
    }
    const price = parseFloat(defaultPrice)
    if (Number.isNaN(price) || price < 0) {
      toast.error('Enter a valid default price (0 or more).')
      return
    }

    startTransition(async () => {
      if (category) {
        const res = await updateEggCategoryAction(category.id, {
          name: n,
          description: description.trim() || null,
          default_price: price,
        })
        if ('error' in res) {
          toast.error(res.error)
          return
        }
        toast.success('Category updated.')
      } else {
        const res = await createEggCategoryAction({
          farm_id: farmId,
          name: n,
          description: description.trim() || null,
          default_price: price,
        })
        if ('error' in res) {
          toast.error(res.error)
          return
        }
        toast.success('Category created.')
      }
      onOpenChange(false)
      onSaved()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{category ? 'Edit category' : 'Add category'}</DialogTitle>
            <DialogDescription>
              Sale line items can use this label; unit price can default from here.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ec-name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="ec-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                placeholder="e.g. Large white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-desc">Description (optional)</Label>
              <Input
                id="ec-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isPending}
                placeholder="Shown only in settings"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-price">Default price (PKR)</Label>
              <Input
                id="ec-price"
                type="number"
                min={0}
                step="0.01"
                value={defaultPrice}
                onChange={(e) => setDefaultPrice(e.target.value)}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Pre-fills unit price when this category is chosen on a sale.
              </p>
            </div>
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 pt-2 gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary-dark"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : category ? (
                'Save changes'
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
