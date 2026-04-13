import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { VaccinationDisplayStatus } from '@/lib/vaccination-constants'

const STYLES: Record<VaccinationDisplayStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-900 border-blue-200',
  overdue: 'bg-red-100 text-red-800 border-red-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  skipped: 'bg-gray-100 text-gray-700 border-gray-200',
}

const LABELS: Record<VaccinationDisplayStatus, string> = {
  scheduled: 'Scheduled',
  overdue: 'Overdue',
  completed: 'Completed',
  skipped: 'Skipped',
}

interface VaccinationStatusBadgeProps {
  status: VaccinationDisplayStatus
  className?: string
}

export function VaccinationStatusBadge({
  status,
  className,
}: VaccinationStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn('font-medium border', STYLES[status], className)}
    >
      {LABELS[status]}
    </Badge>
  )
}
