import { createClient } from '@/lib/supabase/server'
import type { Vaccination } from '@/types/database'
import {
  type VaccinationDisplayStatus,
  isoDateToday,
  addDaysIso,
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

export interface VaccinationFilters {
  status?: 'all' | 'scheduled' | 'completed' | 'skipped'
  limit?: number
}

export async function getVaccinations(
  farmId: string,
  filters?: VaccinationFilters
): Promise<Vaccination[]> {
  const supabase = await createClient()

  let q = supabase
    .from('vaccinations')
    .select(
      `id, farm_id, flock_id, vaccine_name, scheduled_date, completed_date, status,
       dosage, method, administered_by, batch_number, notes, skipped_reason,
       inventory_id, quantity_used, created_at, updated_at,
       flocks ( id, batch_number, breed, status, farm_id )`
    )
    .eq('farm_id', farmId)

  const st = filters?.status ?? 'all'
  if (st !== 'all') {
    q = q.eq('status', st)
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
  return (data ?? []) as unknown as Vaccination[]
}

export async function getVaccination(
  vaccinationId: string
): Promise<Vaccination | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vaccinations')
    .select(
      `id, farm_id, flock_id, vaccine_name, scheduled_date, completed_date, status,
       dosage, method, administered_by, batch_number, notes, skipped_reason,
       inventory_id, quantity_used, created_at, updated_at,
       flocks ( id, batch_number, breed, status, farm_id )`
    )
    .eq('id', vaccinationId)
    .maybeSingle()

  if (error || !data) {
    if (error) console.error('[getVaccination]', error.message)
    return null
  }
  return data as unknown as Vaccination
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
  farmId: string
): Promise<Vaccination[]> {
  const today = isoDateToday()
  const end = addDaysIso(today, 6)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vaccinations')
    .select(
      `id, farm_id, flock_id, vaccine_name, scheduled_date, completed_date, status,
       dosage, method, administered_by, batch_number, notes, skipped_reason,
       inventory_id, quantity_used, created_at, updated_at,
       flocks ( id, batch_number, breed, status, farm_id )`
    )
    .eq('farm_id', farmId)
    .eq('status', 'scheduled')
    .gte('scheduled_date', today)
    .lte('scheduled_date', end)
    .order('scheduled_date', { ascending: true })
    .limit(100)

  if (error) {
    console.error('[getUpcomingVaccinations]', error.message)
    return []
  }
  return (data ?? []) as unknown as Vaccination[]
}

export async function getOverdueVaccinations(
  farmId: string
): Promise<Vaccination[]> {
  const today = isoDateToday()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vaccinations')
    .select(
      `id, farm_id, flock_id, vaccine_name, scheduled_date, completed_date, status,
       dosage, method, administered_by, batch_number, notes, skipped_reason,
       inventory_id, quantity_used, created_at, updated_at,
       flocks ( id, batch_number, breed, status, farm_id )`
    )
    .eq('farm_id', farmId)
    .eq('status', 'scheduled')
    .lt('scheduled_date', today)
    .order('scheduled_date', { ascending: true })
    .limit(200)

  if (error) {
    console.error('[getOverdueVaccinations]', error.message)
    return []
  }
  return (data ?? []) as unknown as Vaccination[]
}

export async function getVaccinationsByFlock(
  farmId: string,
  flockId: string
): Promise<Vaccination[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vaccinations')
    .select(
      `id, farm_id, flock_id, vaccine_name, scheduled_date, completed_date, status,
       dosage, method, administered_by, batch_number, notes, skipped_reason,
       inventory_id, quantity_used, created_at, updated_at,
       flocks ( id, batch_number, breed, status, farm_id )`
    )
    .eq('farm_id', farmId)
    .eq('flock_id', flockId)
    .order('scheduled_date', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[getVaccinationsByFlock]', error.message)
    return []
  }
  return (data ?? []) as unknown as Vaccination[]
}

export interface VaccinationSummary {
  upcomingWeekCount: number
  overdueCount: number
  completedThisMonthCount: number
}

export async function getVaccinationSummary(
  farmId: string
): Promise<VaccinationSummary> {
  const supabase = await createClient()
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const monthStart = `${y}-${String(m + 1).padStart(2, '0')}-01`
  const lastDay = new Date(y, m + 1, 0).getDate()
  const monthEnd = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const [upcoming, overdue, completedMonth] = await Promise.all([
    getUpcomingVaccinations(farmId),
    getOverdueVaccinations(farmId),
    supabase
      .from('vaccinations')
      .select('id', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .eq('status', 'completed')
      .gte('completed_date', monthStart)
      .lte('completed_date', monthEnd),
  ])

  return {
    upcomingWeekCount: upcoming.length,
    overdueCount: overdue.length,
    completedThisMonthCount: completedMonth.count ?? 0,
  }
}
