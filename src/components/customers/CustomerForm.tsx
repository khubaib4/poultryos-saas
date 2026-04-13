'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createCustomerAction, updateCustomerAction } from '@/lib/actions/customers'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(200),
  phone: z.string().max(50).optional().or(z.literal('')),
  business_name: z.string().max(200).optional().or(z.literal('')),
  address: z.string().max(2000).optional().or(z.literal('')),
  category: z.enum([
    'Individual',
    'Retailer',
    'Wholesaler',
    'Restaurant',
    'Other',
  ]),
  notes: z.string().max(5000).optional().or(z.literal('')),
})

type CustomerFormValues = z.infer<typeof customerSchema>

const CATEGORY_OPTIONS = [
  'Individual',
  'Retailer',
  'Wholesaler',
  'Restaurant',
  'Other',
] as const

interface CustomerFormProps {
  farmId: string
  customerId?: string
  initialValues?: Partial<CustomerFormValues>
}

export function CustomerForm({ farmId, customerId, initialValues }: CustomerFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEditing = Boolean(customerId)

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: initialValues?.name ?? '',
      phone: initialValues?.phone ?? '',
      business_name: initialValues?.business_name ?? '',
      address: initialValues?.address ?? '',
      category: (initialValues?.category as CustomerFormValues['category']) ?? 'Individual',
      notes: initialValues?.notes ?? '',
    },
  })

  const onSubmit = (data: CustomerFormValues) => {
    startTransition(async () => {
      const payload = {
        farm_id: farmId,
        name: data.name,
        phone: data.phone || null,
        business_name: data.business_name || null,
        address: data.address || null,
        category: data.category,
        notes: data.notes || null,
      }

      const result = isEditing
        ? await updateCustomerAction(customerId!, payload)
        : await createCustomerAction(payload)

      if ('error' in result) {
        setError('root', { message: result.error })
        return
      }

      toast.success(isEditing ? 'Customer updated.' : 'Customer created.')
      if (!isEditing && 'id' in result) {
        router.push(withFarmQuery(`/farm/customers/${result.id}`, farmId))
        return
      }
      router.push(withFarmQuery(`/farm/customers/${customerId}`, farmId))
    })
  }

  const listHref = withFarmQuery('/farm/customers', farmId)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-xl">
      {errors.root && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.root.message}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          placeholder="Customer name"
          disabled={isPending}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="e.g. 03xx-xxxxxxx"
          disabled={isPending}
          {...register('phone')}
        />
        {errors.phone && (
          <p className="text-xs text-red-600">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="business_name">Business name</Label>
        <Input
          id="business_name"
          placeholder="Optional"
          disabled={isPending}
          {...register('business_name')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <textarea
          id="address"
          rows={3}
          disabled={isPending}
          className={cn(
            'flex w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none',
            'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            'disabled:opacity-50 md:text-sm'
          )}
          placeholder="Street, area, city"
          {...register('address')}
        />
        {errors.address && (
          <p className="text-xs text-red-600">{errors.address.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          rows={3}
          disabled={isPending}
          className={cn(
            'flex w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none',
            'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            'disabled:opacity-50 md:text-sm'
          )}
          placeholder="Internal notes"
          {...register('notes')}
        />
        {errors.notes && (
          <p className="text-xs text-red-600">{errors.notes.message}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          type="submit"
          className="bg-primary hover:bg-primary-dark"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditing ? 'Saving…' : 'Creating…'}
            </>
          ) : isEditing ? (
            'Save changes'
          ) : (
            'Add customer'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(listHref)}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
