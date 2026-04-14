import { createClient } from '@/lib/supabase/server'
import { getFarmStats } from '@/lib/queries/farms'
import { getInventorySummary, getLowStockItems } from '@/lib/queries/inventory'
import {
  getOverdueVaccinations,
  getUpcomingVaccinations,
} from '@/lib/queries/vaccinations'
import { format, startOfWeek, subDays } from 'date-fns'

const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const

export type TrendPeriod = '1w' | '1m' | '3m' | '6m'

function periodDays(period: TrendPeriod): number {
  if (period === '1m') return 30
  if (period === '3m') return 90
  if (period === '6m') return 180
  return 7
}

function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Monday 00:00 local of the week containing `d`. */
function mondayOfWeek(d = new Date()): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = copy.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  copy.setDate(copy.getDate() + diff)
  return copy
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
  return x
}

// ─────────────────────────────────────────────────────────────
// New dashboard stats + trend queries
// ─────────────────────────────────────────────────────────────

export async function getTotalDeaths(
  farmId: string,
  from?: Date,
  to?: Date
): Promise<number> {
  const supabase = await createClient()
  const fromDate = from ?? startOfWeek(new Date(), { weekStartsOn: 1 })
  const toDate = to ?? new Date()
  const fromIso = format(fromDate, 'yyyy-MM-dd')
  const toIso = format(toDate, 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('daily_entries')
    .select('date, deaths')
    .eq('farm_id', farmId)
    .gte('date', fromIso)
    .lte('date', toIso)

  if (error) {
    console.error('[getTotalDeaths]', error.message)
    return 0
  }
  return (data ?? []).reduce(
    (sum, r) => sum + Number((r as { deaths?: number | null }).deaths ?? 0),
    0
  )
}

export async function getLiveBirdsCount(farmId: string): Promise<number> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('flocks')
    .select('current_count')
    .eq('farm_id', farmId)
    .eq('status', 'active')

  if (error) {
    console.error('[getLiveBirdsCount]', error.message)
    return 0
  }
  return (data ?? []).reduce(
    (sum, r) =>
      sum + Number((r as { current_count?: number | null }).current_count ?? 0),
    0
  )
}

function groupByIsoDay<T extends { date: string }>(
  rows: T[],
  pick: (row: T) => number
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    const d = String(r.date).slice(0, 10)
    if (!d) continue
    out[d] = (out[d] ?? 0) + pick(r)
  }
  return out
}

function buildRangeDays(days: number): string[] {
  const out: string[] = []
  const end = new Date()
  for (let i = days - 1; i >= 0; i--) {
    out.push(format(subDays(end, i), 'yyyy-MM-dd'))
  }
  return out
}

export async function getDeathsTrend(
  farmId: string,
  period: TrendPeriod
): Promise<{ date: string; value: number }[]> {
  const supabase = await createClient()
  const days = periodDays(period)
  const fromIso = format(subDays(new Date(), days - 1), 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('daily_entries')
    .select('date, deaths')
    .eq('farm_id', farmId)
    .gte('date', fromIso)
    .order('date', { ascending: true })

  if (error) {
    console.error('[getDeathsTrend]', error.message)
    return []
  }
  const grouped = groupByIsoDay(
    (data ?? []) as { date: string; deaths?: number | null }[],
    (r) => Number((r as { deaths?: number | null }).deaths ?? 0)
  )
  return buildRangeDays(days).map((date) => ({
    date,
    value: grouped[date] ?? 0,
  }))
}

export async function getEggsTrend(
  farmId: string,
  period: TrendPeriod
): Promise<{ date: string; value: number }[]> {
  const supabase = await createClient()
  const days = periodDays(period)
  const fromIso = format(subDays(new Date(), days - 1), 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('daily_entries')
    .select('date, eggs_collected')
    .eq('farm_id', farmId)
    .gte('date', fromIso)
    .order('date', { ascending: true })

  if (error) {
    console.error('[getEggsTrend]', error.message)
    return []
  }
  const grouped = groupByIsoDay(
    (data ?? []) as { date: string; eggs_collected?: number | null }[],
    (r) => Number((r as { eggs_collected?: number | null }).eggs_collected ?? 0)
  )
  return buildRangeDays(days).map((date) => ({
    date,
    value: grouped[date] ?? 0,
  }))
}

export async function getSalesTrend(
  farmId: string,
  period: TrendPeriod
): Promise<{ date: string; value: number }[]> {
  const supabase = await createClient()
  const days = periodDays(period)
  const fromIso = format(subDays(new Date(), days - 1), 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('sales')
    .select('sale_date, total_amount, amount')
    .eq('farm_id', farmId)
    .gte('sale_date', fromIso)
    .order('sale_date', { ascending: true })

  if (error) {
    console.error('[getSalesTrend]', error.message)
    return []
  }

  const grouped: Record<string, number> = {}
  for (const r of data ?? []) {
    const d = String((r as { sale_date?: string | null }).sale_date ?? '').slice(0, 10)
    if (!d) continue
    const row = r as { total_amount?: number | null; amount?: number | null }
    grouped[d] = (grouped[d] ?? 0) + Number(row.total_amount ?? row.amount ?? 0)
  }

  return buildRangeDays(days).map((date) => ({
    date,
    value: grouped[date] ?? 0,
  }))
}

export async function getLiveBirdsTrend(
  farmId: string,
  period: TrendPeriod
): Promise<{ date: string; value: number }[]> {
  const supabase = await createClient()
  const days = periodDays(period)
  const fromIso = format(subDays(new Date(), days - 1), 'yyyy-MM-dd')

  // Current total (active flocks)
  const currentTotal = await getLiveBirdsCount(farmId)

  // Deaths per day in window (for working backwards)
  const { data, error } = await supabase
    .from('daily_entries')
    .select('date, deaths')
    .eq('farm_id', farmId)
    .gte('date', fromIso)
    .order('date', { ascending: false })

  if (error) {
    console.error('[getLiveBirdsTrend] daily_entries', error.message)
  }

  const deathsByDate = groupByIsoDay(
    (data ?? []) as { date: string; deaths?: number | null }[],
    (r) => Number((r as { deaths?: number | null }).deaths ?? 0)
  )

  let running = currentTotal
  const trend: { date: string; value: number }[] = []
  const daysList = buildRangeDays(days)
  for (let i = daysList.length - 1; i >= 0; i--) {
    const date = daysList[i]!
    trend.unshift({ date, value: running })
    // Add back deaths to estimate previous day live birds
    running += deathsByDate[date] ?? 0
  }
  return trend
}

export interface FarmWeeklyEggPoint {
  name: (typeof WEEKDAY_LABELS)[number]
  eggs: number
  date: string
}

/** Seven points (Mon–Sun) for the current local week; missing days are 0. */
export async function getFarmCurrentWeekEggSeries(
  farmId: string,
): Promise<FarmWeeklyEggPoint[]> {
  const supabase = await createClient()
  const mon = mondayOfWeek()
  const start = isoDate(mon)
  const end = isoDate(addDays(mon, 6))

  const { data: flocks } = await supabase
    .from('flocks')
    .select('id')
    .eq('farm_id', farmId)

  if (!flocks?.length) {
    return WEEKDAY_LABELS.map((name, i) => ({
      name,
      eggs: 0,
      date: isoDate(addDays(mon, i)),
    }))
  }

  const flockIds = flocks.map((f) => f.id)
  const { data: rows } = await supabase
    .from('daily_entries')
    .select('date, eggs_collected')
    .in('flock_id', flockIds)
    .gte('date', start)
    .lte('date', end)

  const byDate = new Map<string, number>()
  for (const r of rows ?? []) {
    const d = (r as { date: string }).date
    if (!d) continue
    byDate.set(
      d,
      (byDate.get(d) ?? 0) + Number((r as { eggs_collected?: number | null }).eggs_collected ?? 0),
    )
  }

  return WEEKDAY_LABELS.map((name, i) => {
    const date = isoDate(addDays(mon, i))
    return { name, eggs: byDate.get(date) ?? 0, date }
  })
}

async function sumEggsInRange(
  farmId: string,
  fromIso: string,
  toIso: string,
): Promise<number> {
  const supabase = await createClient()
  const { data: flocks } = await supabase
    .from('flocks')
    .select('id')
    .eq('farm_id', farmId)

  if (!flocks?.length) return 0
  const flockIds = flocks.map((f) => f.id)
  const { data: rows } = await supabase
    .from('daily_entries')
    .select('eggs_collected')
    .in('flock_id', flockIds)
    .gte('date', fromIso)
    .lte('date', toIso)

  return (rows ?? []).reduce(
    (s, r) => s + Number((r as { eggs_collected?: number | null }).eggs_collected ?? 0),
    0,
  )
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null
  return ((current - previous) / previous) * 100
}

async function sumSalesOnDate(farmId: string, dateIso: string): Promise<number> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sales')
    .select('total_amount, amount')
    .eq('farm_id', farmId)
    .eq('sale_date', dateIso)

  if (error || !data?.length) return 0
  return data.reduce((s, r) => {
    const row = r as { total_amount?: number | null; amount?: number | null }
    return s + Number(row.total_amount ?? row.amount ?? 0)
  }, 0)
}

export interface FarmDashboardVitalInsight {
  id: string
  kind: 'warning' | 'success' | 'info'
  /** Visual icon in the alert row */
  icon: 'warning' | 'syringe' | 'chart' | 'info'
  title: string
  description: string
}

export async function buildFarmVitalInsights(
  farmId: string,
  todayEggs: number,
  avgEggsLast7ExcludingToday: number,
): Promise<FarmDashboardVitalInsight[]> {
  const insights: FarmDashboardVitalInsight[] = []

  const [lowStock, upcoming, overdue] = await Promise.all([
    getLowStockItems(farmId),
    getUpcomingVaccinations(farmId),
    getOverdueVaccinations(farmId),
  ])

  const feedLike = lowStock.find((it) =>
    /feed|meal|silo|mash|concentrate|fodder/i.test(
      `${it.name ?? ''} ${it.type ?? ''}`,
    ),
  )
  const firstLow = feedLike ?? lowStock[0]

  if (firstLow) {
    const stock = Number(firstLow.current_stock ?? 0)
    const min = Number(firstLow.min_stock ?? 1)
    const pct = min > 0 ? Math.round((stock / min) * 100) : 0
    insights.push({
      id: 'low-stock',
      kind: 'warning',
      icon: 'warning',
      title: feedLike ? 'Low feed warning' : 'Low stock warning',
      description: feedLike
        ? `${firstLow.name} is at ${pct}% of minimum target. Restock soon to avoid disruption.`
        : `${firstLow.name} is below minimum (${stock} ${firstLow.unit ?? 'units'} on hand).`,
    })
  }

  const vax = overdue[0] ?? upcoming[0]
  if (vax) {
    const batch = vax.flocks?.batch_number ?? 'Flock'
    const when = vax.scheduled_date
      ? new Date(`${vax.scheduled_date}T12:00:00`).toLocaleDateString('en-PK', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })
      : 'soon'
    insights.push({
      id: `vax-${vax.id}`,
      kind: overdue.length ? 'warning' : 'success',
      icon: 'syringe',
      title: overdue.length ? 'Vaccination overdue' : 'Vaccination due',
      description: `${batch} — ${vax.vaccine_name ?? 'Vaccination'} ${overdue.length ? 'was scheduled' : 'is scheduled'} for ${when}.`,
    })
  }

  if (avgEggsLast7ExcludingToday > 0 && todayEggs >= 0) {
    const diffPct = ((todayEggs - avgEggsLast7ExcludingToday) / avgEggsLast7ExcludingToday) * 100
    if (diffPct >= 1 || diffPct <= -1) {
      insights.push({
        id: 'efficiency',
        kind: 'success',
        icon: 'chart',
        title: diffPct >= 0 ? 'Efficiency peak' : 'Production note',
        description:
          diffPct >= 0
            ? `Egg collection is up ${diffPct.toFixed(1)}% today vs your 7-day average.`
            : `Egg collection is ${Math.abs(diffPct).toFixed(1)}% below your 7-day average today.`,
      })
    }
  }

  if (insights.length === 0) {
    insights.push({
      id: 'all-clear',
      kind: 'info',
      icon: 'info',
      title: 'All clear',
      description:
        'No urgent alerts. Keep logging daily entries and sales for richer insights.',
    })
  }

  return insights.slice(0, 5)
}

async function avgEggsLastNDays(farmId: string, days: number, excludeToday: boolean): Promise<number> {
  const supabase = await createClient()
  const end = new Date()
  if (excludeToday) end.setDate(end.getDate() - 1)
  const start = new Date(end)
  start.setDate(start.getDate() - (days - 1))
  const from = isoDate(start)
  const to = isoDate(end)

  const { data: flocks } = await supabase
    .from('flocks')
    .select('id')
    .eq('farm_id', farmId)

  if (!flocks?.length) return 0
  const flockIds = flocks.map((f) => f.id)
  const { data: rows } = await supabase
    .from('daily_entries')
    .select('date, eggs_collected')
    .in('flock_id', flockIds)
    .gte('date', from)
    .lte('date', to)

  const byDate = new Map<string, number>()
  for (const r of rows ?? []) {
    const d = (r as { date: string }).date
    if (!d) continue
    byDate.set(
      d,
      (byDate.get(d) ?? 0) + Number((r as { eggs_collected?: number | null }).eggs_collected ?? 0),
    )
  }
  const vals = [...byDate.values()]
  if (!vals.length) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export interface FarmDashboardPack {
  stats: Awaited<ReturnType<typeof getFarmStats>>
  weeklyEggs: FarmWeeklyEggPoint[]
  eggsWeekTotal: number
  deathsWeekTotal: number
  eggsWeekTrendPct: number | null
  eggsTrendDirection: 'up' | 'down' | 'steady'
  deathsWeekTrendPct: number | null
  deathsTrendDirection: 'up' | 'down' | 'steady'
  salesToday: number
  salesTrendPct: number | null
  salesTrendDirection: 'up' | 'down' | 'steady'
  liveBirdsCount: number
  lowStockCount: number
  vitalInsights: FarmDashboardVitalInsight[]
}

export async function getFarmDashboardPack(
  farmId: string,
  organizationId: string,
): Promise<FarmDashboardPack> {
  const mon = mondayOfWeek()
  const thisStart = isoDate(mon)
  const thisEnd = isoDate(addDays(mon, 6))
  const prevMon = addDays(mon, -7)
  const prevStart = isoDate(prevMon)
  const prevEnd = isoDate(addDays(prevMon, 6))

  const today = isoDate(new Date())
  const y = new Date()
  y.setDate(y.getDate() - 1)
  const yesterday = isoDate(y)

  const [
    stats,
    weeklyEggs,
    eggsThisWeek,
    eggsPrevWeek,
    deathsThisWeek,
    deathsPrevWeek,
    salesToday,
    salesYesterday,
    liveBirdsCount,
    invSummary,
    avg7,
  ] = await Promise.all([
    getFarmStats(farmId, organizationId),
    getFarmCurrentWeekEggSeries(farmId),
    sumEggsInRange(farmId, thisStart, thisEnd),
    sumEggsInRange(farmId, prevStart, prevEnd),
    getTotalDeaths(farmId, new Date(thisStart + 'T12:00:00'), new Date(thisEnd + 'T12:00:00')),
    getTotalDeaths(farmId, new Date(prevStart + 'T12:00:00'), new Date(prevEnd + 'T12:00:00')),
    sumSalesOnDate(farmId, today),
    sumSalesOnDate(farmId, yesterday),
    getLiveBirdsCount(farmId),
    getInventorySummary(farmId),
    avgEggsLastNDays(farmId, 7, true),
  ])

  const eggsWeekTrendPct = pctChange(eggsThisWeek, eggsPrevWeek)
  const salesTrendPct = pctChange(salesToday, salesYesterday)
  const deathsWeekTrendPct = pctChange(deathsThisWeek, deathsPrevWeek)

  const eggsTrendDirection: 'up' | 'down' | 'steady' =
    eggsWeekTrendPct == null || Math.abs(eggsWeekTrendPct) < 0.5
      ? 'steady'
      : eggsWeekTrendPct > 0
        ? 'up'
        : 'down'

  // For deaths, lower is better; treat higher deaths as “down”
  const deathsTrendDirection: 'up' | 'down' | 'steady' =
    deathsWeekTrendPct == null || Math.abs(deathsWeekTrendPct) < 0.5
      ? 'steady'
      : deathsWeekTrendPct <= 0
        ? 'up'
        : 'down'

  const salesTrendDirection: 'up' | 'down' | 'steady' =
    salesTrendPct == null || Math.abs(salesTrendPct) < 0.5
      ? 'steady'
      : salesTrendPct > 0
        ? 'up'
        : 'down'

  const vitalInsights = await buildFarmVitalInsights(
    farmId,
    stats.today_eggs,
    avg7,
  )

  return {
    stats,
    weeklyEggs,
    eggsWeekTotal: eggsThisWeek,
    deathsWeekTotal: deathsThisWeek,
    eggsWeekTrendPct,
    eggsTrendDirection,
    deathsWeekTrendPct,
    deathsTrendDirection,
    salesToday,
    salesTrendPct,
    salesTrendDirection,
    liveBirdsCount,
    lowStockCount: invSummary.lowStockCount + invSummary.outOfStockCount,
    vitalInsights,
  }
}
