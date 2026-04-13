import { createClient } from '@/lib/supabase/server'
import type { Customer, Payment, SaleLineItem } from '@/types/database'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export interface CustomerFilters {
  search?: string
  category?: string
}

export interface CustomerStats {
  totalPurchases: number
  totalPaid: number
  balanceDue: number
  saleCount: number
}

export type CustomerSortKey = 'recent' | 'name' | 'balance_desc'

export type CustomerCategoryKey =
  | 'all'
  | 'individual'
  | 'retailer'
  | 'wholesaler'
  | 'restaurant'
  | 'other'

export const CUSTOMER_CATEGORY_PILLS: {
  key: CustomerCategoryKey
  label: string
  db?: string
}[] = [
  { key: 'all', label: 'All' },
  { key: 'individual', label: 'Individual', db: 'Individual' },
  { key: 'retailer', label: 'Retailer', db: 'Retailer' },
  { key: 'wholesaler', label: 'Wholesaler', db: 'Wholesaler' },
  { key: 'restaurant', label: 'Restaurant', db: 'Restaurant' },
  { key: 'other', label: 'Other', db: 'Other' },
]

export interface CustomerWithStats extends Customer {
  total_purchases: number
  balance_due: number
  last_activity_at?: string | null
}

export interface CustomersListPack {
  customers: CustomerWithStats[]
  stats: {
    totalCustomers: number
    activeCustomers: number
    retentionRatePct: number
    totalReceivables: number
    overdueInvoices: number
    monthSales: number
  }
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

/**
 * Customers for a farm, optional search (name, phone, business_name) and category.
 */
export async function getCustomers(
  farmId: string,
  filters?: CustomerFilters
): Promise<Customer[]> {
  const supabase = await createClient()

  let q = supabase
    .from('customers')
    .select(
      'id, farm_id, name, phone, business_name, address, category, is_active, notes, created_at, updated_at'
    )
    .eq('farm_id', farmId)
    .order('name', { ascending: true })

  if (filters?.category && filters.category !== 'All') {
    q = q.eq('category', filters.category)
  }

  if (filters?.search?.trim()) {
    const raw = filters.search.trim().replace(/,/g, '')
    const p = `%${raw}%`
    q = q.or(`name.ilike.${p},phone.ilike.${p},business_name.ilike.${p}`)
  }

  const { data, error } = await q
  if (error) {
    console.error('[getCustomers]', error.message)
    return []
  }
  return (data ?? []) as Customer[]
}

/**
 * Customers list for Stitch UI: returns customers plus purchase/balance aggregates,
 * and the page-level stat cards.
 */
export async function getCustomersWithStats(
  farmId: string,
  opts?: {
    search?: string
    categoryKey?: CustomerCategoryKey
    sort?: CustomerSortKey
  }
): Promise<CustomersListPack> {
  const supabase = await createClient()

  const categoryDb =
    CUSTOMER_CATEGORY_PILLS.find((c) => c.key === opts?.categoryKey)?.db ?? null

  // Base customers list
  let qc = supabase
    .from('customers')
    .select(
      'id, farm_id, name, phone, business_name, address, category, is_active, notes, created_at, updated_at'
    )
    .eq('farm_id', farmId)

  if (categoryDb) {
    qc = qc.eq('category', categoryDb)
  }

  if (opts?.search?.trim()) {
    const raw = opts.search.trim().replace(/,/g, '')
    const p = `%${raw}%`
    qc = qc.or(`name.ilike.${p},phone.ilike.${p},business_name.ilike.${p}`)
  }

  const { data: customersRaw, error: custErr } = await qc
  if (custErr) {
    console.error('[getCustomersWithStats:customers]', custErr.message)
    return {
      customers: [],
      stats: {
        totalCustomers: 0,
        activeCustomers: 0,
        retentionRatePct: 0,
        totalReceivables: 0,
        overdueInvoices: 0,
        monthSales: 0,
      },
    }
  }

  const customers = (customersRaw ?? []) as Customer[]
  const customerIds = customers.map((c) => c.id)

  // Sales aggregates (used for both cards + per-customer numbers)
  const { data: salesRaw, error: salesErr } = await supabase
    .from('sales')
    .select('id, customer_id, sale_date, due_date, total_amount, balance_due')
    .eq('farm_id', farmId)
    .in('customer_id', customerIds.length ? customerIds : ['__none__'])

  if (salesErr) {
    console.error('[getCustomersWithStats:sales]', salesErr.message)
  }

  type SaleAggRow = {
    id: string
    customer_id?: string | null
    sale_date: string
    due_date?: string | null
    total_amount?: number | null
    balance_due?: number | null
  }

  const perCustomer = new Map<
    string,
    { total: number; balance: number; last: string | null }
  >()
  let totalReceivables = 0
  let overdueInvoices = 0

  const todayIso = format(new Date(), 'yyyy-MM-dd')
  for (const s of (salesRaw ?? []) as SaleAggRow[]) {
    const cid = s.customer_id ? String(s.customer_id) : null
    if (!cid) continue
    const total = Number(s.total_amount ?? 0)
    const balance = Number(s.balance_due ?? 0)

    const cur = perCustomer.get(cid) ?? { total: 0, balance: 0, last: null }
    cur.total += total
    cur.balance += balance
    const activityDate = (s.sale_date ?? '').slice(0, 10)
    if (activityDate && (!cur.last || activityDate > cur.last)) cur.last = activityDate
    perCustomer.set(cid, cur)

    totalReceivables += balance
    const due = (s.due_date ?? '').slice(0, 10)
    if (balance > 0 && due && due < todayIso) overdueInvoices += 1
  }

  // Month sales (for stats card)
  const start = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const end = format(endOfMonth(new Date()), 'yyyy-MM-dd')
  const { data: monthSalesRaw, error: monthErr } = await supabase
    .from('sales')
    .select('total_amount')
    .eq('farm_id', farmId)
    .gte('sale_date', start)
    .lte('sale_date', end)
  if (monthErr) console.error('[getCustomersWithStats:monthSales]', monthErr.message)
  const monthSales = (monthSalesRaw ?? []).reduce(
    (s, r) => s + Number((r as { total_amount?: number | null }).total_amount ?? 0),
    0
  )

  const enriched: CustomerWithStats[] = customers.map((c) => {
    const agg = perCustomer.get(c.id)
    return {
      ...c,
      total_purchases: Math.round(Number(agg?.total ?? 0)),
      balance_due: Math.round(Number(agg?.balance ?? 0)),
      last_activity_at: agg?.last ?? c.updated_at ?? c.created_at,
    }
  })

  const sort = opts?.sort ?? 'recent'
  enriched.sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name)
    if (sort === 'balance_desc') return Number(b.balance_due) - Number(a.balance_due)
    return String(b.last_activity_at ?? '').localeCompare(String(a.last_activity_at ?? ''))
  })

  const totalCustomers = customers.length
  const activeCustomers = customers.filter((c) => c.is_active).length
  const retentionRatePct =
    totalCustomers > 0 ? Math.round((activeCustomers / totalCustomers) * 1000) / 10 : 0

  return {
    customers: enriched,
    stats: {
      totalCustomers,
      activeCustomers,
      retentionRatePct,
      totalReceivables: Math.round(totalReceivables),
      overdueInvoices,
      monthSales: Math.round(monthSales),
    },
  }
}

/**
 * Single customer by id (RLS also applies).
 */
export async function getCustomer(customerId: string): Promise<Customer | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customers')
    .select(
      'id, farm_id, name, phone, business_name, address, category, is_active, notes, created_at, updated_at'
    )
    .eq('id', customerId)
    .maybeSingle()

  if (error || !data) return null
  return data as Customer
}

/** Customer only if it belongs to the farm (extra app-layer check). */
export async function getCustomerForFarm(
  customerId: string,
  farmId: string
): Promise<Customer | null> {
  const row = await getCustomer(customerId)
  if (!row || row.farm_id !== farmId) return null
  return row
}

/**
 * Aggregates from sales linked by customer_id. Balance due is placeholder until payments exist.
 */
export async function getCustomerStats(
  customerId: string,
  farmId: string
): Promise<CustomerStats> {
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from('sales')
    .select('total_amount, paid_amount, balance_due, amount')
    .eq('farm_id', farmId)
    .eq('customer_id', customerId)

  if (error) {
    console.error('[getCustomerStats]', error.message)
    return {
      totalPurchases: 0,
      totalPaid: 0,
      balanceDue: 0,
      saleCount: 0,
    }
  }

  const list = rows ?? []
  const totalPurchases = list.reduce(
    (s, r) =>
      s +
      Number(
        (r as { total_amount?: number | null; amount?: number | null })
          .total_amount ??
          (r as { amount?: number | null }).amount ??
          0
      ),
    0
  )
  const totalPaid = list.reduce(
    (s, r) => s + Number((r as { paid_amount?: number | null }).paid_amount ?? 0),
    0
  )
  const balanceDue = list.reduce(
    (s, r) => s + Number((r as { balance_due?: number | null }).balance_due ?? 0),
    0
  )

  return {
    totalPurchases,
    totalPaid,
    balanceDue,
    saleCount: list.length,
  }
}

export interface CustomerSaleRow {
  id: string
  sale_date: string
  amount: number
  customer_name?: string | null
  notes?: string | null
}

/**
 * Recent sales for a customer (requires sales.customer_id populated).
 */
export async function getCustomerRecentSales(
  customerId: string,
  farmId: string,
  limit = 20
): Promise<CustomerSaleRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sales')
    .select(
      'id, sale_date, invoice_number, total_amount, amount, customer_name, notes, payment_status'
    )
    .eq('farm_id', farmId)
    .eq('customer_id', customerId)
    .order('sale_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getCustomerRecentSales]', error.message)
    return []
  }
  return (data ?? []).map((row) => {
    const r = row as {
      id: string
      sale_date: string
      total_amount?: number | null
      amount?: number | null
      customer_name?: string | null
      notes?: string | null
    }
    return {
      id: r.id,
      sale_date: r.sale_date,
      amount: Number(r.total_amount ?? r.amount ?? 0),
      customer_name: r.customer_name,
      notes: r.notes,
    }
  }) as CustomerSaleRow[]
}

export type CustomerTransactionKind = 'sale' | 'payment'

export interface CustomerTransactionRow {
  id: string
  kind: CustomerTransactionKind
  date: string
  title: string
  subtitle?: string | null
  status: 'completed' | 'confirmed' | 'pending'
  amount: number
}

export interface CustomerDetailPack {
  customer: Customer
  totals: { totalSales: number; totalPaid: number; balance: number }
  openSales: { id: string; invoice_number: string; balance_due: number; sale_date: string }[]
  transactions: CustomerTransactionRow[]
  paymentDueBanner:
    | null
    | {
        status: 'upcoming' | 'today' | 'overdue' | 'ok'
        days: number
        message: string
        due_date?: string | null
        invoice_number?: string | null
      }
}

function getPaymentDueStatus(dueDate: string | null) {
  if (!dueDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays > 0) {
    return {
      status: 'upcoming' as const,
      days: diffDays,
      message: `Payment due in ${diffDays} day${diffDays > 1 ? 's' : ''}`,
    }
  }
  if (diffDays === 0) {
    return { status: 'today' as const, days: 0, message: 'Payment due today' }
  }
  const overdueDays = Math.abs(diffDays)
  return {
    status: 'overdue' as const,
    days: overdueDays,
    message: `Payment overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}`,
  }
}

export async function getCustomerDetail(
  customerId: string,
  farmId: string,
  limit = 50
): Promise<CustomerDetailPack | null> {
  const supabase = await createClient()
  const customer = await getCustomerForFarm(customerId, farmId)
  if (!customer) return null

  const { data: salesRaw, error: salesErr } = await supabase
    .from('sales')
    .select(
      'id, invoice_number, sale_date, due_date, total_amount, paid_amount, balance_due, payment_status, line_items'
    )
    .eq('farm_id', farmId)
    .eq('customer_id', customerId)
    .order('sale_date', { ascending: false })
    .limit(limit)

  if (salesErr) {
    console.error('[getCustomerDetail:sales]', salesErr.message)
    return {
      customer,
      totals: { totalSales: 0, totalPaid: 0, balance: 0 },
      openSales: [],
      transactions: [],
      paymentDueBanner: null,
    }
  }

  type SaleRow = {
    id: string
    invoice_number: string
    sale_date: string
    due_date?: string | null
    total_amount?: number | null
    paid_amount?: number | null
    balance_due?: number | null
    payment_status?: string | null
    line_items?: unknown
  }

  const sales = (salesRaw ?? []) as SaleRow[]
  const saleIds = sales.map((s) => s.id)

  const { data: paymentsRaw, error: payErr } = await supabase
    .from('payments')
    .select('id, sale_id, amount, payment_date, payment_method, notes, created_at')
    .in('sale_id', saleIds.length ? saleIds : ['__none__'])
    .order('payment_date', { ascending: false })
    .limit(limit)

  if (payErr) console.error('[getCustomerDetail:payments]', payErr.message)

  const totals = sales.reduce(
    (acc, s) => {
      acc.totalSales += Number(s.total_amount ?? 0)
      acc.totalPaid += Number(s.paid_amount ?? 0)
      acc.balance += Number(s.balance_due ?? 0)
      return acc
    },
    { totalSales: 0, totalPaid: 0, balance: 0 }
  )

  const openSales = sales
    .filter((s) => Number(s.balance_due ?? 0) > 0.0001)
    .map((s) => ({
      id: s.id,
      invoice_number: s.invoice_number,
      balance_due: Number(s.balance_due ?? 0),
      sale_date: s.sale_date,
    }))

  // Find nearest due date among unpaid/partial invoices.
  const nearestDueSale = sales
    .filter(
      (s) =>
        Number(s.balance_due ?? 0) > 0.0001 &&
        Boolean((s.due_date ?? '').slice(0, 10))
    )
    .sort((a, b) =>
      String(a.due_date ?? '').localeCompare(String(b.due_date ?? ''))
    )[0]

  const duePayload = getPaymentDueStatus(
    nearestDueSale?.due_date ? String(nearestDueSale.due_date).slice(0, 10) : null
  )

  const paymentDueBanner: CustomerDetailPack['paymentDueBanner'] =
    duePayload && nearestDueSale
      ? {
          ...duePayload,
          due_date: nearestDueSale.due_date ?? null,
          invoice_number: nearestDueSale.invoice_number ?? null,
        }
      : totals.balance <= 0.0001
        ? {
            status: 'ok',
            days: 0,
            message: 'All payments up to date',
          }
        : null

  function mapSaleStatus(raw?: string | null): CustomerTransactionRow['status'] {
    if (raw === 'paid') return 'completed'
    if (raw === 'partial') return 'pending'
    if (raw === 'unpaid') return 'pending'
    return 'confirmed'
  }

  const tx: CustomerTransactionRow[] = []

  for (const s of sales) {
    const items = parseLineItems(s.line_items)
    const itemLabel =
      items.length > 0 ? `${items[0]?.type ?? 'Sale'}${items.length > 1 ? ` +${items.length - 1}` : ''}` : 'Sale'
    tx.push({
      id: s.id,
      kind: 'sale',
      date: s.sale_date,
      title: itemLabel,
      subtitle: `Invoice ${s.invoice_number}`,
      status: mapSaleStatus(s.payment_status),
      amount: Number(s.total_amount ?? 0),
    })
  }

  for (const p of (paymentsRaw ?? []) as Payment[]) {
    tx.push({
      id: p.id,
      kind: 'payment',
      date: p.payment_date,
      title: 'Payment',
      subtitle: p.payment_method?.replace(/_/g, ' ') ?? null,
      status: 'confirmed',
      amount: Number(p.amount ?? 0),
    })
  }

  tx.sort((a, b) => String(b.date).localeCompare(String(a.date)))

  return {
    customer,
    totals,
    openSales,
    transactions: tx.slice(0, limit),
    paymentDueBanner,
  }
}

export interface RecentCollectionRow {
  id: string
  customer_id: string | null
  customer_name: string
  customer_category?: string | null
  payment_date: string
  payment_method: string
  amount: number
}

export async function getRecentCollections(
  farmId: string,
  limit = 6
): Promise<RecentCollectionRow[]> {
  const supabase = await createClient()

  // Pull recent farm sales ids, then payments from those ids (avoids embedded joins)
  const { data: sales, error: salesErr } = await supabase
    .from('sales')
    .select('id, customer_id')
    .eq('farm_id', farmId)
    .order('sale_date', { ascending: false })
    .limit(200)

  if (salesErr) {
    console.error('[getRecentCollections:sales]', salesErr.message)
    return []
  }

  const saleIds = (sales ?? []).map((s) => String((s as { id: string }).id))
  const saleCustomer = new Map<string, string | null>()
  for (const s of sales ?? []) {
    saleCustomer.set(
      String((s as { id: string }).id),
      ((s as { customer_id?: string | null }).customer_id ?? null) as string | null
    )
  }

  if (!saleIds.length) return []

  const { data: payments, error: payErr } = await supabase
    .from('payments')
    .select('id, sale_id, amount, payment_date, payment_method')
    .in('sale_id', saleIds)
    .order('payment_date', { ascending: false })
    .limit(limit)

  if (payErr) {
    console.error('[getRecentCollections:payments]', payErr.message)
    return []
  }

  const customerIds = [...new Set((payments ?? []).map((p) => saleCustomer.get(String((p as Payment).sale_id))).filter(Boolean) as string[])]
  const { data: custRows } = await supabase
    .from('customers')
    .select('id, name, category')
    .in('id', customerIds.length ? customerIds : ['__none__'])

  const custMap = new Map<string, { name: string; category?: string | null }>()
  for (const c of custRows ?? []) {
    custMap.set(String((c as { id: string }).id), {
      name: String((c as { name: string }).name),
      category: (c as { category?: string | null }).category ?? null,
    })
  }

  return (payments ?? []).map((p) => {
    const pay = p as unknown as Payment
    const cid = saleCustomer.get(String(pay.sale_id)) ?? null
    const c = cid ? custMap.get(cid) : null
    return {
      id: pay.id,
      customer_id: cid,
      customer_name: c?.name ?? 'Customer',
      customer_category: c?.category ?? null,
      payment_date: pay.payment_date,
      payment_method: pay.payment_method ?? 'cash',
      amount: Number(pay.amount ?? 0),
    }
  })
}
