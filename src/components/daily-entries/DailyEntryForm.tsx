'use client'

import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Info,
  Loader2,
  Save,
} from 'lucide-react'
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
import { cn } from '@/lib/utils'
import {
  checkDailyEntryExistsAction,
  createDailyEntryAction,
  updateDailyEntryAction,
} from '@/lib/actions/daily-entries'
import { useOfflineOptional } from '@/components/providers/OfflineProvider'
import {
  createOfflineDailyEntry,
  updateOfflineDailyEntry,
} from '@/lib/offline/offlineCrud'
import { toast } from 'sonner'
import type { DeathCause } from '@/types/database'
import type { Flock } from '@/types/database'

const DEATH_CAUSES = [
  'Disease',
  'Heat Stress',
  'Predator',
  'Unknown',
  'Other',
] as const

type DeathCauseOption = (typeof DEATH_CAUSES)[number]

function toInt(v: unknown): number {
  if (v === '' || v === undefined || v === null) return 0
  const n = typeof v === 'number' ? v : parseInt(String(v), 10)
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
}

function toFeed(v: unknown): number | null {
  if (v === '' || v === undefined || v === null) return null
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

const nonNegInt = z
  .union([z.string(), z.number(), z.undefined()])
  .transform(toInt)
  .pipe(z.number().int().nonnegative())

const feedKg = z
  .union([z.string(), z.number(), z.undefined(), z.null()])
  .transform(toFeed)
  .pipe(z.union([z.number().nonnegative(), z.null()]))

const dailyEntrySchema = z
  .object({
    date: z.string().min(1, 'Date is required.'),
    /** Flock IDs are text in DB (not always UUID). Coerce number/string from Select/API. */
    flock_id: z.preprocess(
      (v) => (v == null || v === '' ? '' : String(v)),
      z.string().min(1, 'Select a flock.')
    ),
    eggs_grade_a: nonNegInt,
    eggs_grade_b: nonNegInt,
    eggs_cracked: nonNegInt,
    deaths: nonNegInt,
    death_cause: z.union([
      z.enum(
        DEATH_CAUSES as unknown as [DeathCauseOption, ...DeathCauseOption[]]
      ),
      z.literal(''),
    ]),
    feed_consumed: feedKg,
    notes: z.string().max(2000).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.deaths > 0 && val.death_cause === '') {
      ctx.addIssue({
        code: 'custom',
        message: 'Select a cause when deaths are recorded.',
        path: ['death_cause'],
      })
    }
  })

type DailyEntryFieldValues = z.input<typeof dailyEntrySchema>
type DailyEntryFormValues = z.output<typeof dailyEntrySchema>

interface DailyEntryFormProps {
  farmId: string
  activeFlocks: Flock[]
  entryId?: string
  initialValues?: Partial<DailyEntryFieldValues & { death_cause?: string }>
  /** List URL after save/cancel (admin or worker). */
  entriesListPath: string
  ui?: 'default' | 'stitch'
}

export function DailyEntryForm({
  farmId,
  activeFlocks,
  entryId,
  initialValues,
  entriesListPath,
  ui = 'default',
}: DailyEntryFormProps) {
  const router = useRouter()
  const offline = useOfflineOptional()
  const isOnline = offline?.isOnline ?? true
  const [isPending, startTransition] = useTransition()
  const [duplicate, setDuplicate] = useState(false)
  const [checkPending, setCheckPending] = useState(false)
  const isEditing = Boolean(entryId)

  const defaultDate =
    initialValues?.date ?? new Date().toISOString().split('T')[0] ?? ''
  const defaultFlockRaw = initialValues?.flock_id ?? activeFlocks[0]?.id
  const defaultFlock =
    defaultFlockRaw != null && defaultFlockRaw !== ''
      ? String(defaultFlockRaw)
      : ''

  /** Base UI Select: maps value → label so the trigger shows batch + breed (not raw id). */
  const flockItemsMap = useMemo(() => {
    const map: Record<string, ReactNode> = {}
    for (const f of activeFlocks) {
      map[String(f.id)] = `${f.batch_number} — ${f.breed}`
    }
    return map
  }, [activeFlocks])

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DailyEntryFieldValues, object, DailyEntryFormValues>({
    resolver: zodResolver(dailyEntrySchema),
    defaultValues: {
      date: defaultDate,
      flock_id: defaultFlock,
      eggs_grade_a: initialValues?.eggs_grade_a ?? 0,
      eggs_grade_b: initialValues?.eggs_grade_b ?? 0,
      eggs_cracked: initialValues?.eggs_cracked ?? 0,
      deaths: initialValues?.deaths ?? 0,
      death_cause: initialValues?.death_cause ?? '',
      feed_consumed:
        initialValues?.feed_consumed != null
          ? initialValues.feed_consumed
          : null,
      notes: initialValues?.notes ?? '',
    },
  })

  const eggsA = watch('eggs_grade_a')
  const eggsB = watch('eggs_grade_b')
  const eggsC = watch('eggs_cracked')
  const flockId = watch('flock_id')
  const dateVal = watch('date')
  const deaths = watch('deaths')

  const eggTotal = useMemo(() => {
    const a = toInt(eggsA)
    const b = toInt(eggsB)
    const c = toInt(eggsC)
    return a + b + c
  }, [eggsA, eggsB, eggsC])

  useEffect(() => {
    if (toInt(deaths) === 0) {
      setValue('death_cause', '')
    }
  }, [deaths, setValue])

  useEffect(() => {
    if (!isOnline) {
      setDuplicate(false)
      setCheckPending(false)
      return
    }
    const flockKey = flockId != null && flockId !== '' ? String(flockId) : ''
    if (!flockKey || !dateVal) {
      setDuplicate(false)
      return
    }
    let cancelled = false
    setCheckPending(true)
    ;(async () => {
      try {
        const exists = await checkDailyEntryExistsAction(
          flockKey,
          dateVal,
          entryId
        )
        if (!cancelled) setDuplicate(exists)
      } finally {
        if (!cancelled) setCheckPending(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOnline, flockId, dateVal, entryId])

  const onSubmit = (data: DailyEntryFormValues) => {
    if (!isEditing && duplicate) {
      toast.error('An entry already exists for this flock on this date.')
      return
    }

    const payload = {
      farm_id: farmId,
      flock_id: data.flock_id,
      date: data.date,
      eggs_grade_a: data.eggs_grade_a,
      eggs_grade_b: data.eggs_grade_b,
      eggs_cracked: data.eggs_cracked,
      deaths: data.deaths,
      death_cause:
        data.deaths > 0 ? (data.death_cause as DeathCause) : null,
      feed_consumed: data.feed_consumed,
      notes: data.notes?.trim() || null,
    }

    startTransition(async () => {
      const flockLabel =
        activeFlocks.find((f) => String(f.id) === String(data.flock_id))
          ?.batch_number ?? 'Flock'

      if (!isOnline) {
        if (isEditing) {
          await updateOfflineDailyEntry(entryId!, payload, { flockLabel })
        } else {
          await createOfflineDailyEntry(payload, { flockLabel })
        }
        toast.success('Saved offline. Will sync when connected.')
        await offline?.refreshPending()
        router.push(entriesListPath)
        router.refresh()
        return
      }

      if (isEditing) {
        const result = await updateDailyEntryAction(entryId!, payload)
        if ('error' in result) {
          toast.error(result.error)
          return
        }
        toast.success('Entry updated.')
        router.push(entriesListPath)
        router.refresh()
        return
      }

      const result = await createDailyEntryAction(payload)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Entry saved.')
      router.push(entriesListPath)
      router.refresh()
    })
  }

  if (activeFlocks.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Add an active flock before recording daily entries.
      </div>
    )
  }

  function SectionHeader({
    dotColor,
    title,
    rightLabel,
  }: {
    dotColor: string
    title: string
    rightLabel?: string
  }) {
    return (
      <div className="mb-4 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotColor}`} aria-hidden />
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {rightLabel && (
          <span className="ml-auto text-xs font-medium uppercase tracking-wide text-gray-400">
            {rightLabel}
          </span>
        )}
      </div>
    )
  }

  const selectedFlock = useMemo(() => {
    const id = flockId != null && flockId !== '' ? String(flockId) : ''
    if (!id) return null
    return activeFlocks.find((f) => String(f.id) === id) ?? null
  }, [activeFlocks, flockId])

  const recommendedFeed = useMemo(() => {
    // Simple default that matches the Stitch screenshot; can be made smarter later.
    // If we have arrival_date, we can adjust slightly for older birds.
    const base = 12.5
    const arrival = selectedFlock?.arrival_date
    if (!arrival) return base
    const days = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(`${arrival}T12:00:00`).getTime()) / 86400000
      )
    )
    if (days >= 56) return 13.5
    if (days >= 28) return 13.0
    return base
  }, [selectedFlock?.arrival_date])

  if (ui !== 'stitch') {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {duplicate && !isEditing && (
        <div
          className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
          role="status"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Entry already exists</p>
            <p className="mt-0.5 text-amber-800">
              This flock already has a record for this date. Choose another
              date or edit the existing entry.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" {...register('date')} />
          {errors.date && (
            <p className="text-sm text-destructive">{errors.date.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Flock</Label>
          <Controller
            name="flock_id"
            control={control}
            render={({ field }) => {
              const selected =
                field.value != null && field.value !== ''
                  ? String(field.value)
                  : undefined
              return (
                <Select
                  value={selected}
                  onValueChange={(v) =>
                    field.onChange(v != null ? String(v) : '')
                  }
                  items={flockItemsMap}
                >
                  <SelectTrigger
                    className={cn(
                      errors.flock_id && 'aria-invalid:border-destructive'
                    )}
                    aria-invalid={!!errors.flock_id}
                  >
                    <SelectValue placeholder="Select a flock" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeFlocks.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.batch_number} — {f.breed}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            }}
          />
          {errors.flock_id && (
            <p className="text-sm text-destructive">{errors.flock_id.message}</p>
          )}
          {checkPending && (
            <p className="text-xs text-muted-foreground">Checking duplicates…</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Eggs collected</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="eggs_grade_a">Grade A</Label>
            <Input
              id="eggs_grade_a"
              type="number"
              min={0}
              step={1}
              {...register('eggs_grade_a')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eggs_grade_b">Grade B</Label>
            <Input
              id="eggs_grade_b"
              type="number"
              min={0}
              step={1}
              {...register('eggs_grade_b')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eggs_cracked">Cracked</Label>
            <Input
              id="eggs_cracked"
              type="number"
              min={0}
              step={1}
              {...register('eggs_cracked')}
            />
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Total:{' '}
          <span className="font-semibold text-gray-900">
            {eggTotal.toLocaleString()}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="deaths">Deaths</Label>
          <Input
            id="deaths"
            type="number"
            min={0}
            step={1}
            {...register('deaths')}
          />
          {errors.deaths && (
            <p className="text-sm text-destructive">{errors.deaths.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Death cause</Label>
          <Controller
            name="death_cause"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onValueChange={(v) => field.onChange(v ?? '')}
                disabled={toInt(deaths) === 0}
              >
                <SelectTrigger
                  aria-invalid={!!errors.death_cause}
                  className={cn(
                    errors.death_cause && 'aria-invalid:border-destructive'
                  )}
                >
                  <SelectValue
                    placeholder={
                      toInt(deaths) === 0 ? '—' : 'Select cause'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {DEATH_CAUSES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.death_cause && (
            <p className="text-sm text-destructive">
              {errors.death_cause.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="feed_consumed">Feed (kg)</Label>
        <Controller
          name="feed_consumed"
          control={control}
          render={({ field }) => (
            <Input
              id="feed_consumed"
              type="number"
              min={0}
              step={0.01}
              placeholder="Optional"
              value={field.value ?? ''}
              onChange={(e) => {
                const raw = e.target.value
                field.onChange(
                  raw === '' ? null : Number.parseFloat(raw)
                )
              }}
            />
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          rows={3}
          {...register('notes')}
          className={cn(
            'w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none',
            'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            'disabled:pointer-events-none disabled:opacity-50'
          )}
          placeholder="Optional observations"
        />
        {errors.notes && (
          <p className="text-sm text-destructive">{errors.notes.message}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={isPending || (!isEditing && duplicate)}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : isEditing ? (
            'Save changes'
          ) : (
            'Save entry'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(entriesListPath)}
        >
          Cancel
        </Button>
      </div>
    </form>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {duplicate && !isEditing && (
        <div
          className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          role="status"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Entry already exists</p>
            <p className="mt-0.5 text-amber-800">
              This flock already has a record for this date. Choose another
              date or edit the existing entry.
            </p>
          </div>
        </div>
      )}

      {/* Top row */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Entry date
          </p>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input id="date" type="date" className="pl-9" {...register('date')} />
          </div>
          {errors.date && (
            <p className="text-sm text-destructive">{errors.date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Select flock
          </p>
          <Controller
            name="flock_id"
            control={control}
            render={({ field }) => {
              const selected =
                field.value != null && field.value !== ''
                  ? String(field.value)
                  : undefined
              return (
                <div className="relative">
                  <CheckCircle2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                  <Select
                    value={selected}
                    onValueChange={(v) =>
                      field.onChange(v != null ? String(v) : '')
                    }
                    items={flockItemsMap}
                  >
                    <SelectTrigger
                      className={cn(
                        'pl-9',
                        errors.flock_id && 'aria-invalid:border-destructive'
                      )}
                      aria-invalid={!!errors.flock_id}
                    >
                      <SelectValue placeholder="Select a flock" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeFlocks.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          {f.batch_number} — {f.breed}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            }}
          />
          {errors.flock_id && (
            <p className="text-sm text-destructive">{errors.flock_id.message}</p>
          )}
          {checkPending && (
            <p className="text-xs text-muted-foreground">Checking duplicates…</p>
          )}
        </div>
      </div>

      {/* Egg Production */}
      <div>
        <SectionHeader
          dotColor="bg-primary"
          title="Egg Production"
          rightLabel="Daily harvest"
        />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { id: 'eggs_grade_a', label: 'Grade A' as const },
            { id: 'eggs_grade_b', label: 'Grade B' as const },
            { id: 'eggs_cracked', label: 'Cracked' as const },
          ].map((f) => (
            <div
              key={f.id}
              className="rounded-xl bg-gray-50 p-4 shadow-sm ring-1 ring-black/[0.04]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                {f.label}
              </p>
              <Input
                id={f.id}
                type="number"
                min={0}
                step={1}
                className="mt-2 h-12 border-0 bg-transparent px-0 text-2xl font-semibold leading-none text-gray-900 shadow-none focus-visible:ring-0"
                {...register(f.id as 'eggs_grade_a' | 'eggs_grade_b' | 'eggs_cracked')}
              />
            </div>
          ))}

          <div className="rounded-xl bg-[#FEF3C7] p-4 shadow-sm ring-1 ring-black/[0.04]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-900/70">
              Total eggs
            </p>
            <p className="mt-3 text-2xl font-semibold leading-none text-gray-900 tabular-nums">
              {eggTotal.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Mortality + Nutrition */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div>
          <SectionHeader dotColor="bg-red-500" title="Mortality" />
          <div className="rounded-xl bg-gray-50 p-5 shadow-sm ring-1 ring-black/[0.04]">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Deaths count
              </p>
              <Input
                id="deaths"
                type="number"
                min={0}
                step={1}
                className="h-12 bg-white text-2xl font-semibold"
                {...register('deaths')}
              />
              {errors.deaths && (
                <p className="text-sm text-destructive">{errors.deaths.message}</p>
              )}
            </div>

            <div className="mt-5 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Primary cause
              </p>
              <Controller
                name="death_cause"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={(v) => field.onChange(v ?? '')}
                    disabled={toInt(deaths) === 0}
                  >
                    <SelectTrigger
                      aria-invalid={!!errors.death_cause}
                      className={cn(
                        errors.death_cause && 'aria-invalid:border-destructive'
                      )}
                    >
                      <SelectValue
                        placeholder={toInt(deaths) === 0 ? '—' : 'Select cause…'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {DEATH_CAUSES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.death_cause && (
                <p className="text-sm text-destructive">
                  {errors.death_cause.message}
                </p>
              )}
            </div>
          </div>
        </div>

        <div>
          <SectionHeader dotColor="bg-primary" title="Nutrition" />
          <div className="rounded-xl bg-gray-50 p-5 shadow-sm ring-1 ring-black/[0.04] border-l-4 border-l-primary">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Feed consumed (kg)
              </p>
              <div className="relative">
                <Controller
                  name="feed_consumed"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="feed_consumed"
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.0"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value
                        field.onChange(raw === '' ? null : Number.parseFloat(raw))
                      }}
                      className="h-12 bg-white pr-12 text-2xl font-semibold"
                    />
                  )}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                  KG
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-2 rounded-xl bg-primary-lighter p-3 text-sm text-green-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
              <p className="leading-relaxed">
                Recommended feed for this flock age is {recommendedFeed.toFixed(1)}kg per
                100 birds.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          Daily observations &amp; notes
        </p>
        <textarea
          id="notes"
          rows={5}
          {...register('notes')}
          className={cn(
            'w-full min-w-0 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm ring-1 ring-black/[0.02] transition-colors outline-none',
            'placeholder:text-gray-400 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40'
          )}
          placeholder="Any unusual behavior, weather changes, or equipment issues…"
        />
        {errors.notes && (
          <p className="text-sm text-destructive">{errors.notes.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          className="justify-start text-gray-600"
          onClick={() => router.push(entriesListPath)}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          variant="primarySimple"
          className="w-full gap-2 sm:w-auto"
          disabled={isPending || (!isEditing && duplicate)}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {isEditing ? 'Save changes' : 'Save entry'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
