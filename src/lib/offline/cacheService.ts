import type { Table } from 'dexie'
import { db } from '@/lib/offline/db'

const CACHEABLE = [
  'dailyEntries',
  'sales',
  'expenses',
  'customers',
  'inventory',
  'vaccinations',
  'flocks',
] as const

type CacheableTable = (typeof CACHEABLE)[number]

function isCacheable(table: string): table is CacheableTable {
  return (CACHEABLE as readonly string[]).includes(table)
}

export async function cacheData(table: string, rows: unknown[]): Promise<void> {
  if (!isCacheable(table)) {
    await db.cacheMeta.put({ table, cachedAt: Date.now() })
    return
  }
  const tbl = db[table] as { bulkPut: (r: unknown[]) => Promise<unknown> }
  await tbl.bulkPut(rows)
  await db.cacheMeta.put({ table, cachedAt: Date.now() })
}

export async function getCachedData<T extends { farmId?: string }>(
  table: string,
  filters?: { farmId?: string }
): Promise<T[]> {
  if (!isCacheable(table)) return []
  const tbl = db[table as CacheableTable] as Table<T, string>
  const rows = await tbl.toArray()
  if (filters?.farmId) {
    return rows.filter((r) => r.farmId === filters.farmId)
  }
  return rows
}

/** Clears cached rows (IndexedDB), not the sync queue. */
export async function clearCache(table?: string): Promise<void> {
  if (table) {
    if (isCacheable(table)) {
      await (db[table] as { clear: () => Promise<void> }).clear()
    }
    await db.cacheMeta.delete(table)
    return
  }
  await Promise.all(
    CACHEABLE.map((t) => (db[t] as { clear: () => Promise<void> }).clear())
  )
  await db.cacheMeta.clear()
}

export async function getCacheAge(table: string): Promise<number | null> {
  const row = await db.cacheMeta.get(table)
  return row?.cachedAt ?? null
}
