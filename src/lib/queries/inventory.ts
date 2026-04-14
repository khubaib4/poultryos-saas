import { createClient } from '@/lib/supabase/server'
import type { InventoryItem, InventoryTransaction } from '@/types/database'

export {
  INVENTORY_TYPES,
  INVENTORY_UNITS,
  type InventoryType,
  type InventoryUnit,
} from '@/lib/inventory-constants'

export const INVENTORY_CATEGORY_PILLS = [
  'All',
  'Feed',
  'Medicine',
  'Equipment',
  'Packaging',
] as const

export type InventoryCategoryPill = (typeof INVENTORY_CATEGORY_PILLS)[number]
export type InventoryStatusFilter = 'all' | 'in' | 'low' | 'out'
export type InventorySortKey = 'newest' | 'name' | 'quantity_desc'

export interface InventoryFilters {
  type?: string
  limit?: number
  /** Stitch category bar: Medicine includes Vaccine. */
  categoryPill?: string
}

export async function getInventory(
  farmId: string,
  filters?: InventoryFilters
): Promise<InventoryItem[]> {
  const supabase = await createClient()

  let q = supabase
    .from('inventory')
    .select(
      'id, farm_id, type, name, unit, current_stock, min_stock, unit_price, last_restocked_at, notes, created_at, updated_at'
    )
    .eq('farm_id', farmId)
    .order('name', { ascending: true })

  if (filters?.categoryPill && filters.categoryPill !== 'All') {
    const pill = filters.categoryPill
    if (pill === 'Medicine') {
      q = q.in('type', ['Medicine', 'Vaccine'])
    } else if (pill === 'Feed') {
      q = q.eq('type', 'Feed')
    } else if (pill === 'Equipment') {
      q = q.eq('type', 'Equipment')
    } else if (pill === 'Packaging') {
      q = q.eq('type', 'Packaging')
    }
  } else if (filters?.type && filters.type !== 'All') {
    q = q.ilike('type', filters.type)
  }
  if (filters?.limit) {
    q = q.limit(filters.limit)
  } else {
    q = q.limit(500)
  }

  const { data, error } = await q
  if (error) {
    console.error('[getInventory]', error.message)
    return []
  }
  return (data ?? []) as InventoryItem[]
}

export interface InventoryItemDetail extends InventoryItem {
  transactions: InventoryTransaction[]
}

export async function getInventoryItem(
  itemId: string
): Promise<InventoryItemDetail | null> {
  const supabase = await createClient()

  const { data: row, error } = await supabase
    .from('inventory')
    .select(
      'id, farm_id, type, name, unit, current_stock, min_stock, unit_price, last_restocked_at, notes, created_at, updated_at'
    )
    .eq('id', itemId)
    .maybeSingle()

  if (error || !row) {
    if (error) console.error('[getInventoryItem]', error.message)
    return null
  }

  const transactions = await getInventoryTransactions(itemId, 50)

  return {
    ...(row as InventoryItem),
    transactions,
  }
}

export async function getInventoryItemForFarm(
  itemId: string,
  farmId: string
): Promise<InventoryItemDetail | null> {
  const item = await getInventoryItem(itemId)
  if (!item || item.farm_id !== farmId) return null
  return item
}

export interface InventorySummary {
  totalItems: number
  /** Above zero, at or below min (reorder). */
  lowStockCount: number
  /** Zero on hand. */
  outOfStockCount: number
  totalValue: number
  /** New SKUs vs prior 30d window, for stat trend. */
  itemsTrendPct: number | null
  /** e.g. "+Rs 12k" from signed stock value change via txs (7d). */
  valueTrendLabel: string | null
}

export async function getInventorySummary(farmId: string): Promise<InventorySummary> {
  const items = await getInventory(farmId, { limit: 5000 })
  let totalValue = 0
  let lowStockCount = 0
  let outOfStockCount = 0

  for (const it of items) {
    const stock = Number(it.current_stock ?? 0)
    const min = Number(it.min_stock ?? 0)
    const price = Number(it.unit_price ?? 0)
    totalValue += stock * price
    if (stock <= 0) {
      outOfStockCount += 1
    } else if (min > 0 && stock <= min) {
      lowStockCount += 1
    }
  }

  const [itemsTrendPct, valueTrendLabel] = await Promise.all([
    getInventoryItemsTrendPct(farmId),
    getInventoryValueTrendLabel(farmId, items),
  ])

  return {
    totalItems: items.length,
    lowStockCount,
    outOfStockCount,
    totalValue,
    itemsTrendPct,
    valueTrendLabel,
  }
}

async function getInventoryItemsTrendPct(farmId: string): Promise<number | null> {
  const supabase = await createClient()
  const now = Date.now()
  const t30 = new Date(now - 30 * 86400000).toISOString()
  const t60 = new Date(now - 60 * 86400000).toISOString()

  const { count: recent, error: e1 } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('farm_id', farmId)
    .gte('created_at', t30)

  const { count: prev, error: e2 } = await supabase
    .from('inventory')
    .select('*', { count: 'exact', head: true })
    .eq('farm_id', farmId)
    .gte('created_at', t60)
    .lt('created_at', t30)

  if (e1 || e2) return null
  const nR = recent ?? 0
  const nP = prev ?? 0
  if (nP <= 0 && nR <= 0) return null
  if (nP <= 0) return nR > 0 ? 100 : null
  return Math.round(((nR - nP) / nP) * 1000) / 10
}

function formatCompactTrendRs(n: number): string {
  const abs = Math.abs(Math.round(n))
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000
    const s = m >= 10 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, '')
    return `${n >= 0 ? '+' : '-'}Rs ${s}m`
  }
  if (abs >= 1000) {
    return `${n >= 0 ? '+' : '-'}Rs ${Math.round(abs / 1000)}k`
  }
  return `${n >= 0 ? '+' : '-'}Rs ${abs.toLocaleString()}`
}

async function getInventoryValueTrendLabel(
  farmId: string,
  items: InventoryItem[]
): Promise<string | null> {
  const supabase = await createClient()
  const since = new Date(Date.now() - 7 * 86400000).toISOString()
  const ids = items.map((i) => i.id)
  if (ids.length === 0) return null

  const priceById = new Map(items.map((i) => [i.id, Number(i.unit_price ?? 0)]))

  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('inventory_id, type, quantity, created_at')
    .in('inventory_id', ids)
    .gte('created_at', since)

  if (error || !data?.length) return null

  let delta = 0
  for (const row of data) {
    const r = row as {
      inventory_id: string
      type: string
      quantity: number
    }
    const p = priceById.get(r.inventory_id) ?? 0
    const q = Number(r.quantity ?? 0)
    const sign = (r.type ?? '').toLowerCase() === 'add' ? 1 : -1
    delta += sign * q * p
  }

  if (Math.abs(delta) < 1) return null
  return formatCompactTrendRs(delta)
}

export function getLowStockCount(summary: InventorySummary): number {
  return summary.lowStockCount
}

export interface InventoryListResult {
  rows: InventoryItem[]
  total: number
  page: number
  pageSize: number
}

function filterInventoryByStatus(
  items: InventoryItem[],
  status: InventoryStatusFilter
): InventoryItem[] {
  if (status === 'all') return items
  return items.filter((it) => {
    const c = Number(it.current_stock ?? 0)
    const m = Number(it.min_stock ?? 0)
    if (status === 'out') return c <= 0
    if (status === 'low') return c > 0 && m > 0 && c <= m
    if (status === 'in') return c > m || (m <= 0 && c > 0)
    return true
  })
}

function sortInventoryItems(
  items: InventoryItem[],
  sort: InventorySortKey
): InventoryItem[] {
  const copy = [...items]
  if (sort === 'name') {
    copy.sort((a, b) => a.name.localeCompare(b.name))
  } else if (sort === 'quantity_desc') {
    copy.sort(
      (a, b) => Number(b.current_stock ?? 0) - Number(a.current_stock ?? 0)
    )
  } else {
    copy.sort((a, b) => {
      const tb = new Date(b.updated_at ?? b.created_at).getTime()
      const ta = new Date(a.updated_at ?? a.created_at).getTime()
      return tb - ta
    })
  }
  return copy
}

/** Paginated list with category pill + status + sort (in-memory filter on farm inventory). */
export async function getInventoryWithStats(
  farmId: string,
  opts: {
    categoryPill?: string
    status?: InventoryStatusFilter
    sort?: InventorySortKey
    page?: number
    pageSize?: number
  }
): Promise<InventoryListResult> {
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 10))
  const pill = opts.categoryPill ?? 'All'
  const status = opts.status ?? 'all'
  const sort = opts.sort ?? 'newest'

  const items = await getInventory(farmId, {
    categoryPill: pill,
    limit: 5000,
  })
  const filtered = sortInventoryItems(filterInventoryByStatus(items, status), sort)
  const total = filtered.length
  const start = (page - 1) * pageSize
  return {
    rows: filtered.slice(start, start + pageSize),
    total,
    page,
    pageSize,
  }
}

export async function getLowStockItems(farmId: string): Promise<InventoryItem[]> {
  const items = await getInventory(farmId, { limit: 2000 })
  return items.filter((it) => Number(it.current_stock) <= Number(it.min_stock))
}

export async function getInventoryTransactions(
  inventoryId: string,
  limit = 100
): Promise<InventoryTransaction[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_transactions')
    .select(
      'id, inventory_id, type, quantity, reason, transaction_date, created_by, created_at'
    )
    .eq('inventory_id', inventoryId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getInventoryTransactions]', error.message)
    return []
  }
  return (data ?? []) as InventoryTransaction[]
}

export interface InventoryActivityEntry {
  id: string
  kind: 'add' | 'reduce' | 'threshold'
  title: string
  subtitle: string
  at: string
}

/** Recent transactions + current low-stock items for the activity feed. */
export async function getRecentInventoryActivity(
  farmId: string,
  limit = 8
): Promise<InventoryActivityEntry[]> {
  const items = await getInventory(farmId, { limit: 5000 })
  const byId = new Map(items.map((i) => [i.id, i]))
  const ids = items.map((i) => i.id)
  if (ids.length === 0) return []

  const supabase = await createClient()
  const { data: txs, error } = await supabase
    .from('inventory_transactions')
    .select('id, type, quantity, reason, created_at, inventory_id')
    .in('inventory_id', ids)
    .order('created_at', { ascending: false })
    .limit(25)

  if (error) {
    console.error('[getRecentInventoryActivity]', error.message)
  }

  const fromTx: InventoryActivityEntry[] = (txs ?? []).map((raw) => {
    const t = raw as {
      id: string
      type: string
      quantity: number
      reason?: string | null
      created_at: string
      inventory_id: string
    }
    const it = byId.get(t.inventory_id)
    const name = it?.name ?? 'Item'
    const unit = (it?.unit ?? '').toUpperCase()
    const qty = Number(t.quantity ?? 0)
    const isAdd = (t.type ?? '').toLowerCase() === 'add'
    return {
      id: `tx-${t.id}`,
      kind: isAdd ? ('add' as const) : ('reduce' as const),
      title: isAdd ? `Stock added: ${name}` : `Stock removed: ${name}`,
      subtitle: `${qty.toLocaleString()} ${unit}${t.reason ? ` · ${t.reason}` : ''}`.trim(),
      at: t.created_at,
    }
  })

  const lowItems = items
    .filter((i) => {
      const c = Number(i.current_stock)
      const m = Number(i.min_stock)
      return c > 0 && m > 0 && c <= m
    })
    .sort(
      (a, b) =>
        new Date(b.updated_at ?? b.created_at).getTime() -
        new Date(a.updated_at ?? a.created_at).getTime()
    )
    .slice(0, 5)

  const fromThreshold: InventoryActivityEntry[] = lowItems.map((it) => ({
    id: `th-${it.id}`,
    kind: 'threshold' as const,
    title: 'Stock threshold reached',
    subtitle: `${it.name} below reorder level`,
    at: it.updated_at ?? it.created_at,
  }))

  const merged = [...fromTx, ...fromThreshold].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  )

  const seen = new Set<string>()
  const out: InventoryActivityEntry[] = []
  for (const e of merged) {
    const key = `${e.kind}-${e.id}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(e)
    if (out.length >= limit) break
  }
  return out
}

/** @alias {@link getRecentInventoryActivity} */
export const getRecentTransactions = getRecentInventoryActivity
