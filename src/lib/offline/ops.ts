/** Sync queue operation kinds (payload shapes in syncService). */
export const OP = {
  DAILY_ENTRY_CREATE: 'daily_entry.create',
  DAILY_ENTRY_UPDATE: 'daily_entry.update',
  EXPENSE_CREATE: 'expense.create',
  EXPENSE_UPDATE: 'expense.update',
  SALE_CREATE: 'sale.create',
  SALE_UPDATE: 'sale.update',
  INVENTORY_ADD: 'inventory.add_stock',
  INVENTORY_REDUCE: 'inventory.reduce_stock',
} as const
