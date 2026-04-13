import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const TYPE_STYLES: Record<string, string> = {
  feed: 'bg-amber-100 text-amber-900 border-amber-200',
  medicine: 'bg-blue-100 text-blue-800 border-blue-200',
  vaccine: 'bg-sky-100 text-sky-900 border-sky-200',
  equipment: 'bg-slate-100 text-slate-800 border-slate-200',
  packaging: 'bg-pink-100 text-pink-900 border-pink-200',
  other: 'bg-gray-100 text-gray-800 border-gray-200',
}

function displayType(type: string): string {
  if (!type) return 'Other'
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
}

interface InventoryTypeBadgeProps {
  type: string
  className?: string
}

export function InventoryTypeBadge({ type, className }: InventoryTypeBadgeProps) {
  const key = type.toLowerCase()
  const style = TYPE_STYLES[key] ?? TYPE_STYLES.other
  return (
    <Badge variant="outline" className={cn('font-medium border', style, className)}>
      {displayType(type)}
    </Badge>
  )
}
