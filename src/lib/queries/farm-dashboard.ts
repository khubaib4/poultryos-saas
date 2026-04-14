import { createClient } from '@/lib/supabase/server'
import { getFarmStats } from '@/lib/queries/farms'
import { getInventorySummary, getLowStockItems } from '@/lib/queries/inventory'
import {
  getOverdueVaccinations,
  getUpcomingVaccinations,
} from '@/lib/queries/vaccinations'

const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const

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
  eggsWeekTrendPct: number | null
  eggsTrendDirection: 'up' | 'down' | 'steady'
  salesToday: number
  salesTrendPct: number | null
  salesTrendDirection: 'up' | 'down' | 'steady'
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
    salesToday,
    salesYesterday,
    invSummary,
    avg7,
  ] = await Promise.all([
    getFarmStats(farmId, organizationId),
    getFarmCurrentWeekEggSeries(farmId),
    sumEggsInRange(farmId, thisStart, thisEnd),
    sumEggsInRange(farmId, prevStart, prevEnd),
    sumSalesOnDate(farmId, today),
    sumSalesOnDate(farmId, yesterday),
    getInventorySummary(farmId),
    avgEggsLastNDays(farmId, 7, true),
  ])

  const eggsWeekTrendPct = pctChange(eggsThisWeek, eggsPrevWeek)
  const salesTrendPct = pctChange(salesToday, salesYesterday)

  const eggsTrendDirection: 'up' | 'down' | 'steady' =
    eggsWeekTrendPct == null || Math.abs(eggsWeekTrendPct) < 0.5
      ? 'steady'
      : eggsWeekTrendPct > 0
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
    eggsWeekTrendPct,
    eggsTrendDirection,
    salesToday,
    salesTrendPct,
    salesTrendDirection,
    lowStockCount:
      invSummary.lowStockCount + invSummary.outOfStockCount,
    vitalInsights,
  }
}
