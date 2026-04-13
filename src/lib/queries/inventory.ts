import { createClient } from '@/lib/supabase/server'
import type { InventoryItem, InventoryTransaction } from '@/types/database'

export {
  INVENTORY_TYPES,
  INVENTORY_UNITS,
  type InventoryType,
  type InventoryUnit,
} from '@/lib/inventory-constants'

export interface InventoryFilters {
  type?: string
  limit?: number
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

  if (filters?.type && filters.type !== 'All') {
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
  lowStockCount: number
  totalValue: number
}

export async function getInventorySummary(farmId: string): Promise<InventorySummary> {
  const items = await getInventory(farmId, { limit: 2000 })
  let totalValue = 0
  let lowStockCount = 0

  for (const it of items) {
    const stock = Number(it.current_stock ?? 0)
    const min = Number(it.min_stock ?? 0)
    const price = Number(it.unit_price ?? 0)
    totalValue += stock * price
    if (stock <= min) {
      lowStockCount += 1
    }
  }

  return {
    totalItems: items.length,
    lowStockCount,
    totalValue,
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
