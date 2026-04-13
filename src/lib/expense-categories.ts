export const EXPENSE_CATEGORIES = [
  'Feed',
  'Medicine & Vaccines',
  'Labor',
  'Utilities (Electricity, Water, Gas)',
  'Equipment & Maintenance',
  'Transport',
  'Packaging',
  'Veterinary',
  'Other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number] | string

export function getExpenseCategories(): string[] {
  return [...EXPENSE_CATEGORIES]
}
