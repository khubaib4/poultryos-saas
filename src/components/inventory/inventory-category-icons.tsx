import {
  Wheat,
  Pill,
  Wrench,
  Package,
  Sparkles,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react'

export type InventoryCategoryVisualKey =
  | 'feed'
  | 'medicine'
  | 'equipment'
  | 'packaging'
  | 'cleaning supplies'
  | 'other'

export const inventoryCategoryIcons: Record<InventoryCategoryVisualKey, LucideIcon> = {
  feed: Wheat,
  medicine: Pill,
  equipment: Wrench,
  packaging: Package,
  'cleaning supplies': Sparkles,
  other: MoreHorizontal,
}

export const inventoryCategoryColors: Record<
  InventoryCategoryVisualKey,
  { bg: string; text: string; badge: string }
> = {
  feed: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-800',
  },
  medicine: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    badge: 'bg-green-100 text-green-800',
  },
  equipment: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-800',
  },
  packaging: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    badge: 'bg-purple-100 text-purple-800',
  },
  'cleaning supplies': {
    bg: 'bg-teal-100',
    text: 'text-teal-700',
    badge: 'bg-teal-100 text-teal-800',
  },
  other: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    badge: 'bg-gray-100 text-gray-700',
  },
}

export function resolveInventoryCategoryKey(raw: string): InventoryCategoryVisualKey {
  const c = raw.trim().toLowerCase()
  if (c === 'feed') return 'feed'
  if (c.includes('medicine') || c.includes('vaccine')) return 'medicine'
  if (c.includes('equipment')) return 'equipment'
  if (c.includes('packaging')) return 'packaging'
  if (c.includes('cleaning')) return 'cleaning supplies'
  return 'other'
}

export function shortInventoryTypeBadge(raw: string): string {
  const k = resolveInventoryCategoryKey(raw)
  const map: Record<InventoryCategoryVisualKey, string> = {
    feed: 'FEED',
    medicine: 'MEDICINE',
    equipment: 'EQUIPMENT',
    packaging: 'PACKAGING',
    'cleaning supplies': 'CLEANING',
    other: 'OTHER',
  }
  return map[k]
}
