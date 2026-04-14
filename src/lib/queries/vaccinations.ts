import { createClient } from '@/lib/supabase/server'
import type { Vaccination } from '@/types/database'

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

/** Vaccination row columns only — flock data is loaded via {@link attachFlocksToVaccinations}. */
const vaccinationColumns = `id, farm_id, flock_id, vaccine_name, scheduled_date, completed_date, status,
       dosage, method, administered_by, batch_number, notes, skipped_reason,
       inventory_id, quantity_used, created_at, updated_at`

async function attachFlocksToVaccinations(
  supabase: ServerSupabase,
  rows: Vaccination[]
): Promise<Vaccination[]> {
  if (rows.length === 0) return rows
  const ids = [...new Set(rows.map((r) => r.flock_id).filter(Boolean))]
  if (ids.length === 0) return rows

  const { data: flockRows, error } = await supabase
    .from('flocks')
    .select('id, batch_number, breed, status, farm_id, current_count')
    .in('id', ids)

  if (error) {
    console.error('[attachFlocksToVaccinations]', error.message)
    return rows
  }

  const map = new Map(
    (flockRows ?? []).map((f) => [f.id, f as NonNullable<Vaccination['flocks']>])
  )
  return rows.map((r) => ({
    ...r,
    flocks: map.get(r.flock_id) ?? r.flocks,
  }))
}
import {
  type VaccinationDisplayStatus,
  isoDateToday,
  addDaysIso,
  addCalendarDays,
  startOfWeekMonday,
  toIsoDate,
} from '@/lib/vaccination-constants'

export {
  COMMON_VACCINES,
  VACCINATION_METHODS,
  VACCINATION_STATUSES,
  SKIP_VACCINATION_REASONS,
  isoDateToday,
  addDaysIso,
} from '@/lib/vaccination-constants'

/** For display badges: overdue if still scheduled and date is in the past. */
export function getVaccinationDisplayStatus(
  row: Pick<Vaccination, 'status' | 'scheduled_date'>
): VaccinationDisplayStatus {
  const s = (row.status ?? '').toLowerCase()
  if (s === 'completed') return 'completed'
  if (s === 'skipped') return 'skipped'
  const sched = row.scheduled_date?.slice(0, 10) ?? ''
  if (sched && sched < isoDateToday()) return 'overdue'
  return 'scheduled'
}

export type VaccinationStatusTab =
  | 'all'
  | 'scheduled'
  | 'completed'
  | 'overdue'
  | 'skipped'

export interface VaccinationFilters {
  /** Legacy alias */
  status?: 'all' | 'scheduled' | 'completed' | 'skipped'
  statusTab?: VaccinationStatusTab
  /** Filter by flock */
  flockId?: string
  limit?: number
}

function resolveStatusTab(f?: VaccinationFilters): VaccinationStatusTab {
  if (f?.statusTab) return f.statusTab
  const s = f?.status
  if (!s || s === 'all') return 'all'
  if (s === 'scheduled') return 'scheduled'
  if (s === 'completed') return 'completed'
  if (s === 'skipped') return 'skipped'
  if (s === 'overdue') return 'overdue'
  return 'all'
}

export async function getVaccinations(
  farmId: string,
  filters?: VaccinationFilters
): Promise<Vaccination[]> {
  const supabase = await createClient()
  const today = isoDateToday()

  let q = supabase.from('vaccinations').select(vaccinationColumns).eq('farm_id', farmId)

  const tab = resolveStatusTab(filters)
  if (tab === 'completed') {
    q = q.eq('status', 'completed')
  } else if (tab === 'skipped') {
    q = q.eq('status', 'skipped')
  } else if (tab === 'scheduled') {
    q = q
      .eq('status', 'scheduled')
      .gte('scheduled_date', today)
  } else if (tab === 'overdue') {
    q = q.eq('status', 'scheduled').lt('scheduled_date', today)
  }

  if (filters?.flockId) {
    q = q.eq('flock_id', filters.flockId)
  }

  if (filters?.limit) {
    q = q.limit(filters.limit)
  } else {
    q = q.limit(500)
  }

  q = q
    .order('scheduled_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  const { data, error } = await q
  if (error) {
    console.error('[getVaccinations]', error.message)
    return []
  }
  return attachFlocksToVaccinations(
    supabase,
    (data ?? []) as unknown as Vaccination[]
  )
}

export async function getVaccination(
  vaccinationId: string
): Promise<Vaccination | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vaccinations')
    .select(vaccinationColumns)
    .eq('id', vaccinationId)
    .maybeSingle()

  if (error || !data) {
    if (error) console.error('[getVaccination]', error.message)
    return null
  }
  const [row] = await attachFlocksToVaccinations(supabase, [data as unknown as Vaccination])
  return row ?? null
}

export async function getVaccinationForFarm(
  vaccinationId: string,
  farmId: string
): Promise<Vaccination | null> {
  const row = await getVaccination(vaccinationId)
  if (!row || row.farm_id !== farmId) return null
  return row
}

export async function getUpcomingVaccinations(
  farmId: string,
  flockId?: string
): Promise<Vaccination[]> {
  const today = isoDateToday()
  const end = addDaysIso(today, 6)
  const supabase = await createClient()

  let q = supabase
    .from('vaccinations')
    .select(vaccinationColumns)
    .eq('farm_id', farmId)
    .eq('status', 'scheduled')
    .gte('scheduled_date', today)
    .lte('scheduled_date', end)
  if (flockId) q = q.eq('flock_id', flockId)
  const { data, error } = await q.order('scheduled_date', { ascending: true }).limit(100)

  if (error) {
    console.error('[getUpcomingVaccinations]', error.message)
    return []
  }
  return attachFlocksToVaccinations(supabase, (data ?? []) as unknown as Vaccination[])
}

/** Overdue + next 7 days (scheduled only), sorted for sidebar. */
export async function getUpcomingPanelVaccinations(
  farmId: string,
  arg2: number | { limit?: number; flockId?: string } = 10
): Promise<Vaccination[]> {
  const limit = typeof arg2 === 'number' ? arg2 : (arg2.limit ?? 10)
  const flockId = typeof arg2 === 'object' ? arg2.flockId : undefined
  const today = isoDateToday()
  const end = addDaysIso(today, 7)
  const supabase = await createClient()

  let q = supabase
    .from('vaccinations')
    .select(vaccinationColumns)
    .eq('farm_id', farmId)
    .eq('status', 'scheduled')
    .lte('scheduled_date', end)
  if (flockId) q = q.eq('flock_id', flockId)
  const { data, error } = await q.order('scheduled_date', { ascending: true }).limit(200)

  if (error) {
    console.error('[getUpcomingPanelVaccinations]', error.message)
    return []
  }
  const rows = await attachFlocksToVaccinations(
    supabase,
    (data ?? []) as unknown as Vaccination[]
  )
  rows.sort((a, b) => {
    const da = a.scheduled_date?.slice(0, 10) ?? ''
    const db = b.scheduled_date?.slice(0, 10) ?? ''
    const oa = da < today ? 0 : 1
    const ob = db < today ? 0 : 1
    if (oa !== ob) return oa - ob
    return da.localeCompare(db)
  })
  return rows.slice(0, limit)
}

export async function getOverdueVaccinations(
  farmId: string,
  flockId?: string
): Promise<Vaccination[]> {
  const today = isoDateToday()
  const supabase = await createClient()

  let q = supabase
    .from('vaccinations')
    .select(vaccinationColumns)
    .eq('farm_id', farmId)
    .eq('status', 'scheduled')
    .lt('scheduled_date', today)
  if (flockId) q = q.eq('flock_id', flockId)
  const { data, error } = await q.order('scheduled_date', { ascending: true }).limit(200)

  if (error) {
    console.error('[getOverdueVaccinations]', error.message)
    return []
  }
  return attachFlocksToVaccinations(supabase, (data ?? []) as unknown as Vaccination[])
}

export async function getVaccinationsByFlock(
  farmId: string,
  flockId: string
): Promise<Vaccination[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vaccinations')
    .select(vaccinationColumns)
    .eq('farm_id', farmId)
    .eq('flock_id', flockId)
    .order('scheduled_date', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[getVaccinationsByFlock]', error.message)
    return []
  }
  return attachFlocksToVaccinations(supabase, (data ?? []) as unknown as Vaccination[])
}

export interface VaccinationSummary {
  /** All scheduled (includes overdue). */
  totalScheduled: number
  upcomingWeekCount: number
  overdueCount: number
  completedThisMonthCount: number
}

export async function getVaccinationSummary(
  farmId: string,
  flockId?: string
): Promise<VaccinationSummary> {
  const supabase = await createClient()
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const monthStart = `${y}-${String(m + 1).padStart(2, '0')}-01`
  const lastDay = new Date(y, m + 1, 0).getDate()
  const monthEnd = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  let totalQ = supabase
    .from('vaccinations')
    .select('id', { count: 'exact', head: true })
    .eq('farm_id', farmId)
    .eq('status', 'scheduled')
  if (flockId) totalQ = totalQ.eq('flock_id', flockId)

  let completedQ = supabase
    .from('vaccinations')
    .select('id', { count: 'exact', head: true })
    .eq('farm_id', farmId)
    .eq('status', 'completed')
    .gte('completed_date', monthStart)
    .lte('completed_date', monthEnd)
  if (flockId) completedQ = completedQ.eq('flock_id', flockId)

  const [totalScheduled, upcoming, overdue, completedMonth] = await Promise.all([
    totalQ,
    getUpcomingVaccinations(farmId, flockId),
    getOverdueVaccinations(farmId, flockId),
    completedQ,
  ])

  return {
    totalScheduled: totalScheduled.count ?? 0,
    upcomingWeekCount: upcoming.length,
    overdueCount: overdue.length,
    completedThisMonthCount: completedMonth.count ?? 0,
  }
}

export function getOverdueCount(
  farmId: string,
  flockId?: string
): Promise<number> {
  return getOverdueVaccinations(farmId, flockId).then((r) => r.length)
}

export interface TimelineVaccination {
  id: string
  vaccine_name: string
  scheduled_date: string
  status: string
  displayStatus: VaccinationDisplayStatus
  flock_batch?: string | null
  notes?: string | null
}

function toTimelineRow(v: Vaccination): TimelineVaccination {
  return {
    id: v.id,
    vaccine_name: v.vaccine_name,
    scheduled_date: v.scheduled_date?.slice(0, 10) ?? '',
    status: v.status,
    displayStatus: getVaccinationDisplayStatus(v),
    flock_batch: v.flocks?.batch_number ?? null,
    notes: v.notes,
  }
}

/** Vaccinations whose scheduled_date falls in [start, end] (inclusive). */
export async function getVaccinationsForTimeline(
  farmId: string,
  rangeStart: string,
  rangeEnd: string,
  flockId?: string
): Promise<TimelineVaccination[]> {
  const supabase = await createClient()
  let q = supabase
    .from('vaccinations')
    .select(vaccinationColumns)
    .eq('farm_id', farmId)
    .gte('scheduled_date', rangeStart)
    .lte('scheduled_date', rangeEnd)
  if (flockId) q = q.eq('flock_id', flockId)
  const { data, error } = await q.order('scheduled_date', { ascending: true }).limit(400)

  if (error) {
    console.error('[getVaccinationsForTimeline]', error.message)
    return []
  }
  const withFlocks = await attachFlocksToVaccinations(
    supabase,
    (data ?? []) as unknown as Vaccination[]
  )
  return withFlocks.map(toTimelineRow)
}

/** Default two-week window starting Monday of current week. */
export function getDefaultTimelineRange(): { start: string; end: string } {
  const mon = startOfWeekMonday(new Date())
  const endD = addCalendarDays(mon, 13)
  return { start: toIsoDate(mon), end: toIsoDate(endD) }
}

export async function getVaccinationSpotlight(
  farmId: string,
  flockId?: string
): Promise<{ completed: Vaccination | null; scheduled: Vaccination | null }> {
  const supabase = await createClient()
  const today = isoDateToday()

  let doneQ = supabase
    .from('vaccinations')
    .select(vaccinationColumns)
    .eq('farm_id', farmId)
    .eq('status', 'completed')
    .not('completed_date', 'is', null)
  if (flockId) doneQ = doneQ.eq('flock_id', flockId)

  let schedQ = supabase
    .from('vaccinations')
    .select(vaccinationColumns)
    .eq('farm_id', farmId)
    .eq('status', 'scheduled')
    .gte('scheduled_date', today)
  if (flockId) schedQ = schedQ.eq('flock_id', flockId)

  const [{ data: done }, { data: sched }] = await Promise.all([
    doneQ.order('completed_date', { ascending: false }).limit(1).maybeSingle(),
    schedQ.order('scheduled_date', { ascending: true }).limit(1).maybeSingle(),
  ])

  const toEnrich: Vaccination[] = []
  if (done) toEnrich.push(done as unknown as Vaccination)
  if (sched) toEnrich.push(sched as unknown as Vaccination)
  const enriched = await attachFlocksToVaccinations(supabase, toEnrich)
  let i = 0
  return {
    completed: done ? (enriched[i++] ?? null) : null,
    scheduled: sched ? (enriched[i++] ?? null) : null,
  }
}

export const getVaccinationStats = getVaccinationSummary
