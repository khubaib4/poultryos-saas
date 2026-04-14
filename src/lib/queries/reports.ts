import { createClient } from '@/lib/supabase/server'
import { getFarms } from '@/lib/queries/farms'
import { fetchCustomersByIds } from '@/lib/queries/sales'
import type { Expense, Sale, SaleLineItem } from '@/types/database'

export interface DateRange {
  start: string
  end: string
}

export type ReportFarmScope =
  | { kind: 'farms'; farmIds: string[] }
  | { kind: 'organization'; organizationId: string }

export async function resolveFarmIds(scope: ReportFarmScope): Promise<string[]> {
  if (scope.kind === 'farms') {
    return [...new Set(scope.farmIds.filter(Boolean))]
  }
  const farms = await getFarms(scope.organizationId)
  return farms.map((f) => f.id)
}

async function flockIdsForFarmIds(farmIds: string[]): Promise<string[]> {
  if (farmIds.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('flocks')
    .select('id')
    .in('farm_id', farmIds)
  return (data ?? []).map((r) => r.id as string)
}

async function flockRowsForFarmIds(
  farmIds: string[]
): Promise<{ id: string; farm_id: string; batch_number: string; breed: string; initial_count: number; current_count: number }[]> {
  if (farmIds.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('flocks')
    .select('id, farm_id, batch_number, breed, initial_count, current_count')
    .in('farm_id', farmIds)
  return (data ?? []) as {
    id: string
    farm_id: string
    batch_number: string
    breed: string
    initial_count: number
    current_count: number
  }[]
}

function parseLineItems(raw: unknown): SaleLineItem[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as SaleLineItem[]
  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw) as unknown
      return Array.isArray(j) ? (j as SaleLineItem[]) : []
    } catch {
      return []
    }
  }
  return []
}

function normalizeExpense(row: Record<string, unknown>): Expense {
  const expense_date =
    (row.expense_date as string | undefined) ??
    (row.date as string | undefined) ??
    ''
  return { ...(row as object), expense_date } as Expense
}

// ─── Daily ─────────────────────────────────────────────────────────────

export interface DailyReportEggs {
  gradeA: number
  gradeB: number
  cracked: number
  totalCollected: number
}

export interface DailyReportData {
  date: string
  eggs: DailyReportEggs
  totalDeaths: number
  totalFeed: number
  salesCount: number
  salesTotal: number
  expensesCount: number
  expensesTotal: number
  entries: {
    id: string
    date: string
    flockBatch: string
    eggs: DailyReportEggs
    deaths: number
    feed: number
  }[]
  sales: Sale[]
  expenses: Expense[]
}

export async function getDailyReport(
  farmIds: string[],
  date: string
): Promise<DailyReportData> {
  const d = date.slice(0, 10)
  const supabase = await createClient()
  const flockIds = await flockIdsForFarmIds(farmIds)
  const flocks = await flockRowsForFarmIds(farmIds)
  const flockMap = new Map(flocks.map((f) => [f.id, f]))

  let entriesRaw: Record<string, unknown>[] = []
  if (flockIds.length > 0) {
    const { data } = await supabase
      .from('daily_entries')
      .select(
        `id, flock_id, date, eggs_collected, eggs_grade_a, eggs_grade_b, eggs_cracked,
         deaths, feed_consumed`
      )
      .in('flock_id', flockIds)
      .eq('date', d)
    entriesRaw = (data ?? []) as Record<string, unknown>[]
  }

  const eggs: DailyReportEggs = {
    gradeA: 0,
    gradeB: 0,
    cracked: 0,
    totalCollected: 0,
  }
  let totalDeaths = 0
  let totalFeed = 0

  const entries = entriesRaw.map((row) => {
    const a = Number(row.eggs_grade_a ?? 0)
    const b = Number(row.eggs_grade_b ?? 0)
    const c = Number(row.eggs_cracked ?? 0)
    const col = Number(row.eggs_collected ?? 0)
    eggs.gradeA += a
    eggs.gradeB += b
    eggs.cracked += c
    eggs.totalCollected += col
    const deaths = Number(row.deaths ?? 0)
    const feed = Number(row.feed_consumed ?? 0)
    totalDeaths += deaths
    totalFeed += feed
    const fl = flockMap.get(row.flock_id as string)
    return {
      id: row.id as string,
      date: (row.date as string) ?? d,
      flockBatch: fl?.batch_number ?? '—',
      eggs: {
        gradeA: a,
        gradeB: b,
        cracked: c,
        totalCollected: col,
      },
      deaths,
      feed,
    }
  })

  let salesQ = supabase
    .from('sales')
    .select(
      `id, farm_id, customer_id, invoice_number, sale_date, line_items, total_amount,
       paid_amount, balance_due, payment_status, customer_name, created_at`
    )
    .gte('sale_date', d)
    .lte('sale_date', d)
  if (farmIds.length === 1) {
    salesQ = salesQ.eq('farm_id', farmIds[0])
  } else if (farmIds.length > 1) {
    salesQ = salesQ.in('farm_id', farmIds)
  }
  const { data: salesData } = await salesQ
  const salesRows = (salesData ?? []) as Record<string, unknown>[]
  const customerIds = salesRows
    .map((r) => r.customer_id as string | null)
    .filter((id): id is string => Boolean(id))
  const customerMap = await fetchCustomersByIds(supabase, customerIds)
  const sales = salesRows.map((row) => ({
    ...row,
    line_items: parseLineItems(row.line_items),
    customers: row.customer_id
      ? customerMap.get(row.customer_id as string)
      : undefined,
  })) as Sale[]

  let salesTotal = 0
  for (const s of sales) {
    salesTotal += Number(s.total_amount ?? 0)
  }

  let expQ = supabase
    .from('expenses')
    .select(
      'id, farm_id, date, expense_date, amount, category, description, vendor, created_at'
    )
    .gte('expense_date', d)
    .lte('expense_date', d)
  if (farmIds.length === 1) expQ = expQ.eq('farm_id', farmIds[0])
  else if (farmIds.length > 1) expQ = expQ.in('farm_id', farmIds)
  const { data: expData } = await expQ
  const expenses = (expData ?? []).map((r) =>
    normalizeExpense(r as Record<string, unknown>)
  )
  let expensesTotal = 0
  for (const e of expenses) {
    expensesTotal += Number(e.amount ?? 0)
  }

  return {
    date: d,
    eggs,
    totalDeaths,
    totalFeed,
    salesCount: sales.length,
    salesTotal,
    expensesCount: expenses.length,
    expensesTotal,
    entries,
    sales,
    expenses,
  }
}

// ─── Weekly ────────────────────────────────────────────────────────────

export interface DailyBreakdownRow {
  date: string
  eggs: number
  deaths: number
  feed: number
}

export interface WeeklyReportData {
  range: DateRange
  daily: DailyBreakdownRow[]
  totalEggs: number
  totalDeaths: number
  totalFeed: number
  totalSales: number
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  expensesByCategory: { category: string; total: number }[]
  sales: Sale[]
  expenses: Expense[]
}

function eachDayInRange(start: string, end: string): string[] {
  const out: string[] = []
  const a = new Date(start + 'T12:00:00Z')
  const b = new Date(end + 'T12:00:00Z')
  for (let t = a.getTime(); t <= b.getTime(); t += 86400000) {
    out.push(new Date(t).toISOString().slice(0, 10))
  }
  return out
}

export async function getWeeklyReport(
  farmIds: string[],
  range: DateRange
): Promise<WeeklyReportData> {
  const start = range.start.slice(0, 10)
  const end = range.end.slice(0, 10)
  const supabase = await createClient()
  const flockIds = await flockIdsForFarmIds(farmIds)

  let entryRows: {
    date: string
    eggs_collected: number | null
    deaths: number | null
    feed_consumed: number | null
  }[] = []
  if (flockIds.length > 0) {
    const { data } = await supabase
      .from('daily_entries')
      .select('date, eggs_collected, deaths, feed_consumed')
      .in('flock_id', flockIds)
      .gte('date', start)
      .lte('date', end)
    entryRows = (data ?? []) as typeof entryRows
  }

  const byDay = new Map<string, { eggs: number; deaths: number; feed: number }>()
  for (const row of entryRows) {
    const d = row.date.slice(0, 10)
    const cur = byDay.get(d) ?? { eggs: 0, deaths: 0, feed: 0 }
    cur.eggs += Number(row.eggs_collected ?? 0)
    cur.deaths += Number(row.deaths ?? 0)
    cur.feed += Number(row.feed_consumed ?? 0)
    byDay.set(d, cur)
  }

  const days = eachDayInRange(start, end)
  const daily: DailyBreakdownRow[] = days.map((date) => {
    const v = byDay.get(date) ?? { eggs: 0, deaths: 0, feed: 0 }
    return { date, eggs: v.eggs, deaths: v.deaths, feed: v.feed }
  })

  let totalEggs = 0
  let totalDeaths = 0
  let totalFeed = 0
  for (const v of byDay.values()) {
    totalEggs += v.eggs
    totalDeaths += v.deaths
    totalFeed += v.feed
  }

  let salesQ = supabase
    .from('sales')
    .select(
      `id, farm_id, customer_id, invoice_number, sale_date, line_items, total_amount,
       paid_amount, balance_due, payment_status, customer_name, created_at`
    )
    .gte('sale_date', start)
    .lte('sale_date', end)
  if (farmIds.length === 1) salesQ = salesQ.eq('farm_id', farmIds[0])
  else if (farmIds.length > 1) salesQ = salesQ.in('farm_id', farmIds)
  const { data: salesData } = await salesQ
  const salesRows = (salesData ?? []) as Record<string, unknown>[]
  const cids = salesRows.map((r) => r.customer_id as string).filter(Boolean)
  const cmap = await fetchCustomersByIds(supabase, cids)
  const sales = salesRows.map((row) => ({
    ...row,
    line_items: parseLineItems(row.line_items),
    customers: row.customer_id ? cmap.get(row.customer_id as string) : undefined,
  })) as Sale[]

  let totalRevenue = 0
  let totalSales = 0
  for (const s of sales) {
    totalRevenue += Number(s.total_amount ?? 0)
    totalSales += 1
  }

  let expQ = supabase
    .from('expenses')
    .select(
      'id, farm_id, date, expense_date, amount, category, description, vendor, created_at'
    )
    .gte('expense_date', start)
    .lte('expense_date', end)
  if (farmIds.length === 1) expQ = expQ.eq('farm_id', farmIds[0])
  else if (farmIds.length > 1) expQ = expQ.in('farm_id', farmIds)
  const { data: expData } = await expQ
  const expenses = (expData ?? []).map((r) =>
    normalizeExpense(r as Record<string, unknown>)
  )

  const catMap = new Map<string, number>()
  let totalExpenses = 0
  for (const e of expenses) {
    const amt = Number(e.amount ?? 0)
    totalExpenses += amt
    const c = e.category || 'Other'
    catMap.set(c, (catMap.get(c) ?? 0) + amt)
  }
  const expensesByCategory = [...catMap.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  return {
    range: { start, end },
    daily,
    totalEggs,
    totalDeaths,
    totalFeed,
    totalSales,
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    expensesByCategory,
    sales,
    expenses,
  }
}

// ─── Monthly ───────────────────────────────────────────────────────────

export interface WeekSummary {
  label: string
  start: string
  end: string
  eggs: number
  revenue: number
  expenses: number
}

export interface MonthlyReportData {
  range: DateRange
  weekSummaries: WeekSummary[]
  flockPerformance: {
    flockId: string
    batchNumber: string
    breed: string
    farmId: string
    eggsPerBird: number
    mortalityRate: number
    feedPer100Eggs: number
    totalEggs: number
    totalDeaths: number
    totalFeed: number
    birdCount: number
  }[]
  topCustomers: { customerId: string | null; name: string; revenue: number }[]
  expensesByCategory: { category: string; total: number }[]
  revenueVsExpenses: { period: string; revenue: number; expenses: number }[]
  totalRevenue: number
  totalExpenses: number
  netProfit: number
}

function weekChunks(start: string, end: string): DateRange[] {
  const chunks: DateRange[] = []
  let cur = new Date(start + 'T12:00:00Z')
  const endT = new Date(end + 'T12:00:00Z').getTime()
  while (cur.getTime() <= endT) {
    const ws = cur.toISOString().slice(0, 10)
    const weekEnd = new Date(cur)
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
    let we = weekEnd.toISOString().slice(0, 10)
    if (new Date(we + 'T12:00:00Z').getTime() > endT) {
      we = end
    }
    chunks.push({ start: ws, end: we })
    cur = new Date(we + 'T12:00:00Z')
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return chunks
}

export async function getMonthlyReport(
  farmIds: string[],
  range: DateRange
): Promise<MonthlyReportData> {
  const start = range.start.slice(0, 10)
  const end = range.end.slice(0, 10)
  const data = await getWeeklyReport(farmIds, { start, end })

  const chunks = weekChunks(start, end)
  const weekSummaries: WeekSummary[] = []
  const supabase = await createClient()
  const flockIds = await flockIdsForFarmIds(farmIds)
  const flocks = await flockRowsForFarmIds(farmIds)

  for (let i = 0; i < chunks.length; i++) {
    const ch = chunks[i]
    let eggs = 0
    if (flockIds.length > 0) {
      const { data: er } = await supabase
        .from('daily_entries')
        .select('eggs_collected')
        .in('flock_id', flockIds)
        .gte('date', ch.start)
        .lte('date', ch.end)
      for (const r of er ?? []) {
        eggs += Number((r as { eggs_collected: number }).eggs_collected ?? 0)
      }
    }

    let rev = 0
    let exp = 0
    let sq = supabase
      .from('sales')
      .select('total_amount')
      .gte('sale_date', ch.start)
      .lte('sale_date', ch.end)
    if (farmIds.length === 1) sq = sq.eq('farm_id', farmIds[0])
    else if (farmIds.length > 1) sq = sq.in('farm_id', farmIds)
    const { data: sr } = await sq
    for (const r of sr ?? []) {
      rev += Number((r as { total_amount: number }).total_amount ?? 0)
    }

    let eq = supabase
      .from('expenses')
      .select('amount')
      .gte('expense_date', ch.start)
      .lte('expense_date', ch.end)
    if (farmIds.length === 1) eq = eq.eq('farm_id', farmIds[0])
    else if (farmIds.length > 1) eq = eq.in('farm_id', farmIds)
    const { data: exr } = await eq
    for (const r of exr ?? []) {
      exp += Number((r as { amount: number }).amount ?? 0)
    }

    weekSummaries.push({
      label: `Week ${i + 1}`,
      start: ch.start,
      end: ch.end,
      eggs,
      revenue: rev,
      expenses: exp,
    })
  }

  const flockPerformance = await Promise.all(
    flocks.map(async (fl) => {
      const { data: ent } = await supabase
        .from('daily_entries')
        .select('eggs_collected, deaths, feed_consumed')
        .eq('flock_id', fl.id)
        .gte('date', start)
        .lte('date', end)

      let totalEggs = 0
      let totalDeaths = 0
      let totalFeed = 0
      for (const r of ent ?? []) {
        totalEggs += Number((r as { eggs_collected: number }).eggs_collected ?? 0)
        totalDeaths += Number((r as { deaths: number }).deaths ?? 0)
        totalFeed += Number((r as { feed_consumed: number }).feed_consumed ?? 0)
      }

      const birds = Math.max(1, Number(fl.current_count ?? fl.initial_count ?? 1))
      const eggsPerBird = totalEggs / birds
      const initial = Math.max(1, Number(fl.initial_count ?? 1))
      const mortalityRate =
        initial > 0 ? Math.min(100, (totalDeaths / initial) * 100) : 0
      const feedPer100Eggs = totalEggs > 0 ? (totalFeed / totalEggs) * 100 : 0

      return {
        flockId: fl.id,
        batchNumber: fl.batch_number,
        breed: fl.breed,
        farmId: fl.farm_id,
        eggsPerBird: Math.round(eggsPerBird * 100) / 100,
        mortalityRate: Math.round(mortalityRate * 10) / 10,
        feedPer100Eggs: Math.round(feedPer100Eggs * 100) / 100,
        totalEggs,
        totalDeaths,
        totalFeed,
        birdCount: birds,
      }
    })
  )

  const custMap = new Map<string | null, number>()
  const nameByCustomer = new Map<string | null, string>()
  for (const s of data.sales) {
    const id = s.customer_id ?? null
    const prev = custMap.get(id) ?? 0
    custMap.set(id, prev + Number(s.total_amount ?? 0))
    if (!nameByCustomer.has(id)) {
      nameByCustomer.set(
        id,
        s.customers?.name ?? s.customer_name ?? 'Walk-in / Other'
      )
    }
  }
  const topCustomers = [...custMap.entries()]
    .map(([customerId, revenue]) => ({
      customerId,
      name: nameByCustomer.get(customerId) ?? 'Unknown',
      revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  const revenueVsExpenses = weekSummaries.map((w) => ({
    period: w.label,
    revenue: w.revenue,
    expenses: w.expenses,
  }))

  return {
    range: { start, end },
    weekSummaries,
    flockPerformance,
    topCustomers,
    expensesByCategory: data.expensesByCategory,
    revenueVsExpenses,
    totalRevenue: data.totalRevenue,
    totalExpenses: data.totalExpenses,
    netProfit: data.netProfit,
  }
}

// ─── Financial summary ─────────────────────────────────────────────────

export interface FinancialSummaryData {
  totalRevenue: number
  totalExpenses: number
  grossProfit: number
  outstandingReceivables: number
  cashCollected: number
}

export async function getFinancialSummary(
  farmIds: string[],
  range: DateRange
): Promise<FinancialSummaryData> {
  const start = range.start.slice(0, 10)
  const end = range.end.slice(0, 10)
  const supabase = await createClient()

  let salesQ = supabase
    .from('sales')
    .select('total_amount, paid_amount, balance_due')
    .gte('sale_date', start)
    .lte('sale_date', end)
  if (farmIds.length === 1) salesQ = salesQ.eq('farm_id', farmIds[0])
  else if (farmIds.length > 1) salesQ = salesQ.in('farm_id', farmIds)
  const { data: salesRows } = await salesQ

  let totalRevenue = 0
  for (const r of salesRows ?? []) {
    totalRevenue += Number((r as { total_amount: number }).total_amount ?? 0)
  }

  let arQ = supabase
    .from('sales')
    .select('balance_due')
    .gt('balance_due', 0)
  if (farmIds.length === 1) arQ = arQ.eq('farm_id', farmIds[0])
  else if (farmIds.length > 1) arQ = arQ.in('farm_id', farmIds)
  const { data: arRows } = await arQ
  let outstandingReceivables = 0
  for (const r of arRows ?? []) {
    outstandingReceivables += Number((r as { balance_due: number }).balance_due ?? 0)
  }

  let expQ = supabase
    .from('expenses')
    .select('amount')
    .gte('expense_date', start)
    .lte('expense_date', end)
  if (farmIds.length === 1) expQ = expQ.eq('farm_id', farmIds[0])
  else if (farmIds.length > 1) expQ = expQ.in('farm_id', farmIds)
  const { data: expRows } = await expQ
  let totalExpenses = 0
  for (const r of expRows ?? []) {
    totalExpenses += Number((r as { amount: number }).amount ?? 0)
  }

  let idQ = supabase
    .from('sales')
    .select('id')
    .gte('sale_date', start)
    .lte('sale_date', end)
  if (farmIds.length === 1) idQ = idQ.eq('farm_id', farmIds[0])
  else if (farmIds.length > 1) idQ = idQ.in('farm_id', farmIds)
  const { data: idRows } = await idQ

  const saleIds = (idRows ?? []).map((r) => (r as { id: string }).id)
  let cashCollected = 0
  if (saleIds.length > 0) {
    const { data: payRows } = await supabase
      .from('payments')
      .select('amount, payment_date')
      .in('sale_id', saleIds)
      .gte('payment_date', start)
      .lte('payment_date', end)
    for (const p of payRows ?? []) {
      cashCollected += Number((p as { amount: number }).amount ?? 0)
    }
  }

  const cogs = await sumExpensesByCategories(farmIds, start, end, [
    'Feed',
    'Packaging',
  ])
  const grossProfit = totalRevenue - cogs

  return {
    totalRevenue,
    totalExpenses,
    grossProfit,
    outstandingReceivables,
    cashCollected,
  }
}

async function sumExpensesByCategories(
  farmIds: string[],
  start: string,
  end: string,
  categories: string[]
): Promise<number> {
  const supabase = await createClient()
  let q = supabase
    .from('expenses')
    .select('amount, category')
    .gte('expense_date', start)
    .lte('expense_date', end)
    .in('category', categories)
  if (farmIds.length === 1) q = q.eq('farm_id', farmIds[0])
  else if (farmIds.length > 1) q = q.in('farm_id', farmIds)
  const { data } = await q
  let s = 0
  for (const r of data ?? []) {
    s += Number((r as { amount: number }).amount ?? 0)
  }
  return s
}

// ─── Financial P&L detail ────────────────────────────────────────────────

export interface FinancialPLData {
  range: DateRange
  revenueTotal: number
  revenueByCategory: { name: string; amount: number }[]
  cogsTotal: number
  cogsLines: { name: string; amount: number }[]
  grossProfit: number
  operatingExpensesTotal: number
  operatingByCategory: { category: string; amount: number }[]
  netProfit: number
  cashCollections: number
  cashExpensePayments: number
  netCash: number
  receivablesAging: {
    current: number
    days30: number
    days60: number
    days90Plus: number
  }
}

function saleLineCategory(li: SaleLineItem): string {
  const t = (li.type ?? '').toLowerCase()
  if (t.includes('grade a') || t.includes('a')) return 'Grade A Eggs'
  if (t.includes('grade b') || t.includes('b')) return 'Grade B Eggs'
  if (t.includes('crack')) return 'Cracked / Other'
  return li.type || 'Sales'
}

export async function getFinancialPLReport(
  farmIds: string[],
  range: DateRange
): Promise<FinancialPLData> {
  const start = range.start.slice(0, 10)
  const end = range.end.slice(0, 10)
  const supabase = await createClient()

  let salesQ = supabase
    .from('sales')
    .select(
      'id, total_amount, line_items, balance_due, due_date, sale_date, paid_amount'
    )
    .gte('sale_date', start)
    .lte('sale_date', end)
  if (farmIds.length === 1) salesQ = salesQ.eq('farm_id', farmIds[0])
  else if (farmIds.length > 1) salesQ = salesQ.in('farm_id', farmIds)
  const { data: salesData } = await salesQ
  const salesRows = (salesData ?? []) as Record<string, unknown>[]

  const revByName = new Map<string, number>()
  let revenueTotal = 0
  for (const row of salesRows) {
    const total = Number(row.total_amount ?? 0)
    revenueTotal += total
    const lines = parseLineItems(row.line_items)
    if (lines.length === 0) {
      const k = 'Invoice total'
      revByName.set(k, (revByName.get(k) ?? 0) + total)
    } else {
      for (const li of lines) {
        const cat = saleLineCategory(li)
        const amt = Number(
          li.total ?? (li.quantity ?? 0) * (li.unit_price ?? 0)
        )
        revByName.set(cat, (revByName.get(cat) ?? 0) + amt)
      }
    }
  }
  const revenueByCategory = [...revByName.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)

  const feedPack = await getExpenseCategoryTotals(farmIds, start, end, [
    'Feed',
    'Packaging',
  ])
  const cogsLines = [
    { name: 'Feed', amount: feedPack.Feed ?? 0 },
    { name: 'Packaging', amount: feedPack.Packaging ?? 0 },
  ]
  const cogsTotal = cogsLines.reduce((s, x) => s + x.amount, 0)
  const grossProfit = revenueTotal - cogsTotal

  let expQ = supabase
    .from('expenses')
    .select('amount, category')
    .gte('expense_date', start)
    .lte('expense_date', end)
  if (farmIds.length === 1) expQ = expQ.eq('farm_id', farmIds[0])
  else if (farmIds.length > 1) expQ = expQ.in('farm_id', farmIds)
  const { data: allExp } = await expQ

  const opMap = new Map<string, number>()
  let operatingExpensesTotal = 0
  for (const r of allExp ?? []) {
    const cat = (r as { category: string }).category || 'Other'
    if (cat === 'Feed' || cat === 'Packaging') continue
    const amt = Number((r as { amount: number }).amount ?? 0)
    operatingExpensesTotal += amt
    opMap.set(cat, (opMap.get(cat) ?? 0) + amt)
  }
  const operatingByCategory = [...opMap.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  const netProfit = grossProfit - operatingExpensesTotal

  const saleIds = salesRows.map((r) => r.id as string)
  let cashCollections = 0
  if (saleIds.length > 0) {
    const { data: pays } = await supabase
      .from('payments')
      .select('amount')
      .in('sale_id', saleIds)
      .gte('payment_date', start)
      .lte('payment_date', end)
    for (const p of pays ?? []) {
      cashCollections += Number((p as { amount: number }).amount ?? 0)
    }
  }

  let expTotalAll = 0
  for (const r of allExp ?? []) {
    expTotalAll += Number((r as { amount: number }).amount ?? 0)
  }
  const cashExpensePayments = expTotalAll
  const netCash = cashCollections - cashExpensePayments

  const aging = await getReceivablesAging(farmIds)

  return {
    range: { start, end },
    revenueTotal,
    revenueByCategory,
    cogsTotal,
    cogsLines,
    grossProfit,
    operatingExpensesTotal,
    operatingByCategory,
    netProfit,
    cashCollections,
    cashExpensePayments,
    netCash,
    receivablesAging: aging,
  }
}

async function getExpenseCategoryTotals(
  farmIds: string[],
  start: string,
  end: string,
  categories: string[]
): Promise<Record<string, number>> {
  const supabase = await createClient()
  let q = supabase
    .from('expenses')
    .select('amount, category')
    .gte('expense_date', start)
    .lte('expense_date', end)
    .in('category', categories)
  if (farmIds.length === 1) q = q.eq('farm_id', farmIds[0])
  else if (farmIds.length > 1) q = q.in('farm_id', farmIds)
  const { data } = await q
  const out: Record<string, number> = {}
  for (const c of categories) out[c] = 0
  for (const r of data ?? []) {
    const cat = (r as { category: string }).category
    const amt = Number((r as { amount: number }).amount ?? 0)
    if (out[cat] !== undefined) out[cat] += amt
  }
  return out
}

async function getReceivablesAging(farmIds: string[]): Promise<{
  current: number
  days30: number
  days60: number
  days90Plus: number
}> {
  const supabase = await createClient()
  let q = supabase
    .from('sales')
    .select('balance_due, due_date')
    .gt('balance_due', 0)
  if (farmIds.length === 1) q = q.eq('farm_id', farmIds[0])
  else if (farmIds.length > 1) q = q.in('farm_id', farmIds)
  const { data } = await q
  const today = new Date().toISOString().slice(0, 10)
  let current = 0
  let days30 = 0
  let days60 = 0
  let days90Plus = 0

  for (const r of data ?? []) {
    const bal = Number((r as { balance_due: number }).balance_due ?? 0)
    if (bal <= 0) continue
    const due = (r as { due_date: string | null }).due_date
    if (!due) {
      current += bal
      continue
    }
    const d0 = new Date(today + 'T12:00:00Z').getTime()
    const d1 = new Date(due.slice(0, 10) + 'T12:00:00Z').getTime()
    const daysPast = Math.floor((d0 - d1) / 86400000)
    if (daysPast <= 0) current += bal
    else if (daysPast <= 30) days30 += bal
    else if (daysPast <= 60) days60 += bal
    else days90Plus += bal
  }

  return { current, days30, days60, days90Plus }
}

// ─── Flock performance ─────────────────────────────────────────────────

export interface FlockPerformanceRow {
  flockId: string
  farmId: string
  batchNumber: string
  breed: string
  productionRate: number
  mortalityRate: number
  feedConversion: number
  totalEggs: number
  totalDeaths: number
  totalFeed: number
  birdCount: number
}

export interface FlockPerformanceReportData {
  range: DateRange
  flocks: FlockPerformanceRow[]
  dailyByFlock: Record<string, { date: string; eggs: number; deaths: number }[]>
}

export async function getFlockPerformanceReport(
  farmIds: string[],
  range: DateRange,
  flockId?: string | null
): Promise<FlockPerformanceReportData> {
  const start = range.start.slice(0, 10)
  const end = range.end.slice(0, 10)
  const supabase = await createClient()
  let flocks = await flockRowsForFarmIds(farmIds)
  if (flockId) {
    flocks = flocks.filter((f) => f.id === flockId)
  }

  const dailyByFlock: Record<string, { date: string; eggs: number; deaths: number }[]> =
    {}
  const rows: FlockPerformanceRow[] = []

  const flockIds = flocks.map((f) => f.id)
  type EntryRow = {
    flock_id: string
    date: string
    eggs_collected?: number | null
    deaths?: number | null
    feed_consumed?: number | null
  }

  const byFlock = new Map<string, EntryRow[]>()
  if (flockIds.length > 0) {
    const { data: ent, error } = await supabase
      .from('daily_entries')
      .select('flock_id, date, eggs_collected, deaths, feed_consumed')
      .in('flock_id', flockIds)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true })

    if (error) {
      console.error('[getFlockPerformanceReport] daily_entries', error.message)
    } else {
      for (const r of (ent ?? []) as EntryRow[]) {
        const id = String(r.flock_id)
        const list = byFlock.get(id) ?? []
        list.push(r)
        byFlock.set(id, list)
      }
    }
  }

  for (const fl of flocks) {
    const ent = byFlock.get(fl.id) ?? []

    let totalEggs = 0
    let totalDeaths = 0
    let totalFeed = 0
    const series: { date: string; eggs: number; deaths: number }[] = []
    for (const r of ent) {
      const e = Number(r.eggs_collected ?? 0)
      const d = Number(r.deaths ?? 0)
      const f = Number(r.feed_consumed ?? 0)
      totalEggs += e
      totalDeaths += d
      totalFeed += f
      series.push({
        date: String(r.date).slice(0, 10),
        eggs: e,
        deaths: d,
      })
    }
    dailyByFlock[fl.id] = series

    const birds = Math.max(1, Number(fl.current_count ?? 1))
    const initial = Math.max(1, Number(fl.initial_count ?? 1))
    const productionRate = totalEggs / birds
    const mortalityRate =
      initial > 0 ? Math.min(100, (totalDeaths / initial) * 100) : 0
    const feedConversion = totalEggs > 0 ? totalFeed / totalEggs : 0

    rows.push({
      flockId: fl.id,
      farmId: fl.farm_id,
      batchNumber: fl.batch_number,
      breed: fl.breed,
      productionRate: Math.round(productionRate * 1000) / 1000,
      mortalityRate: Math.round(mortalityRate * 10) / 10,
      feedConversion: Math.round(feedConversion * 1000) / 1000,
      totalEggs,
      totalDeaths,
      totalFeed,
      birdCount: birds,
    })
  }

  return {
    range: { start, end },
    flocks: rows,
    dailyByFlock,
  }
}

/** Farm comparison: revenue and eggs per farm in range */
export async function getFarmComparisonReport(
  farmIds: string[],
  range: DateRange
): Promise<
  {
    farmId: string
    farmName: string
    revenue: number
    expenses: number
    eggs: number
  }[]
> {
  const start = range.start.slice(0, 10)
  const end = range.end.slice(0, 10)
  const supabase = await createClient()

  const { data: farmRows } = await supabase
    .from('farms')
    .select('id, name')
    .in('id', farmIds)
  const nameMap = new Map(
    (farmRows ?? []).map((r) => [(r as { id: string }).id, (r as { name: string }).name])
  )

  // Weekly stats in parallel
  const weekly = await Promise.all(
    farmIds.map(async (fid) => ({ fid, w: await getWeeklyReport([fid], { start, end }) }))
  )

  // Eggs for all farms: flocks -> daily_entries once
  const flocks = await flockRowsForFarmIds(farmIds)
  const flockToFarm = new Map(flocks.map((f) => [f.id, f.farm_id]))
  const allFlockIds = flocks.map((f) => f.id)
  const eggsByFarm = new Map<string, number>()
  if (allFlockIds.length > 0) {
    const { data: er, error } = await supabase
      .from('daily_entries')
      .select('flock_id, eggs_collected')
      .in('flock_id', allFlockIds)
      .gte('date', start)
      .lte('date', end)

    if (error) {
      console.error('[getFarmComparisonReport] daily_entries', error.message)
    } else {
      for (const r of er ?? []) {
        const row = r as { flock_id: string; eggs_collected?: number | null }
        const farmId = flockToFarm.get(String(row.flock_id))
        if (!farmId) continue
        eggsByFarm.set(
          farmId,
          (eggsByFarm.get(farmId) ?? 0) + Number(row.eggs_collected ?? 0)
        )
      }
    }
  }

  return weekly.map(({ fid, w }) => ({
    farmId: fid,
    farmName: nameMap.get(fid) ?? fid,
    revenue: w.totalRevenue,
    expenses: w.totalExpenses,
    eggs: eggsByFarm.get(fid) ?? 0,
  }))
}

// Farm dashboard analytics for the Stitch `/farm/reports` UI live in `reports-analytics.ts`
// (e.g. `getOverviewStats`, `getFinancialDashboardData`, `getProductionIntelligence`).
