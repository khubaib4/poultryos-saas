import { createClient } from '@/lib/supabase/client'
import {
  createDailyEntryAction,
  updateDailyEntryAction,
} from '@/lib/actions/daily-entries'
import type { DailyEntryFormPayload } from '@/lib/actions/daily-entries'
import { createExpenseAction, updateExpenseAction } from '@/lib/actions/expenses'
import type { ExpenseFormPayload } from '@/lib/actions/expenses'
import { createSaleAction, updateSaleAction } from '@/lib/actions/sales'
import type { SaleFormPayload } from '@/lib/actions/sales'
import { addStockAction, reduceStockAction } from '@/lib/actions/inventory'
import { db, type SyncQueueRecord } from '@/lib/offline/db'
import { OP } from '@/lib/offline/ops'

const MAX_RETRY = 3

let processing = false

export interface SyncStatusCounts {
  pending: number
  syncing: number
  failed: number
}

export async function getSyncStatus(): Promise<SyncStatusCounts> {
  const all = await db.syncQueue.toArray()
  return {
    pending: all.filter((r) => r.status === 'pending').length,
    syncing: all.filter((r) => r.status === 'syncing').length,
    failed: all.filter((r) => r.status === 'failed').length,
  }
}

export function getLastSyncTime(): number | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem('poultryos_last_sync_at')
  return raw ? Number(raw) : null
}

function setLastSyncTime() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem('poultryos_last_sync_at', String(Date.now()))
}

async function handleConflictRemoteNewer(
  table: string,
  id: string,
  clientTs: number | undefined
): Promise<boolean> {
  if (!clientTs) return false
  const supabase = createClient()
  try {
    const { data } = await supabase.from(table).select('updated_at').eq('id', id).maybeSingle()
    const remote = (data as { updated_at?: string } | null)?.updated_at
    if (!remote) return false
    const rt = new Date(remote).getTime()
    return rt > clientTs
  } catch {
    return false
  }
}

export async function syncItem(record: SyncQueueRecord): Promise<void> {
  const { id, opKind, payload } = record

  switch (opKind) {
    case OP.DAILY_ENTRY_CREATE: {
      const { tempEntryId, data } = payload as {
        tempEntryId: string
        data: DailyEntryFormPayload
      }
      const res = await createDailyEntryAction(data)
      if ('error' in res) throw new Error(res.error)
      await db.dailyEntries.delete(tempEntryId)
      break
    }
    case OP.DAILY_ENTRY_UPDATE: {
      const { entryId, data, clientUpdatedAt } = payload as {
        entryId: string
        data: DailyEntryFormPayload
        clientUpdatedAt?: number
      }
      if (entryId.startsWith('temp_')) {
        const res = await createDailyEntryAction(data)
        if ('error' in res) throw new Error(res.error)
        await db.dailyEntries.delete(entryId)
        break
      }
      const skip = await handleConflictRemoteNewer(
        'daily_entries',
        entryId,
        clientUpdatedAt
      )
      if (skip) {
        await db.dailyEntries.delete(entryId)
        break
      }
      const res = await updateDailyEntryAction(entryId, data)
      if ('error' in res) {
        if (res.error.toLowerCase().includes('not found')) {
          await db.dailyEntries.delete(entryId)
          break
        }
        throw new Error(res.error)
      }
      await db.dailyEntries.delete(entryId)
      break
    }
    case OP.EXPENSE_CREATE: {
      const { tempId, data } = payload as { tempId: string; data: ExpenseFormPayload }
      const res = await createExpenseAction(data)
      if ('error' in res) throw new Error(res.error)
      await db.expenses.delete(tempId)
      break
    }
    case OP.EXPENSE_UPDATE: {
      const { expenseId, data, clientUpdatedAt } = payload as {
        expenseId: string
        data: ExpenseFormPayload
        clientUpdatedAt?: number
      }
      if (expenseId.startsWith('temp_')) {
        const res = await createExpenseAction(data)
        if ('error' in res) throw new Error(res.error)
        await db.expenses.delete(expenseId)
        break
      }
      const skip = await handleConflictRemoteNewer('expenses', expenseId, clientUpdatedAt)
      if (skip) {
        await db.expenses.delete(expenseId)
        break
      }
      const res = await updateExpenseAction(expenseId, data)
      if ('error' in res) {
        if (res.error.toLowerCase().includes('not found')) {
          await db.expenses.delete(expenseId)
          break
        }
        throw new Error(res.error)
      }
      await db.expenses.delete(expenseId)
      break
    }
    case OP.SALE_CREATE: {
      const { tempId, data } = payload as { tempId: string; data: SaleFormPayload }
      const res = await createSaleAction(data)
      if ('error' in res) throw new Error(res.error)
      await db.sales.delete(tempId)
      break
    }
    case OP.SALE_UPDATE: {
      const { saleId, data, clientUpdatedAt } = payload as {
        saleId: string
        data: SaleFormPayload
        clientUpdatedAt?: number
      }
      if (saleId.startsWith('temp_')) {
        const res = await createSaleAction(data)
        if ('error' in res) throw new Error(res.error)
        await db.sales.delete(saleId)
        break
      }
      const skip = await handleConflictRemoteNewer('sales', saleId, clientUpdatedAt)
      if (skip) {
        await db.sales.delete(saleId)
        break
      }
      const res = await updateSaleAction(saleId, data)
      if ('error' in res) {
        if (res.error.toLowerCase().includes('not found')) {
          await db.sales.delete(saleId)
          break
        }
        throw new Error(res.error)
      }
      await db.sales.delete(saleId)
      break
    }
    case OP.INVENTORY_ADD: {
      const { itemId, farmId, quantity, reason } = payload as {
        itemId: string
        farmId: string
        quantity: number
        reason: string | null
      }
      const res = await addStockAction(itemId, farmId, quantity, reason ?? undefined)
      if ('error' in res) throw new Error(res.error)
      break
    }
    case OP.INVENTORY_REDUCE: {
      const { itemId, farmId, quantity, reason } = payload as {
        itemId: string
        farmId: string
        quantity: number
        reason: string
      }
      const res = await reduceStockAction(itemId, farmId, quantity, reason)
      if ('error' in res) throw new Error(res.error)
      break
    }
    default:
      throw new Error(`Unknown op: ${opKind}`)
  }

  await db.syncQueue.delete(id)
}

export async function processQueue(): Promise<{ processed: number; errors: string[] }> {
  if (typeof window === 'undefined') return { processed: 0, errors: [] }
  if (processing) return { processed: 0, errors: [] }
  if (!navigator.onLine) return { processed: 0, errors: [] }

  processing = true
  const errors: string[] = []
  let processed = 0

  try {
    const pending = (await db.syncQueue.where('status').equals('pending').toArray()).sort(
      (a, b) => a.timestamp - b.timestamp
    )

    for (const row of pending) {
      await db.syncQueue.update(row.id, { status: 'syncing' })
      try {
        await syncItem({ ...row, status: 'syncing' })
        processed += 1
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        const retries = row.retryCount + 1
        if (retries >= MAX_RETRY) {
          await db.syncQueue.update(row.id, {
            status: 'failed',
            retryCount: retries,
          })
        } else {
          await db.syncQueue.update(row.id, {
            status: 'pending',
            retryCount: retries,
          })
        }
        errors.push(`${row.opKind}: ${msg}`)
      }
    }

    if (processed > 0) setLastSyncTime()
  } finally {
    processing = false
  }

  return { processed, errors }
}

export async function retryFailed(): Promise<void> {
  const failed = await db.syncQueue.where('status').equals('failed').toArray()
  for (const row of failed) {
    await db.syncQueue.update(row.id, {
      status: 'pending',
      retryCount: 0,
    })
  }
  await processQueue()
}

export function handleConflict<T extends { updated_at?: string | null }>(
  local: { clientUpdatedAt: number; data: unknown },
  remote: T | null
): 'local' | 'remote' {
  if (!remote?.updated_at) return 'local'
  const rt = new Date(remote.updated_at).getTime()
  return local.clientUpdatedAt >= rt ? 'local' : 'remote'
}
