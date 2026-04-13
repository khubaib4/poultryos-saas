import { cn } from '@/lib/utils'

/** Payment status (sales) */
export const paymentStatusClass = (status: string) => {
  const k = status?.toLowerCase() ?? 'unpaid'
  if (k === 'paid') return 'bg-green-100 text-green-700 border-green-200'
  if (k === 'partial') return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-red-100 text-red-700 border-red-200'
}

/** Flock lifecycle */
export const flockStatusClass = (status: string) => {
  const k = status?.toLowerCase() ?? 'active'
  if (k === 'active') return 'bg-primary-light text-primary-dark border-green-200/60'
  if (k === 'sold') return 'bg-gray-100 text-gray-700 border-gray-200'
  return 'bg-gray-100 text-gray-500 border-gray-200'
}

/** Inventory stock level */
export const inventoryStatusClass = (status: string) => {
  const k = status?.toLowerCase() ?? ''
  if (k.includes('out')) return 'bg-red-100 text-red-700 border-red-200'
  if (k.includes('low')) return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-green-100 text-green-700 border-green-200'
}

/** Customer category */
export const customerCategoryClass = (category: string) => {
  const k = category?.toLowerCase() ?? ''
  if (k.includes('wholesale')) return 'bg-purple-100 text-purple-800 border-purple-200'
  if (k.includes('retail')) return 'bg-blue-100 text-blue-800 border-blue-200'
  if (k.includes('restaurant')) return 'bg-orange-100 text-orange-800 border-orange-200'
  return 'bg-gray-100 text-gray-700 border-gray-200'
}

export function statusBadgeBase(className?: string) {
  return cn(
    'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
    className
  )
}
