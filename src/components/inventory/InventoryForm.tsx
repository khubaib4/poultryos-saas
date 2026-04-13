'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createInventoryItemAction,
  updateInventoryItemAction,
} from '@/lib/actions/inventory'
import {
  INVENTORY_TYPES,
  INVENTORY_UNITS,
} from '@/lib/inventory-constants'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { InventoryItem } from '@/types/database'

const numString = (label: string, min = 0) =>
  z
    .string()
    .min(1, `Enter ${label}`)
    .refine((s) => !Number.isNaN(parseFloat(s)) && parseFloat(s) >= min, {
      message: min > 0 ? `Must be at least ${min}` : 'Invalid number',
    })
    .transform((s) => parseFloat(s))

const inventorySchema = z.object({
  type: z.string().min(1, 'Type is required.'),
  name: z.string().min(1, 'Name is required.').max(200),
  unit: z.string().min(1, 'Unit is required.'),
  current_stock: numString('current stock', 0),
  min_stock: numString('minimum stock', 0),
  unit_price: numString('unit price', 0),
  notes: z.string().max(5000).optional().or(z.literal('')),
})

type InventoryFormInput = z.input<typeof inventorySchema>
type InventoryFormValues = z.output<typeof inventorySchema>

interface InventoryFormProps {
  farmId: string
  itemId?: string
  initial?: InventoryItem | null
}

function matchInventoryType(raw: string | undefined): string {
  if (!raw) return 'Feed'
  const hit = INVENTORY_TYPES.find((t) => t.toLowerCase() === raw.toLowerCase())
  return hit ?? 'Other'
}

function matchUnit(raw: string | undefined): string {
  if (!raw) return 'kg'
  const hit = INVENTORY_UNITS.find((u) => u.toLowerCase() === raw.toLowerCase())
  return hit ?? raw
}

export function InventoryForm({ farmId, itemId, initial }: InventoryFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEditing = Boolean(itemId)

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<InventoryFormInput, unknown, InventoryFormValues>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      type: matchInventoryType(initial?.type),
      name: initial?.name ?? '',
      unit: matchUnit(initial?.unit),
      current_stock: initial ? String(initial.current_stock ?? 0) : '0',
      min_stock: initial ? String(initial.min_stock ?? 0) : '0',
      unit_price: initial ? String(initial.unit_price ?? 0) : '0',
      notes: initial?.notes ?? '',
    },
  })

  const onSubmit = (values: InventoryFormValues) => {
    startTransition(async () => {
      const payload = {
        farm_id: farmId,
        type: values.type,
        name: values.name,
        unit: values.unit,
        current_stock: values.current_stock,
        min_stock: values.min_stock,
        unit_price: values.unit_price,
        notes: values.notes || null,
      }

      const result = isEditing
        ? await updateInventoryItemAction(itemId!, payload)
        : await createInventoryItemAction(payload)

      if ('error' in result) {
        setError('root', { message: result.error })
        return
      }

      toast.success(isEditing ? 'Item updated.' : 'Item added.')
      if (!isEditing && 'id' in result) {
        router.push(withFarmQuery(`/farm/inventory/${result.id}`, farmId))
        return
      }
      router.push(withFarmQuery(`/farm/inventory/${itemId}`, farmId))
    })
  }

  const listHref = withFarmQuery('/farm/inventory', farmId)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register('name')} placeholder="e.g. Layer feed 20%" />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Type</Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.type && (
            <p className="text-sm text-red-600">{errors.type.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Unit</Label>
          <Controller
            name="unit"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.unit && (
            <p className="text-sm text-red-600">{errors.unit.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="current_stock">Current stock</Label>
          <Input
            id="current_stock"
            type="number"
            step="0.01"
            min={0}
            {...register('current_stock')}
          />
          {errors.current_stock && (
            <p className="text-sm text-red-600">{errors.current_stock.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="min_stock">Minimum stock (alerts)</Label>
          <Input
            id="min_stock"
            type="number"
            step="0.01"
            min={0}
            {...register('min_stock')}
          />
          {errors.min_stock && (
            <p className="text-sm text-red-600">{errors.min_stock.message}</p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="unit_price">Unit price (PKR)</Label>
          <Input
            id="unit_price"
            type="number"
            step="0.01"
            min={0}
            {...register('unit_price')}
          />
          {errors.unit_price && (
            <p className="text-sm text-red-600">{errors.unit_price.message}</p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            rows={3}
            className={cn(
              'flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm',
              'ring-offset-background placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
            {...register('notes')}
          />
          {errors.notes && (
            <p className="text-sm text-red-600">{errors.notes.message}</p>
          )}
        </div>
      </div>

      {errors.root && (
        <p className="text-sm text-red-600">{errors.root.message}</p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary-dark">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : isEditing ? (
            'Save changes'
          ) : (
            'Add item'
          )}
        </Button>
        <Link
          href={listHref}
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
