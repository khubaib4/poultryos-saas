import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CustomerCategory } from '@/types/database'

const CATEGORY_STYLES: Record<string, string> = {
  Individual: 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-100',
  Retailer: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100',
  Wholesaler: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100',
  Restaurant: 'bg-orange-100 text-orange-900 border-orange-200 hover:bg-orange-100',
  Other: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100',
}

interface CustomerCategoryBadgeProps {
  category: CustomerCategory | string
  className?: string
}

export function CustomerCategoryBadge({
  category,
  className,
}: CustomerCategoryBadgeProps) {
  const style =
    CATEGORY_STYLES[category] ??
    'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100'

  return (
    <Badge
      variant="outline"
      className={cn('font-medium border', style, className)}
    >
      {category}
    </Badge>
  )
}
