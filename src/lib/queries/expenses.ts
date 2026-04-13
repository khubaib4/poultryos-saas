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
