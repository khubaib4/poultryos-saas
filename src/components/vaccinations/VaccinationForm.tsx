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
  createVaccinationAction,
  updateVaccinationAction,
} from '@/lib/actions/vaccinations'
import {
  COMMON_VACCINES,
  VACCINATION_METHODS,
  isoDateToday,
} from '@/lib/vaccination-constants'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Flock, Vaccination } from '@/types/database'

const PRESET_OTHER = 'Other'

const vaccineSchema = z
  .object({
    flock_id: z.string().min(1, 'Select a flock.'),
    vaccine_preset: z.string().min(1, 'Vaccine is required.'),
    vaccine_other: z.string().optional().or(z.literal('')),
    scheduled_date: z.string().min(1, 'Date is required.'),
    dosage: z.string().max(500).optional().or(z.literal('')),
    method: z.string().optional().or(z.literal('')),
    notes: z.string().max(5000).optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.vaccine_preset === PRESET_OTHER && !data.vaccine_other?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enter vaccine name.',
        path: ['vaccine_other'],
      })
    }
  })

type VaccineFormInput = z.input<typeof vaccineSchema>
type VaccineFormValues = z.output<typeof vaccineSchema>

function splitVaccineName(name: string): { preset: string; other: string } {
  const hit = COMMON_VACCINES.find((v) => v === name)
  if (hit) return { preset: hit, other: '' }
  return { preset: PRESET_OTHER, other: name }
}

interface VaccinationFormProps {
  farmId: string
  vaccinationId?: string
  initial?: Vaccination | null
  flocks: Flock[]
}

export function VaccinationForm({
  farmId,
  vaccinationId,
  initial,
  flocks,
}: VaccinationFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEditing = Boolean(vaccinationId)

  const split = initial?.vaccine_name
    ? splitVaccineName(initial.vaccine_name)
    : { preset: COMMON_VACCINES[0], other: '' }

  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors },
  } = useForm<VaccineFormInput, unknown, VaccineFormValues>({
    resolver: zodResolver(vaccineSchema),
    defaultValues: {
      flock_id: initial?.flock_id ?? '',
      vaccine_preset: split.preset,
      vaccine_other: split.other,
      scheduled_date: initial?.scheduled_date?.slice(0, 10) ?? isoDateToday(),
      dosage: initial?.dosage ?? '',
      method: initial?.method ?? '',
      notes: initial?.notes ?? '',
    },
  })

  const preset = watch('vaccine_preset')

  const onSubmit = (values: VaccineFormValues) => {
    const vaccine_name =
      values.vaccine_preset === PRESET_OTHER
        ? values.vaccine_other!.trim()
        : values.vaccine_preset

    startTransition(async () => {
      const payload = {
        farm_id: farmId,
        flock_id: values.flock_id,
        vaccine_name,
        scheduled_date: values.scheduled_date,
        dosage: values.dosage || null,
        method: values.method || null,
        notes: values.notes || null,
      }

      const result = isEditing
        ? await updateVaccinationAction(vaccinationId!, payload)
        : await createVaccinationAction(payload)

      if ('error' in result) {
        setError('root', { message: result.error })
        return
      }

      toast.success(isEditing ? 'Vaccination updated.' : 'Vaccination scheduled.')
      if (!isEditing && 'id' in result) {
        router.push(withFarmQuery(`/farm/vaccinations/${result.id}`, farmId))
        return
      }
      router.push(withFarmQuery(`/farm/vaccinations/${vaccinationId}`, farmId))
    })
  }

  const listHref = withFarmQuery('/farm/vaccinations', farmId)

  if (flocks.length === 0) {
    return (
      <p className="text-sm text-amber-800">
        No active flocks on this farm. Add or activate a flock before scheduling
        vaccinations.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Flock</Label>
          <Controller
            name="flock_id"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select flock" />
                </SelectTrigger>
                <SelectContent>
                  {flocks.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.batch_number} — {f.breed} ({f.current_count} birds)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.flock_id && (
            <p className="text-sm text-red-600">{errors.flock_id.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Vaccine name</Label>
          <Controller
            name="vaccine_preset"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vaccine" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_VACCINES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                  <SelectItem value={PRESET_OTHER}>Other</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {preset === PRESET_OTHER && (
            <Input
              placeholder="Vaccine name"
              {...register('vaccine_other')}
            />
          )}
          {errors.vaccine_other && (
            <p className="text-sm text-red-600">{errors.vaccine_other.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sched">Scheduled date</Label>
          <Input id="sched" type="date" {...register('scheduled_date')} />
          {errors.scheduled_date && (
            <p className="text-sm text-red-600">{errors.scheduled_date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dosage">Dosage (optional)</Label>
          <Input id="dosage" {...register('dosage')} placeholder="e.g. 1 dose / 100 birds" />
        </div>

        <div className="space-y-2">
          <Label>Method (optional)</Label>
          <Controller
            name="method"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value || '__none__'}
                onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {VACCINATION_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
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
            className={cn(
              'flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm',
              'ring-offset-background placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
            {...register('notes')}
          />
        </div>
      </div>

      {errors.root && (
        <p className="text-sm text-red-600">{errors.root.message}</p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-primary hover:bg-primary-dark"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : isEditing ? (
            'Save changes'
          ) : (
            'Schedule'
          )}
        </Button>
        <Link href={listHref} className={cn(buttonVariants({ variant: 'outline' }))}>
          Cancel
        </Link>
      </div>
    </form>
  )
}
