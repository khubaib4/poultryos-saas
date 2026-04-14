'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Bell, Loader2, Search } from 'lucide-react'
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
import { createVaccinationAction } from '@/lib/actions/vaccinations'
import { buildNotesWithRemindersAndTime } from '@/lib/vaccination-badges'
import {
  ADMINISTRATION_METHOD_OPTIONS,
  VACCINE_OPTIONS,
  methodLabelFromValue,
  vaccineLabelFromPresetValue,
} from '@/lib/vaccination-options'
import { isoDateToday } from '@/lib/vaccination-constants'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Flock } from '@/types/database'

const PRESET_OTHER = 'other'

function defaultDatetimeLocal(): string {
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(0)
  if (d.getHours() < 9) d.setHours(9)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function splitDatetimeLocal(s: string): { date: string; timeLabel: string } {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) {
    return { date: isoDateToday(), timeLabel: '' }
  }
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const timeLabel = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return { date: `${y}-${m}-${day}`, timeLabel }
}

const scheduleSchema = z
  .object({
    flock_id: z.string().min(1, 'Select a flock.'),
    vaccine_preset: z.string().min(1),
    vaccine_other: z.string().optional().or(z.literal('')),
    scheduled_datetime: z.string().min(1, 'Pick date and time.'),
    dosage: z.string().max(500).optional().or(z.literal('')),
    method_preset: z.string().min(1, 'Select a method.'),
    administered_by: z.string().max(200).optional().or(z.literal('')),
    notes: z.string().max(5000).optional().or(z.literal('')),
    reminders: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.vaccine_preset === PRESET_OTHER && !data.vaccine_other?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter vaccine name.',
        path: ['vaccine_other'],
      })
    }
  })

type ScheduleInput = z.input<typeof scheduleSchema>
type ScheduleOutput = z.output<typeof scheduleSchema>

interface VaccinationScheduleFormProps {
  farmId: string
  flocks: Flock[]
  variant: 'modal' | 'page'
  /** When false, stay on list after create (e.g. modal). Default: true for full page. */
  redirectAfterCreate?: boolean
  onSuccess?: () => void
  onCancel?: () => void
}

export function VaccinationScheduleForm({
  farmId,
  flocks,
  variant,
  redirectAfterCreate = true,
  onSuccess,
  onCancel,
}: VaccinationScheduleFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [flockSearch, setFlockSearch] = useState('')

  const filteredFlocks = useMemo(() => {
    const q = flockSearch.trim().toLowerCase()
    if (!q) return flocks
    return flocks.filter(
      (f) =>
        f.batch_number.toLowerCase().includes(q) ||
        f.breed.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q)
    )
  }, [flocks, flockSearch])

  const {
    register,
    handleSubmit,
    control,
    setError,
    watch,
    formState: { errors },
  } = useForm<ScheduleInput, unknown, ScheduleOutput>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      flock_id: flocks[0]?.id ?? '',
      vaccine_preset: VACCINE_OPTIONS[0]?.value ?? 'newcastle-nd',
      vaccine_other: '',
      scheduled_datetime: defaultDatetimeLocal(),
      dosage: '',
      method_preset: ADMINISTRATION_METHOD_OPTIONS[0]?.value ?? 'drinking-water',
      administered_by: '',
      notes: '',
      reminders: true,
    },
  })

  const preset = watch('vaccine_preset')

  const onSubmit = (values: ScheduleOutput) => {
    const vaccine_name =
      values.vaccine_preset === PRESET_OTHER
        ? values.vaccine_other!.trim()
        : vaccineLabelFromPresetValue(values.vaccine_preset)

    const { date, timeLabel } = splitDatetimeLocal(values.scheduled_datetime)
    const method = methodLabelFromValue(values.method_preset)
    const mergedNotes = buildNotesWithRemindersAndTime(values.notes ?? '', {
      reminders: values.reminders,
      scheduledTimeLabel: timeLabel || null,
    })

    startTransition(async () => {
      const payload = {
        farm_id: farmId,
        flock_id: values.flock_id,
        vaccine_name,
        scheduled_date: date,
        dosage: values.dosage?.trim() || null,
        method,
        administered_by: values.administered_by?.trim() || null,
        notes: mergedNotes || null,
      }

      const result = await createVaccinationAction(payload)
      if ('error' in result) {
        setError('root', { message: result.error })
        return
      }

      toast.success('Vaccination scheduled.')
      if (redirectAfterCreate && 'id' in result) {
        router.push(withFarmQuery(`/farm/vaccinations/${result.id}`, farmId))
      }
      router.refresh()
      onSuccess?.()
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

  const formClass =
    variant === 'modal'
      ? 'space-y-5'
      : 'mx-auto max-w-4xl space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={formClass}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Flock selection</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Search flock ID or type…"
                value={flockSearch}
                onChange={(e) => setFlockSearch(e.target.value)}
                autoComplete="off"
              />
            </div>
            <Controller
              name="flock_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select flock" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredFlocks.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.batch_number} — {f.breed} ({f.current_count} birds)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.flock_id && (
              <p className="text-xs text-red-600">{errors.flock_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sched-dt">Scheduled date &amp; time</Label>
            <Input
              id="sched-dt"
              type="datetime-local"
              className="rounded-xl"
              {...register('scheduled_datetime')}
            />
            {errors.scheduled_datetime && (
              <p className="text-xs text-red-600">{errors.scheduled_datetime.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dosage">Dosage (per bird / ml)</Label>
            <Input
              id="dosage"
              placeholder="e.g. 0.5 ml"
              className="rounded-xl"
              {...register('dosage')}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Vaccine name</Label>
            <Controller
              name="vaccine_preset"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VACCINE_OPTIONS.map((v) => (
                      <SelectItem key={v.value} value={v.value}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {preset === PRESET_OTHER && (
              <Input
                placeholder="Vaccine name"
                className="rounded-xl"
                {...register('vaccine_other')}
              />
            )}
            {errors.vaccine_other && (
              <p className="text-xs text-red-600">{errors.vaccine_other.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Administration method</Label>
            <Controller
              name="method_preset"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADMINISTRATION_METHOD_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-by">Administered by</Label>
            <Input
              id="admin-by"
              placeholder="Veterinarian or tech name"
              className="rounded-xl"
              {...register('administered_by')}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes-add">Additional notes</Label>
        <textarea
          id="notes-add"
          rows={3}
          placeholder="Specify batch number or special handling instructions…"
          className={cn(
            'flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm',
            'outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
          )}
          {...register('notes')}
        />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50/80 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Bell className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Enable reminders</p>
            <p className="text-sm text-gray-600">Notify staff 2 hours before the schedule.</p>
          </div>
        </div>
        <Controller
          name="reminders"
          control={control}
          render={({ field }) => (
            <button
              type="button"
              role="switch"
              aria-checked={field.value}
              onClick={() => field.onChange(!field.value)}
              className={cn(
                'relative h-8 w-14 shrink-0 rounded-full transition-colors',
                field.value ? 'bg-primary' : 'bg-gray-200'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform',
                  field.value && 'translate-x-6'
                )}
              />
            </button>
          )}
        />
      </div>

      {errors.root && (
        <p className="text-sm text-red-600">{errors.root.message}</p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        {variant === 'modal' ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
        ) : (
          <Link href={listHref} className={buttonVariants({ variant: 'outline', size: 'default' })}>
            Cancel
          </Link>
        )}
        <Button
          type="submit"
          disabled={isPending}
          variant="primarySimple"
          className="rounded-xl px-8"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Schedule vaccination'
          )}
        </Button>
      </div>
    </form>
  )
}
