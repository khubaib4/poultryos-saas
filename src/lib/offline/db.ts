import Dexie, { type Table } from 'dexie'

export type SyncStatus = 'pending' | 'synced' | 'failed' | 'syncing'

export interface SyncQueueRecord {
  id: string
  opKind: string
  payload: unknown
  status: 'pending' | 'syncing' | 'failed'
  timestamp: number
  retryCount: number
}

export interface CacheMetaRecord {
  table: string
  cachedAt: number
}

/** Local copy of a daily entry row (server or offline). */
export interface OfflineDailyEntryRow {
  id: string
  farmId: string
  flockId: string
  date: string
  eggs_collected: number
  eggs_grade_a?: number
  eggs_grade_b?: number
  eggs_cracked?: number
  deaths: number
  death_cause?: string | null
  feed_consumed?: number | null
  notes?: string | null
  syncStatus: SyncStatus
  created_at: string
  updated_at?: string
  flocks?: { batch_number: string }
}

export interface OfflineExpenseRow {
  id: string
  farmId: string
  category: string
  amount: number
  expense_date: string
  description: string
  vendor?: string | null
  payment_method: string
  reference?: string | null
  notes?: string | null
  syncStatus: SyncStatus
  created_at: string
}

export interface OfflineSaleRow {
  id: string
  farmId: string
  customer_id: string | null
  sale_date: string
  line_items_json: string
  discount_type: string | null
  discount_value: number
  initial_paid: number
  notes: string | null
  syncStatus: SyncStatus
  created_at: string
}

export interface OfflineInventoryTxRow {
  id: string
  itemId: string
  farmId: string
  type: 'add' | 'reduce'
  quantity: number
  reason: string | null
  syncStatus: SyncStatus
  created_at: string
}

class PoultryOSDatabase extends Dexie {
  dailyEntries!: Table<OfflineDailyEntryRow, string>
  sales!: Table<OfflineSaleRow, string>
  expenses!: Table<OfflineExpenseRow, string>
  customers!: Table<Record<string, unknown>, string>
  inventory!: Table<Record<string, unknown>, string>
  vaccinations!: Table<Record<string, unknown>, string>
  flocks!: Table<Record<string, unknown>, string>
  syncQueue!: Table<SyncQueueRecord, string>
  cacheMeta!: Table<CacheMetaRecord, string>

  constructor() {
    super('PoultryOSOffline')
    this.version(1).stores({
      dailyEntries: 'id, farmId, flockId, date, syncStatus',
      sales: 'id, farmId, syncStatus',
      expenses: 'id, farmId, syncStatus',
      customers: 'id, farmId, syncStatus',
      inventory: 'id, farmId, syncStatus',
      vaccinations: 'id, farmId, syncStatus',
      flocks: 'id, farmId, syncStatus',
      syncQueue: 'id, status, timestamp, opKind',
      cacheMeta: 'table',
    })
  }
}

export const db = new PoultryOSDatabase()
