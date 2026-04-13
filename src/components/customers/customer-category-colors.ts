import type { CustomerCategoryKey } from '@/lib/queries/customers'

export const categoryColors: Record<
  CustomerCategoryKey,
  { bg: string; text: string; avatar: string }
> = {
  individual: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    avatar: 'bg-gray-500',
  },
  retailer: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    avatar: 'bg-green-500',
  },
  wholesaler: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    avatar: 'bg-blue-500',
  },
  restaurant: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    avatar: 'bg-orange-500',
  },
  other: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    avatar: 'bg-gray-400',
  },
  all: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    avatar: 'bg-gray-400',
  },
}

export function categoryKeyFromDb(v?: string | null): CustomerCategoryKey {
  const raw = String(v ?? '').toLowerCase()
  if (raw === 'individual') return 'individual'
  if (raw === 'retailer') return 'retailer'
  if (raw === 'wholesaler') return 'wholesaler'
  if (raw === 'restaurant') return 'restaurant'
  if (raw === 'other') return 'other'
  return 'other'
}

