import { type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ReportSummaryCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  className?: string
}

export function ReportSummaryCard({
  title,
  value,
  description,
  icon: Icon,
  className,
}: ReportSummaryCardProps) {
  return (
    <Card className={cn('print:break-inside-avoid', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-lighter">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {description && (
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
