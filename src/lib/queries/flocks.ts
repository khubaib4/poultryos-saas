import { createClient } from '@/lib/supabase/server'
import type { Flock, FlockStats } from '@/types/database'
import { format, subDays } from 'date-fns'

/**
 * All flocks for a specific farm, ordered by newest first.
 */
export async function getFlocks(farmId: string): Promise<Flock[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('flocks')
    .select(
      'id, farm_id, batch_number, breed, initial_count, current_count, age_at_arrival, arrival_date, status, notes, created_at, updated_at'
    )
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as Flock[]
}

export type FlockSortKey = 'newest' | 'oldest' | 'most-birds' | 'best-production'
export type FlockStatusFilter = 'all' | 'active' | 'sold' | 'archived'

export interface FlockMetrics {
  dailyEggs: number
  mortalityRate: number
  feedPerDayKg: number
  productionRatePct: number
  avgEggs7d: number
}

export type FlockManagementRow = Flock & { metrics: FlockMetrics }

export interface FlocksManagementData {
  flocks: FlockManagementRow[]
  totals: {
    totalFlocks: number
    activeFlocks: number
    totalBirds: number
    avgEggsPerBird7d: number
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

/**
 * Flocks list plus lightweight metrics for the management grid.
 * Metrics are computed from the last 7 days of daily_entries.
 */
export async function getFlocksManagementData(
  farmId: string
): Promise<FlocksManagementData> {
  const supabase = await createClient()

  const flocks = await getFlocks(farmId)
  const flockIds = flocks.map((f) => f.id)

  const totals = {
    totalFlocks: flocks.length,
    activeFlocks: flocks.filter((f) => f.status === 'active').length,
    totalBirds: flocks.reduce((s, f) => s + Number(f.current_count ?? 0), 0),
    avgEggsPerBird7d: 0,
  }

  if (!flockIds.length) {
    return { flocks: [], totals }
  }

  const sinceIso = format(subDays(new Date(), 6), 'yyyy-MM-dd')
  const { data: entries } = await supabase
    .from('daily_entries')
    .select('flock_id, date, eggs_collected, deaths, feed_consumed')
    .in('flock_id', flockIds)
    .gte('date', sinceIso)

  type EntryRow = {
    flock_id: string
    date: string
    eggs_collected?: number | null
    deaths?: number | null
    feed_consumed?: number | null
  }

  const byFlock = new Map<
    string,
    { latestDate: string; latestEggs: number; eggsSum: number; days: Set<string>; feedSum: number; feedDays: number }
  >()
  for (const r of (entries ?? []) as EntryRow[]) {
    const id = String(r.flock_id)
    const date = (r.date ?? '').slice(0, 10)
    if (!date) continue
    const eggs = Number(r.eggs_collected ?? 0)
    const feed = r.feed_consumed != null ? Number(r.feed_consumed) : null

    const cur =
      byFlock.get(id) ??
      { latestDate: '', latestEggs: 0, eggsSum: 0, days: new Set<string>(), feedSum: 0, feedDays: 0 }

    cur.eggsSum += eggs
    cur.days.add(date)
    if (feed != null) {
      cur.feedSum += feed
      cur.feedDays += 1
    }
    if (!cur.latestDate || date > cur.latestDate) {
      cur.latestDate = date
      cur.latestEggs = eggs
    }
    byFlock.set(id, cur)
  }

  let eggsPerBirdSum = 0
  let eggsPerBirdCount = 0

  const rows: FlockManagementRow[] = flocks.map((f) => {
    const m = byFlock.get(String(f.id))
    const birds = Number(f.current_count ?? 0)
    const initial = Number(f.initial_count ?? 0)
    const deathsOverall = initial > 0 ? Math.max(0, initial - birds) : 0
    const mortalityRate = initial > 0 ? (deathsOverall / initial) * 100 : 0

    const recordedDays = m?.days.size ?? 0
    const avgEggs7d = recordedDays > 0 ? (m?.eggsSum ?? 0) / recordedDays : 0
    const dailyEggs = m?.latestEggs ?? 0
    const feedPerDayKg = (m?.feedDays ?? 0) > 0 ? (m?.feedSum ?? 0) / (m?.feedDays ?? 1) : 0

    const eggsPerBird = birds > 0 ? avgEggs7d / birds : 0
    const productionRatePct = clamp(Math.round(eggsPerBird * 100), 0, 100)

    if (birds > 0 && avgEggs7d > 0) {
      eggsPerBirdSum += eggsPerBird
      eggsPerBirdCount += 1
    }

    return {
      ...f,
      metrics: {
        dailyEggs: Math.round(dailyEggs),
        mortalityRate: Math.round(mortalityRate * 10) / 10,
        feedPerDayKg: Math.round(feedPerDayKg * 10) / 10,
        productionRatePct,
        avgEggs7d: Math.round(avgEggs7d),
      },
    }
  })

  totals.avgEggsPerBird7d =
    eggsPerBirdCount > 0 ? Math.round((eggsPerBirdSum / eggsPerBirdCount) * 100) / 100 : 0

  return { flocks: rows, totals }
}

/**
 * Flocks with `status === 'active'` for scheduling (vaccinations, etc.).
 */
export async function getActiveFlocks(farmId: string): Promise<Flock[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('flocks')
    .select(
      'id, farm_id, batch_number, breed, initial_count, current_count, age_at_arrival, arrival_date, status, notes, created_at, updated_at'
    )
    .eq('farm_id', farmId)
    .eq('status', 'active')
    .order('batch_number', { ascending: true })

  if (error || !data) return []
  return data as Flock[]
}

/**
 * Active flocks plus a specific flock (e.g. current vaccination target) if missing.
 */
export async function getFlocksForVaccinationForm(
  farmId: string,
  includeFlockId?: string | null
): Promise<Flock[]> {
  const active = await getActiveFlocks(farmId)
  if (!includeFlockId) return active
  if (active.some((f) => f.id === includeFlockId)) return active
  const extra = await getFlock(includeFlockId)
  if (extra && extra.farm_id === farmId) {
    return [extra as Flock, ...active]
  }
  return active
}

/**
 * Single flock by ID (with farm + organization for auth scoping).
 */
export async function getFlock(flockId: string): Promise<Flock | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('flocks')
    .select(
      `id, farm_id, batch_number, breed, initial_count, current_count,
       age_at_arrival, arrival_date, status, notes, created_at, updated_at,
       farms(id, name, organization_id)`
    )
    .eq('id', flockId)
    .single()

  if (error || !data) return null
  return data as unknown as Flock
}

/**
 * Compute stats for a single flock from its daily_entries.
 *
 * mortality_rate = total_deaths / initial_count * 100
 * avg_daily_production = sum(eggs) / number of recorded days
 * age_weeks = (days since arrival + age_at_arrival days) / 7
 */
export async function getFlockStats(flockId: string): Promise<FlockStats> {
  const supabase = await createClient()

  // Get the flock (for initial_count / arrival_date / age_at_arrival)
  const { data: flock } = await supabase
    .from('flocks')
    .select('initial_count, current_count, arrival_date, age_at_arrival')
    .eq('id', flockId)
    .single()

  if (!flock) {
    return {
      current_count: 0,
      total_deaths: 0,
      mortality_rate: 0,
      avg_daily_production: 0,
      age_weeks: 0,
      recorded_days: 0,
    }
  }

  const { data: entries } = await supabase
    .from('daily_entries')
    .select('eggs_collected, deaths')
    .eq('flock_id', flockId)

  const rows = entries ?? []
  const totalDeaths = rows.reduce((s, r) => s + (r.deaths ?? 0), 0)
  const totalEggs = rows.reduce((s, r) => s + (r.eggs_collected ?? 0), 0)
  const recordedDays = rows.length
  const avgDaily = recordedDays > 0 ? totalEggs / recordedDays : 0

  const arrival = new Date(flock.arrival_date)
  const now = new Date()
  const daysSinceArrival = Math.max(
    0,
    Math.floor((now.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24))
  )
  const ageDays = daysSinceArrival + (flock.age_at_arrival ?? 0)
  const ageWeeks = Math.floor(ageDays / 7)

  const initial = flock.initial_count ?? 0
  const mortalityRate = initial > 0 ? (totalDeaths / initial) * 100 : 0

  return {
    current_count: flock.current_count ?? 0,
    total_deaths: totalDeaths,
    mortality_rate: Math.round(mortalityRate * 10) / 10,
    avg_daily_production: Math.round(avgDaily * 10) / 10,
    age_weeks: ageWeeks,
    recorded_days: recordedDays,
  }
}

/**
 * Last N daily entries for a flock.
 */
export async function getFlockRecentEntries(flockId: string, limit = 7) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('daily_entries')
    .select('id, date, eggs_collected, deaths, feed_consumed, notes')
    .eq('flock_id', flockId)
    .order('date', { ascending: false })
    .limit(limit)

  return data ?? []
}

/**
 * Suggest the next batch number for a farm in the form BATCH-YYYY-NNN.
 * NNN is the count of flocks for this farm in the current year + 1, zero-padded.
 */
export async function suggestBatchNumber(farmId: string): Promise<string> {
  const supabase = await createClient()
  const year = new Date().getFullYear()
  const yearStart = `${year}-01-01`
  const yearEnd = `${year + 1}-01-01`

  const { count } = await supabase
    .from('flocks')
    .select('*', { count: 'exact', head: true })
    .eq('farm_id', farmId)
    .gte('created_at', yearStart)
    .lt('created_at', yearEnd)

  const next = (count ?? 0) + 1
  return `BATCH-${year}-${String(next).padStart(3, '0')}`
}
