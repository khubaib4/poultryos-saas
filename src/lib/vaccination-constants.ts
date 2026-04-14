import {
  ADMINISTRATION_METHOD_OPTIONS,
  VACCINE_OPTIONS,
} from '@/lib/vaccination-options'

/** Preset vaccine labels (Stitch dropdown). */
export const COMMON_VACCINES = VACCINE_OPTIONS.map(
  (o) => o.label
) as unknown as readonly string[]

export const VACCINATION_METHODS = ADMINISTRATION_METHOD_OPTIONS.map(
  (o) => o.label
) as unknown as readonly string[]

/** Stored in DB */
export const VACCINATION_STATUSES = ['scheduled', 'completed', 'skipped'] as const
export type VaccinationStatus = (typeof VACCINATION_STATUSES)[number]

/** UI / computed */
export type VaccinationDisplayStatus =
  | 'scheduled'
  | 'overdue'
  | 'completed'
  | 'skipped'

export const SKIP_VACCINATION_REASONS = [
  'Not Available',
  'Flock Sold',
  'Postponed',
  'Not Required',
  'Other',
] as const

export function isoDateToday(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00.000Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Monday 00:00 local of the week containing `d`. */
export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d)
  const day = x.getDay()
  const diff = (day + 6) % 7
  x.setDate(x.getDate() - diff)
  x.setHours(0, 0, 0, 0)
  return x
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addCalendarDays(d: Date, days: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}
