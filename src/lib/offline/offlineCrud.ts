import type { DailyEntryFormPayload } from '@/lib/actions/daily-entries'
import type { ExpenseFormPayload } from '@/lib/actions/expenses'
import type { SaleFormPayload } from '@/lib/actions/sales'
import {
  db,
  type OfflineDailyEntryRow,
  type OfflineExpenseRow,
  type OfflineSaleRow,
  type SyncQueueRecord,
} from '@/lib/offline/db'
import { OP } from '@/lib/offline/ops'
import { createTempId } from '@/lib/offline/tempId'

export async function enqueueSync(partial: {
  id?: string
  opKind: string
  payload: unknown
  timestamp: number
  status?: SyncQueueRecord['status']
  retryCount?: number
}): Promise<string> {
  const id = partial.id ?? createTempId('q')
  await db.syncQueue.put({
    id,
    opKind: partial.opKind,
    payload: partial.payload,
    status: partial.status ?? 'pending',
    timestamp: partial.timestamp,
    retryCount: partial.retryCount ?? 0,
  })
  return id
}

function eggTotal(p: Pick<DailyEntryFormPayload, 'eggs_grade_a' | 'eggs_grade_b' | 'eggs_cracked'>) {
  return p.eggs_grade_a + p.eggs_grade_b + p.eggs_cracked
}

export async function createOfflineDailyEntry(
  payload: DailyEntryFormPayload,
  opts: { flockLabel: string }
): Promise<string> {
  const id = createTempId('de')
  const now = new Date().toISOString()
  const row: OfflineDailyEntryRow = {
    id,
    farmId: payload.farm_id,
    flockId: payload.flock_id,
    date: payload.date,
    eggs_collected: eggTotal(payload),
    eggs_grade_a: payload.eggs_grade_a,
    eggs_grade_b: payload.eggs_grade_b,
    eggs_cracked: payload.eggs_cracked,
    deaths: payload.deaths,
    death_cause: payload.death_cause,
    feed_consumed: payload.feed_consumed,
    notes: payload.notes ?? null,
    syncStatus: 'pending',
    created_at: now,
    updated_at: now,
    flocks: { batch_number: opts.flockLabel },
  }
  await db.dailyEntries.add(row)
  await enqueueSync({
    opKind: OP.DAILY_ENTRY_CREATE,
    payload: { tempEntryId: id, data: payload },
    timestamp: Date.now(),
  })
  return id
}

export async function updateOfflineDailyEntry(
  entryId: string,
  payload: DailyEntryFormPayload,
  opts: { flockLabel: string }
): Promise<void> {
  const now = new Date().toISOString()
  const local = await db.dailyEntries.get(entryId)
  const row: OfflineDailyEntryRow = {
    id: entryId,
    farmId: payload.farm_id,
    flockId: payload.flock_id,
    date: payload.date,
    eggs_collected: eggTotal(payload),
    eggs_grade_a: payload.eggs_grade_a,
    eggs_grade_b: payload.eggs_grade_b,
    eggs_cracked: payload.eggs_cracked,
    deaths: payload.deaths,
    death_cause: payload.death_cause,
    feed_consumed: payload.feed_consumed,
    notes: payload.notes ?? null,
    syncStatus: entryId.startsWith('temp_') ? 'pending' : 'pending',
    created_at: local?.created_at ?? now,
    updated_at: now,
    flocks: { batch_number: opts.flockLabel },
  }
  await db.dailyEntries.put(row)
  await enqueueSync({
    opKind: OP.DAILY_ENTRY_UPDATE,
    payload: { entryId, data: payload, clientUpdatedAt: Date.now() },
    timestamp: Date.now(),
  })
}

export async function createOfflineExpense(payload: ExpenseFormPayload): Promise<string> {
  const id = createTempId('ex')
  const now = new Date().toISOString()
  const row: OfflineExpenseRow = {
    id,
    farmId: payload.farm_id,
    category: payload.category,
    amount: payload.amount,
    expense_date: payload.expense_date,
    description: payload.description,
    vendor: payload.vendor ?? null,
    payment_method: payload.payment_method,
    reference: payload.reference ?? null,
    notes: payload.notes ?? null,
    syncStatus: 'pending',
    created_at: now,
  }
  await db.expenses.add(row)
  await enqueueSync({
    opKind: OP.EXPENSE_CREATE,
    payload: { tempId: id, data: payload },
    timestamp: Date.now(),
  })
  return id
}

export async function updateOfflineExpense(
  expenseId: string,
  payload: ExpenseFormPayload
): Promise<void> {
  const now = new Date().toISOString()
  const local = await db.expenses.get(expenseId)
  const row: OfflineExpenseRow = {
    id: expenseId,
    farmId: payload.farm_id,
    category: payload.category,
    amount: payload.amount,
    expense_date: payload.expense_date,
    description: payload.description,
    vendor: payload.vendor ?? null,
    payment_method: payload.payment_method,
    reference: payload.reference ?? null,
    notes: payload.notes ?? null,
    syncStatus: 'pending',
    created_at: local?.created_at ?? now,
  }
  await db.expenses.put(row)
  await enqueueSync({
    opKind: OP.EXPENSE_UPDATE,
    payload: { expenseId, data: payload, clientUpdatedAt: Date.now() },
    timestamp: Date.now(),
  })
}

export async function createOfflineSale(payload: SaleFormPayload): Promise<string> {
  const id = createTempId('sale')
  const now = new Date().toISOString()
  const row: OfflineSaleRow = {
    id,
    farmId: payload.farm_id,
    customer_id: payload.customer_id,
    sale_date: payload.sale_date,
    line_items_json: JSON.stringify(payload.line_items ?? []),
    discount_type: payload.discount_type ?? null,
    discount_value: payload.discount_value ?? 0,
    initial_paid: payload.initial_paid ?? 0,
    notes: payload.notes ?? null,
    syncStatus: 'pending',
    created_at: now,
  }
  await db.sales.add(row)
  await enqueueSync({
    opKind: OP.SALE_CREATE,
    payload: { tempId: id, data: payload },
    timestamp: Date.now(),
  })
  return id
}

export async function updateOfflineSale(saleId: string, payload: SaleFormPayload): Promise<void> {
  const local = await db.sales.get(saleId)
  const now = new Date().toISOString()
  const row: OfflineSaleRow = {
    id: saleId,
    farmId: payload.farm_id,
    customer_id: payload.customer_id,
    sale_date: payload.sale_date,
    line_items_json: JSON.stringify(payload.line_items ?? []),
    discount_type: payload.discount_type ?? null,
    discount_value: payload.discount_value ?? 0,
    initial_paid: 0,
    notes: payload.notes ?? null,
    syncStatus: 'pending',
    created_at: local?.created_at ?? now,
  }
  await db.sales.put(row)
  await enqueueSync({
    opKind: OP.SALE_UPDATE,
    payload: { saleId, data: payload, clientUpdatedAt: Date.now() },
    timestamp: Date.now(),
  })
}

export async function createOfflineInventoryOp(
  kind: typeof OP.INVENTORY_ADD | typeof OP.INVENTORY_REDUCE,
  args: { itemId: string; farmId: string; quantity: number; reason: string | null }
): Promise<void> {
  await enqueueSync({
    opKind: kind,
    payload: args,
    timestamp: Date.now(),
  })
}

export async function getOfflineDailyEntriesForFarm(
  farmId: string,
  from: string,
  to: string
): Promise<OfflineDailyEntryRow[]> {
  const rows = await db.dailyEntries.where('farmId').equals(farmId).toArray()
  return rows.filter((r) => r.date >= from && r.date <= to && r.syncStatus === 'pending')
}

export async function getPendingQueueCount(): Promise<number> {
  return db.syncQueue.where('status').equals('pending').count()
}

export async function getSyncQueueSnapshot(): Promise<SyncQueueRecord[]> {
  return db.syncQueue.orderBy('timestamp').toArray()
}

export async function clearFailedQueueItems(): Promise<void> {
  await db.syncQueue.where('status').equals('failed').delete()
}

export async function clearAllPendingData(): Promise<void> {
  await db.syncQueue.clear()
  await db.dailyEntries.clear()
  await db.expenses.clear()
  await db.sales.clear()
}
