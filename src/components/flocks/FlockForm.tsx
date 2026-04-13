'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
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
import { createFlockAction, updateFlockAction } from '@/lib/actions/flocks'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { toast } from 'sonner'
import type { FlockStatus } from '@/types/database'

const BREED_OPTIONS = [
  'Broiler',
  'Layer',
  'Hubbard',
  'Cobb 500',
  'Ross 308',
  'Lohmann Brown',
  'Other',
] as const

const flockSchema = z.object({
  batch_number: z.string().min(2, 'Batch number is required.').max(50),
  breed: z.string().min(1, 'Breed is required.'),
  initial_count: z
    .number()
    .int('Must be a whole number')
    .positive('Must be greater than 0'),
  current_count: z.number().int().nonnegative().optional(),
  age_at_arrival: z
    .number()
    .int('Must be a whole number')
    .nonnegative('Cannot be negative'),
  arrival_date: z.string().min(1, 'Arrival date is required.'),
  status: z.enum(['active', 'sold', 'archived']).optional(),
  notes: z.string().max(1000).optional(),
})

type FlockFormValues = z.infer<typeof flockSchema>

interface FlockFormProps {
  farmId: string
  flockId?: string // present when editing
  initialValues?: Partial<
    FlockFormValues & { current_count: number; status: FlockStatus }
  >
  /** Where post-save navigation and cancel go (default: admin farm flock URLs). */
  navBase?: 'admin' | 'farm'
}

export function FlockForm({
  farmId,
  flockId,
  initialValues,
  navBase = 'admin',
}: FlockFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEditing = Boolean(flockId)

  const listPath =
    navBase === 'farm'
      ? withFarmQuery('/farm/flocks', farmId)
      : `/admin/farms/${farmId}/flocks`
  const detailPath = (id: string) =>
    navBase === 'farm'
      ? withFarmQuery(`/farm/flocks/${id}`, farmId)
      : `/admin/farms/${farmId}/flocks/${id}`

  // Determine if the initial breed is a known preset or a custom "Other" value
  const initialBreedIsPreset =
    !initialValues?.breed ||
    (BREED_OPTIONS as readonly string[]).includes(initialValues.breed)

  const [breedChoice, setBreedChoice] = useState<string>(
    initialBreedIsPreset ? initialValues?.breed ?? 'Broiler' : 'Other'
  )
  const [breedOther, setBreedOther] = useState<string>(
    initialBreedIsPreset ? '' : initialValues?.breed ?? ''
  )
  // Store initial date as a plain string for the <input type="date"> field
  const defaultArrivalDate =
    initialValues?.arrival_date ?? new Date().toISOString().split('T')[0] ?? ''

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<FlockFormValues>({
    resolver: zodResolver(flockSchema),
    defaultValues: {
      batch_number: initialValues?.batch_number ?? '',
      breed: initialValues?.breed ?? 'Broiler',
      initial_count: initialValues?.initial_count,
      current_count: initialValues?.current_count,
      age_at_arrival: initialValues?.age_at_arrival ?? 0,
      arrival_date: defaultArrivalDate,
      status: initialValues?.status ?? 'active',
      notes: initialValues?.notes ?? '',
    },
  })

  const statusValue = watch('status')

  const onSubmit = (data: FlockFormValues) => {
    const resolvedBreed =
      breedChoice === 'Other' ? breedOther.trim() : breedChoice

    if (!resolvedBreed) {
      setError('breed', { message: 'Please enter a breed name.' })
      return
    }

    startTransition(async () => {
      if (isEditing) {
        const result = await updateFlockAction(flockId!, {
          batch_number: data.batch_number,
          breed: resolvedBreed,
          initial_count: data.initial_count,
          current_count: data.current_count ?? data.initial_count,
          age_at_arrival: data.age_at_arrival,
          arrival_date: data.arrival_date,
          status: (data.status ?? 'active') as FlockStatus,
          notes: data.notes,
        })

        if ('error' in result) {
          setError('root', { message: result.error })
          return
        }

        toast.success('Flock updated.')
        router.push(detailPath(flockId!))
        router.refresh()
      } else {
        const result = await createFlockAction({
          farm_id: farmId,
          batch_number: data.batch_number,
          breed: resolvedBreed,
          initial_count: data.initial_count,
          age_at_arrival: data.age_at_arrival,
          arrival_date: data.arrival_date,
          notes: data.notes,
        })

        if ('error' in result) {
          setError('root', { message: result.error })
          return
        }

        toast.success('Flock created.')
        router.push(listPath)
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {errors.root && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.root.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="batch_number">
            Batch Number <span className="text-red-500">*</span>
          </Label>
          <Input
            id="batch_number"
            placeholder="BATCH-2026-001"
            disabled={isPending}
            {...register('batch_number')}
          />
          {errors.batch_number && (
            <p className="text-xs text-red-600">{errors.batch_number.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="breed">
            Breed <span className="text-red-500">*</span>
          </Label>
          <Select
            value={breedChoice}
            onValueChange={(v) => {
              const value = v ?? 'Broiler'
              setBreedChoice(value)
              setValue('breed', value === 'Other' ? breedOther : value, {
                shouldValidate: true,
              })
            }}
            disabled={isPending}
          >
            <SelectTrigger id="breed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BREED_OPTIONS.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {breedChoice === 'Other' && (
            <Input
              placeholder="Enter breed name"
              value={breedOther}
              onChange={(e) => {
                setBreedOther(e.target.value)
                setValue('breed', e.target.value, { shouldValidate: true })
              }}
              disabled={isPending}
            />
          )}
          {errors.breed && (
            <p className="text-xs text-red-600">{errors.breed.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="initial_count">
            Initial Bird Count <span className="text-red-500">*</span>
          </Label>
          <Input
            id="initial_count"
            type="number"
            min={1}
            placeholder="5000"
            disabled={isPending}
            {...register('initial_count', { valueAsNumber: true })}
          />
          {errors.initial_count && (
            <p className="text-xs text-red-600">
              {errors.initial_count.message}
            </p>
          )}
        </div>

        {isEditing && (
          <div className="space-y-2">
            <Label htmlFor="current_count">Current Bird Count</Label>
            <Input
              id="current_count"
              type="number"
              min={0}
              placeholder="4850"
              disabled={isPending}
              {...register('current_count', { valueAsNumber: true })}
            />
            {errors.current_count && (
              <p className="text-xs text-red-600">
                {errors.current_count.message}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="age_at_arrival">
            Age at Arrival (days) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="age_at_arrival"
            type="number"
            min={0}
            placeholder="1"
            disabled={isPending}
            {...register('age_at_arrival', { valueAsNumber: true })}
          />
          {errors.age_at_arrival && (
            <p className="text-xs text-red-600">
              {errors.age_at_arrival.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="arrival_date">
            Arrival Date <span className="text-red-500">*</span>
          </Label>
          <Input
            id="arrival_date"
            type="date"
            disabled={isPending}
            {...register('arrival_date')}
          />
          {errors.arrival_date && (
            <p className="text-xs text-red-600">
              {errors.arrival_date.message}
            </p>
          )}
        </div>

        {isEditing && (
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={statusValue}
              onValueChange={(v) => setValue('status', v as FlockStatus)}
              disabled={isPending}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">
          Notes{' '}
          <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </Label>
        <textarea
          id="notes"
          rows={3}
          placeholder="Vaccination plan, supplier info, anything worth remembering…"
          disabled={isPending}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          {...register('notes')}
        />
        {errors.notes && (
          <p className="text-xs text-red-600">{errors.notes.message}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          type="submit"
          variant="primarySimple"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditing ? 'Saving…' : 'Creating…'}
            </>
          ) : isEditing ? (
            'Save Changes'
          ) : (
            'Create Flock'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            router.push(isEditing && flockId ? detailPath(flockId) : listPath)
          }
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
