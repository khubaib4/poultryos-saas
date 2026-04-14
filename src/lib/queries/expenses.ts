import { createClient } from '@/lib/supabase/server'
import type { Expense } from '@/types/database'

export {
  EXPENSE_CATEGORIES,
  getExpenseCategories,
  type ExpenseCategory,
} from '@/lib/expense-categories'

export interface ExpenseFilters {
  dateFrom?: string
  dateTo?: string
  category?: string
  limit?: number
}

function normalizeExpenseRow(row: Record<string, unknown>): Expense {
  const expenseDate =
    (row.expense_date as string | undefined) ??
    (row.date as string | undefined) ??
    ''
  return {
    ...(row as object),
    expense_date: expenseDate,
  } as Expense
}

export async function getExpenses(
  farmId: string,
  filters?: ExpenseFilters
): Promise<Expense[]> {
  const supabase = await createClient()

  let q = supabase
    .from('expenses')
    .select(
      'id, farm_id, date, expense_date, amount, category, description, vendor, payment_method, reference, notes, created_at'
    )
    .eq('farm_id', farmId)

  if (filters?.dateFrom) {
    q = q.gte('expense_date', filters.dateFrom)
  }
  if (filters?.dateTo) {
    q = q.lte('expense_date', filters.dateTo)
  }
  if (filters?.category && filters.category !== 'all') {
    q = q.eq('category', filters.category)
  }

  q = q.order('expense_date', { ascending: false }).order('created_at', { ascending: false })

  if (filters?.limit) {
    q = q.limit(filters.limit)
  } else {
    q = q.limit(500)
  }

  const { data, error } = await q
  if (error) {
    console.error('[getExpenses]', error.message)
    return []
  }

  return (data ?? []).map((row) => normalizeExpenseRow(row as Record<string, unknown>))
}

export async function getExpense(expenseId: string): Promise<Expense | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .select(
      'id, farm_id, date, expense_date, amount, category, description, vendor, payment_method, reference, notes, created_at'
    )
    .eq('id', expenseId)
    .maybeSingle()

  if (error || !data) {
    if (error) console.error('[getExpense]', error.message)
    return null
  }
  return normalizeExpenseRow(data as Record<string, unknown>)
}

export async function getExpenseForFarm(
  expenseId: string,
  farmId: string
): Promise<Expense | null> {
  const row = await getExpense(expenseId)
  if (!row || row.farm_id !== farmId) return null
  return row
}

export interface ExpensesSummary {
  totalAmount: number
  entryCount: number
  byCategory: { category: string; total: number }[]
  topCategory: { category: string; total: number } | null
}

export async function getExpensesSummary(
  farmId: string,
  startDate?: string,
  endDate?: string
): Promise<ExpensesSummary> {
  const supabase = await createClient()

  let q = supabase
    .from('expenses')
    .select('category, amount, expense_date, date')
    .eq('farm_id', farmId)

  if (startDate) q = q.gte('expense_date', startDate)
  if (endDate) q = q.lte('expense_date', endDate)

  const { data, error } = await q
  if (error) {
    console.error('[getExpensesSummary]', error.message)
    return {
      totalAmount: 0,
      entryCount: 0,
      byCategory: [],
      topCategory: null,
    }
  }

  const rows = data ?? []
  const byCat = new Map<string, number>()
  let totalAmount = 0

  for (const r of rows) {
    const row = r as { category?: string | null; amount?: number | null }
    const amt = Number(row.amount ?? 0)
    totalAmount += amt
    const cat = row.category?.trim() || 'Other'
    byCat.set(cat, (byCat.get(cat) ?? 0) + amt)
  }

  const byCategory = [...byCat.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  let topCategory: { category: string; total: number } | null = null
  if (byCategory.length > 0) {
    topCategory = { category: byCategory[0].category, total: byCategory[0].total }
  }

  return {
    totalAmount,
    entryCount: rows.length,
    byCategory,
    topCategory,
  }
}

export type PaymentStatusFilter = 'all' | 'paid' | 'pending'

export type CategoryBreakdownKey =
  | 'feed'
  | 'labor'
  | 'medicine'
  | 'utilities'
  | 'equipment'
  | 'transport'
  | 'other'

const CHART_LABEL: Record<CategoryBreakdownKey, string> = {
  feed: 'Feed',
  labor: 'Labor',
  medicine: 'Medicine',
  utilities: 'Utilities',
  equipment: 'Equipment',
  transport: 'Transport',
  other: 'Other',
}

function bucketCategoryForChart(raw: string): CategoryBreakdownKey {
  const c = raw.trim().toLowerCase()
  if (c === 'feed' || c.startsWith('feed')) return 'feed'
  if (c.includes('medicine') || c.includes('vaccine')) return 'medicine'
  if (c.includes('labor')) return 'labor'
  if (c.includes('utilities')) return 'utilities'
  if (c.includes('equipment') || c.includes('maintenance')) return 'equipment'
  if (c.includes('transport')) return 'transport'
  return 'other'
}

function toISODateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfCalendarQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3)
  return new Date(d.getFullYear(), q * 3, 1)
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate())
}

export interface ExpenseDashboardStats {
  totalAllTime: number
  lastQuarterTotal: number
  thisQuarterTotal: number
  /** Positive = spending decreased vs last quarter (for ↓ trend copy). */
  quarterSpendChangePct: number | null
  thisMonthTotal: number
  feedCostsTotal: number
  feedPctOfTotal: number
  pendingAmount: number
  pendingCount: number
  pendingDueThisWeekCount: number
  feedThisMonth: number
  feedLastMonth: number
  feedMonthOverMonthPct: number | null
}

export interface CategoryBreakdownRow {
  key: CategoryBreakdownKey
  name: string
  value: number
  percent: number
}

export interface TopVendorRow {
  vendor: string
  total: number
  count: number
}

type LightExpenseRow = {
  amount?: number | null
  category?: string | null
  expense_date?: string | null
  date?: string | null
  payment_method?: string | null
  vendor?: string | null
}

function isPendingMethod(method: string | null | undefined): boolean {
  return (method ?? '').toLowerCase() === 'pending'
}

function expenseRowDate(r: LightExpenseRow): string {
  return (r.expense_date as string | undefined) ?? (r.date as string | undefined) ?? ''
}

async function fetchExpenseAggregateRows(
  farmId: string,
  range?: { dateFrom?: string; dateTo?: string }
): Promise<LightExpenseRow[]> {
  const supabase = await createClient()
  let q = supabase
    .from('expenses')
    .select('amount, category, expense_date, date, payment_method, vendor')
    .eq('farm_id', farmId)

  if (range?.dateFrom) {
    q = q.gte('expense_date', range.dateFrom)
  }
  if (range?.dateTo) {
    q = q.lte('expense_date', range.dateTo)
  }

  const { data, error } = await q

  if (error) {
    console.error('[fetchExpenseAggregateRows]', error.message)
    return []
  }
  return (data ?? []) as LightExpenseRow[]
}

function computeExpenseDashboardStats(
  rows: LightExpenseRow[]
): ExpenseDashboardStats {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const lastMonthStart = addMonths(monthStart, -1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  const qStart = startOfCalendarQuarter(now)
  const qEnd = addMonths(qStart, 3)
  const qEndDay = new Date(qEnd.getTime() - 86400000)
  const prevQEnd = new Date(qStart.getTime() - 86400000)
  const prevQStart = addMonths(qStart, -3)

  const qStartS = toISODateLocal(qStart)
  const qEndS = toISODateLocal(qEndDay)
  const prevQStartS = toISODateLocal(prevQStart)
  const prevQEndS = toISODateLocal(prevQEnd)
  const monthStartS = toISODateLocal(monthStart)
  const monthEndS = toISODateLocal(monthEnd)
  const lastMonthStartS = toISODateLocal(lastMonthStart)
  const lastMonthEndS = toISODateLocal(lastMonthEnd)

  let totalAllTime = 0
  let lastQuarterTotal = 0
  let thisQuarterTotal = 0
  let thisMonthTotal = 0
  let feedCostsTotal = 0
  let feedThisMonth = 0
  let feedLastMonth = 0
  let pendingAmount = 0
  let pendingCount = 0
  let pendingDueThisWeekCount = 0

  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const weekStartS = toISODateLocal(weekStart)
  const weekEndS = toISODateLocal(weekEnd)

  for (const r of rows) {
    const amt = Number(r.amount ?? 0)
    totalAllTime += amt
    const d = expenseRowDate(r)
    if (!d) continue

    if (d >= qStartS && d <= qEndS) thisQuarterTotal += amt
    if (d >= prevQStartS && d <= prevQEndS) lastQuarterTotal += amt
    if (d >= monthStartS && d <= monthEndS) {
      thisMonthTotal += amt
      const cat = r.category?.trim().toLowerCase() ?? ''
      if (cat === 'feed' || cat.startsWith('feed')) feedThisMonth += amt
    }
    if (d >= lastMonthStartS && d <= lastMonthEndS) {
      const cat = r.category?.trim().toLowerCase() ?? ''
      if (cat === 'feed' || cat.startsWith('feed')) feedLastMonth += amt
    }

    const cat = r.category?.trim().toLowerCase() ?? ''
    if (cat === 'feed' || cat.startsWith('feed')) feedCostsTotal += amt

    if (isPendingMethod(r.payment_method)) {
      pendingAmount += amt
      pendingCount += 1
      if (d >= weekStartS && d <= weekEndS) pendingDueThisWeekCount += 1
    }
  }

  let quarterSpendChangePct: number | null = null
  if (lastQuarterTotal > 0) {
    quarterSpendChangePct = Math.round(
      ((lastQuarterTotal - thisQuarterTotal) / lastQuarterTotal) * 100
    )
  }

  const feedPctOfTotal =
    totalAllTime > 0 ? Math.round((feedCostsTotal / totalAllTime) * 100) : 0

  let feedMonthOverMonthPct: number | null = null
  if (feedLastMonth > 0) {
    feedMonthOverMonthPct = Math.round(
      ((feedThisMonth - feedLastMonth) / feedLastMonth) * 100
    )
  }

  return {
    totalAllTime,
    lastQuarterTotal,
    thisQuarterTotal,
    quarterSpendChangePct,
    thisMonthTotal,
    feedCostsTotal,
    feedPctOfTotal,
    pendingAmount,
    pendingCount,
    pendingDueThisWeekCount,
    feedThisMonth,
    feedLastMonth,
    feedMonthOverMonthPct,
  }
}

export async function getExpenseDashboardStats(
  farmId: string,
  range?: { dateFrom?: string; dateTo?: string }
): Promise<ExpenseDashboardStats> {
  const rows = await fetchExpenseAggregateRows(farmId, range)
  return computeExpenseDashboardStats(rows)
}

function computeCategoryBreakdown(
  rows: LightExpenseRow[]
): CategoryBreakdownRow[] {
  const totals = new Map<CategoryBreakdownKey, number>()
  const keys: CategoryBreakdownKey[] = [
    'feed',
    'labor',
    'medicine',
    'utilities',
    'equipment',
    'transport',
    'other',
  ]
  for (const k of keys) totals.set(k, 0)

  let sum = 0
  for (const r of rows) {
    const amt = Number(r.amount ?? 0)
    sum += amt
    const bucket = bucketCategoryForChart(r.category ?? 'Other')
    totals.set(bucket, (totals.get(bucket) ?? 0) + amt)
  }

  if (sum <= 0) {
    return []
  }

  return keys
    .map((key) => {
      const value = totals.get(key) ?? 0
      return {
        key,
        name: CHART_LABEL[key],
        value,
        percent: Math.round((value / sum) * 100),
      }
    })
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
}

export async function getCategoryBreakdown(
  farmId: string,
  range?: { dateFrom?: string; dateTo?: string }
): Promise<CategoryBreakdownRow[]> {
  const rows = await fetchExpenseAggregateRows(farmId, range)
  return computeCategoryBreakdown(rows)
}

function computeTopVendors(
  rows: LightExpenseRow[],
  limit: number
): TopVendorRow[] {
  const byVendor = new Map<string, { total: number; count: number }>()

  for (const r of rows) {
    const raw = typeof r.vendor === 'string' ? r.vendor.trim() : ''
    if (!raw) continue
    const amt = Number(r.amount ?? 0)
    const cur = byVendor.get(raw) ?? { total: 0, count: 0 }
    cur.total += amt
    cur.count += 1
    byVendor.set(raw, cur)
  }

  return [...byVendor.entries()]
    .map(([vendor, { total, count }]) => ({ vendor, total, count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

export async function getTopVendors(
  farmId: string,
  limit = 5,
  range?: { dateFrom?: string; dateTo?: string }
): Promise<TopVendorRow[]> {
  const rows = await fetchExpenseAggregateRows(farmId, range)
  return computeTopVendors(rows, limit)
}

export async function getExpenseAnalyticsBundle(
  farmId: string,
  range?: { dateFrom?: string; dateTo?: string }
): Promise<{
  stats: ExpenseDashboardStats
  categoryBreakdown: CategoryBreakdownRow[]
  topVendors: TopVendorRow[]
}> {
  const rows = await fetchExpenseAggregateRows(farmId, range)
  return {
    stats: computeExpenseDashboardStats(rows),
    categoryBreakdown: computeCategoryBreakdown(rows),
    topVendors: computeTopVendors(rows, 5),
  }
}

export interface ExpenseListResult {
  rows: Expense[]
  total: number
  page: number
  pageSize: number
}

/** Paginated expense list with total count (for table + footer). */
export async function getExpensesWithStats(
  farmId: string,
  filters: {
    dateFrom?: string
    dateTo?: string
    category?: string
    status?: PaymentStatusFilter
    page?: number
    pageSize?: number
  }
): Promise<ExpenseListResult> {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 12))
  const offset = (page - 1) * pageSize

  const supabase = await createClient()
  let q = supabase
    .from('expenses')
    .select(
      'id, farm_id, date, expense_date, amount, category, description, vendor, payment_method, reference, notes, created_at',
      { count: 'exact' }
    )
    .eq('farm_id', farmId)

  if (filters.dateFrom) {
    q = q.gte('expense_date', filters.dateFrom)
  }
  if (filters.dateTo) {
    q = q.lte('expense_date', filters.dateTo)
  }
  if (filters.category && filters.category !== 'all' && filters.category !== '') {
    q = q.eq('category', filters.category)
  }
  if (filters.status === 'pending') {
    q = q.eq('payment_method', 'pending')
  } else if (filters.status === 'paid') {
    q = q.or('payment_method.is.null,payment_method.neq.pending')
  }

  q = q
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  const { data, error, count } = await q
  if (error) {
    console.error('[getExpensesWithStats]', error.message)
    return { rows: [], total: 0, page, pageSize }
  }

  return {
    rows: (data ?? []).map((row) =>
      normalizeExpenseRow(row as Record<string, unknown>)
    ),
    total: count ?? 0,
    page,
    pageSize,
  }
}
