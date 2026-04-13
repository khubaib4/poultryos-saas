import { createClient } from '@/lib/supabase/server'
import type { DailyEntry } from '@/types/database'

const ENTRY_SELECT = `
  id,
  flock_id,
  date,
  eggs_collected,
  eggs_grade_a,
  eggs_grade_b,
  eggs_cracked,
  deaths,
  death_cause,
  feed_consumed,
  notes,
  created_at,
  flocks (
    id,
    batch_number,
    farm_id
  )
` as const

/**
 * List view select (no join).
 *
 * Note: In some RLS setups, embedding `flocks(...)` can fail even when the
 * base `daily_entries` rows are accessible. The list pages can join client-side
 * using the already-fetched flocks list.
 */
const ENTRY_LIST_SELECT = `
  id,
  flock_id,
  date,
  eggs_collected,
  eggs_grade_a,
  eggs_grade_b,
  eggs_cracked,
  deaths,
  death_cause,
  feed_consumed,
  notes,
  created_at
` as const

export interface DailyEntriesFilters {
  startDate?: string
  endDate?: string
  flockId?: string
}

export type DailyEntryWithFlock = DailyEntry & {
  flocks: { id: string; batch_number: string; farm_id: string }
}

export type DailyEntryListRow = DailyEntry

async function flockIdsForFarm(farmId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('flocks')
    .select('id')
    .eq('farm_id', farmId)

  return (data ?? []).map((r) => r.id)
}

/**
 * List daily entries for a farm, newest date first.
 * Optional date range (inclusive) and flock filter.
 */
export async function getDailyEntries(
  farmId: string,
  filters?: DailyEntriesFilters
): Promise<DailyEntryWithFlock[]> {
  const supabase = await createClient()
  const ids = await flockIdsForFarm(farmId)
  if (ids.length === 0) return []

  let q = supabase
    .from('daily_entries')
    .select(ENTRY_SELECT)
    .in('flock_id', ids)
    .order('date', { ascending: false })

  if (filters?.startDate) {
    q = q.gte('date', filters.startDate)
  }
  if (filters?.endDate) {
    q = q.lte('date', filters.endDate)
  }
  if (filters?.flockId) {
    q = q.eq('flock_id', filters.flockId)
  }

  const { data, error } = await q
  if (error || !data) return []
  return data as unknown as DailyEntryWithFlock[]
}

/**
 * List daily entries for a farm, newest date first, without embedding `flocks`.
 */
export async function getDailyEntriesList(
  farmId: string,
  filters?: DailyEntriesFilters
): Promise<DailyEntryListRow[]> {
  const supabase = await createClient()
  const ids = await flockIdsForFarm(farmId)
  if (ids.length === 0) return []

  let q = supabase
    .from('daily_entries')
    .select(ENTRY_LIST_SELECT)
    .in('flock_id', ids)
    .order('date', { ascending: false })

  if (filters?.startDate) {
    q = q.gte('date', filters.startDate)
  }
  if (filters?.endDate) {
    q = q.lte('date', filters.endDate)
  }
  if (filters?.flockId) {
    q = q.eq('flock_id', filters.flockId)
  }

  const { data, error } = await q
  if (error || !data) return []
  return data as unknown as DailyEntryListRow[]
}

/**
 * Single entry by id with flock + farm_id for authorization.
 */
export async function getDailyEntry(
  entryId: string
): Promise<DailyEntryWithFlock | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('daily_entries')
    .select(ENTRY_SELECT)
    .eq('id', entryId)
    .maybeSingle()

  if (error || !data) return null
  return data as unknown as DailyEntryWithFlock
}

export interface DailyEntrySummary {
  totalEggs: number
  totalDeaths: number
  totalFeed: number
  entryCount: number
}

/**
 * Aggregate totals for entries in the date range (and optional flock).
 */
export async function getDailyEntrySummary(
  farmId: string,
  startDate: string,
  endDate: string,
  flockId?: string
): Promise<DailyEntrySummary> {
  const supabase = await createClient()

  const ids = await flockIdsForFarm(farmId)
  if (ids.length === 0) {
    return {
      totalEggs: 0,
      totalDeaths: 0,
      totalFeed: 0,
      entryCount: 0,
    }
  }

  let q = supabase
    .from('daily_entries')
    .select('eggs_collected, deaths, feed_consumed')
    .in('flock_id', ids)
    .gte('date', startDate)
    .lte('date', endDate)

  if (flockId) {
    q = q.eq('flock_id', flockId)
  }

  const { data, error } = await q
  if (error || !data) {
    return {
      totalEggs: 0,
      totalDeaths: 0,
      totalFeed: 0,
      entryCount: 0,
    }
  }

  return {
    totalEggs: data.reduce((s, r) => s + (r.eggs_collected ?? 0), 0),
    totalDeaths: data.reduce((s, r) => s + (r.deaths ?? 0), 0),
    totalFeed: data.reduce((s, r) => s + (Number(r.feed_consumed) || 0), 0),
    entryCount: data.length,
  }
}

/**
 * Whether a row already exists for this flock + calendar date.
 */
export async function checkEntryExists(
  flockId: string,
  date: string,
  excludeEntryId?: string
): Promise<boolean> {
  const supabase = await createClient()

  let q = supabase
    .from('daily_entries')
    .select('id')
    .eq('flock_id', flockId)
    .eq('date', date)
    .limit(1)

  if (excludeEntryId) {
    q = q.neq('id', excludeEntryId)
  }

  const { data } = await q
  return (data?.length ?? 0) > 0
}
