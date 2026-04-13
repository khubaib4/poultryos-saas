import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const CATEGORY_STYLES: Record<string, string> = {
  Feed: 'bg-amber-100 text-amber-900 border-amber-200',
  'Medicine & Vaccines': 'bg-blue-100 text-blue-800 border-blue-200',
  Labor: 'bg-violet-100 text-violet-900 border-violet-200',
  'Utilities (Electricity, Water, Gas)': 'bg-yellow-100 text-yellow-900 border-yellow-200',
  'Equipment & Maintenance': 'bg-slate-100 text-slate-800 border-slate-200',
  Transport: 'bg-cyan-100 text-cyan-900 border-cyan-200',
  Packaging: 'bg-pink-100 text-pink-900 border-pink-200',
  Veterinary: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  Other: 'bg-gray-100 text-gray-800 border-gray-200',
}

interface ExpenseCategoryBadgeProps {
  category: string
  className?: string
}

export function ExpenseCategoryBadge({ category, className }: ExpenseCategoryBadgeProps) {
  const style =
    CATEGORY_STYLES[category] ??
    'bg-gray-100 text-gray-800 border-gray-200'

  return (
    <Badge variant="outline" className={cn('font-medium border max-w-[220px] truncate', style, className)}>
      {category}
    </Badge>
  )
}
