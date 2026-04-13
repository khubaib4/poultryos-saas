export const INVENTORY_TYPES = [
  'Feed',
  'Medicine',
  'Vaccine',
  'Equipment',
  'Packaging',
  'Other',
] as const

export const INVENTORY_UNITS = [
  'kg',
  'g',
  'liter',
  'ml',
  'pieces',
  'bags',
  'boxes',
] as const

export type InventoryType = (typeof INVENTORY_TYPES)[number] | string
export type InventoryUnit = (typeof INVENTORY_UNITS)[number] | string

export const ADD_STOCK_REASONS = [
  'Purchase',
  'Return',
  'Adjustment',
  'Other',
] as const

export const REDUCE_STOCK_REASONS = [
  'Used',
  'Damaged',
  'Expired',
  'Sold',
  'Adjustment',
  'Other',
] as const
