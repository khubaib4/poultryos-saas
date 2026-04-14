import {
  Wheat,
  Pill,
  Users,
  Zap,
  Wrench,
  Truck,
  Package,
  Heart,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react'

export type ExpenseCategoryVisualKey =
  | 'feed'
  | 'medicine & vaccines'
  | 'labor'
  | 'utilities'
  | 'equipment'
  | 'transport'
  | 'packaging'
  | 'veterinary'
  | 'other'

export const categoryIcons: Record<ExpenseCategoryVisualKey, LucideIcon> = {
  feed: Wheat,
  'medicine & vaccines': Pill,
  labor: Users,
  utilities: Zap,
  equipment: Wrench,
  transport: Truck,
  packaging: Package,
  veterinary: Heart,
  other: MoreHorizontal,
}

export const categoryColors: Record<
  ExpenseCategoryVisualKey,
  { bg: string; text: string; icon: string; dot: string }
> = {
  feed: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    icon: 'text-amber-600',
    dot: 'bg-amber-500',
  },
  'medicine & vaccines': {
    bg: 'bg-green-100',
    text: 'text-green-700',
    icon: 'text-green-600',
    dot: 'bg-green-500',
  },
  labor: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    icon: 'text-blue-600',
    dot: 'bg-blue-500',
  },
  utilities: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    icon: 'text-purple-600',
    dot: 'bg-purple-500',
  },
  equipment: {
    bg: 'bg-teal-100',
    text: 'text-teal-700',
    icon: 'text-teal-600',
    dot: 'bg-teal-500',
  },
  transport: {
    bg: 'bg-pink-100',
    text: 'text-pink-700',
    icon: 'text-pink-600',
    dot: 'bg-pink-500',
  },
  packaging: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
    icon: 'text-indigo-600',
    dot: 'bg-indigo-500',
  },
  veterinary: {
    bg: 'bg-rose-100',
    text: 'text-rose-700',
    icon: 'text-rose-600',
    dot: 'bg-rose-500',
  },
  other: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    icon: 'text-gray-500',
    dot: 'bg-gray-400',
  },
}

export function resolveExpenseCategoryKey(raw: string): ExpenseCategoryVisualKey {
  const c = raw.trim().toLowerCase()
  if (c === 'feed') return 'feed'
  if (c.includes('medicine') || c.includes('vaccine')) return 'medicine & vaccines'
  if (c.includes('labor')) return 'labor'
  if (c.includes('utilities')) return 'utilities'
  if (c.includes('equipment') || c.includes('maintenance')) return 'equipment'
  if (c.includes('transport')) return 'transport'
  if (c.includes('packaging')) return 'packaging'
  if (c.includes('veterinary')) return 'veterinary'
  return 'other'
}

export function shortCategoryBadgeLabel(raw: string): string {
  const key = resolveExpenseCategoryKey(raw)
  const map: Record<ExpenseCategoryVisualKey, string> = {
    feed: 'FEED',
    'medicine & vaccines': 'MEDICINE',
    labor: 'LABOR',
    utilities: 'UTILITIES',
    equipment: 'EQUIPMENT',
    transport: 'TRANSPORT',
    packaging: 'PACKAGING',
    veterinary: 'VET',
    other: 'OTHER',
  }
  return map[key]
}
