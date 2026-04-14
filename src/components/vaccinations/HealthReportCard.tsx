import Link from 'next/link'
import { ClipboardList } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface HealthReportCardProps {
  reportsHref: string
  className?: string
}

export function HealthReportCard({ reportsHref, className }: HealthReportCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 p-6 text-white shadow-md',
        className
      )}
    >
      <ClipboardList
        className="pointer-events-none absolute -right-2 -bottom-4 h-32 w-32 text-white/[0.07]"
        aria-hidden
      />
      <h3 className="text-lg font-semibold">Generate health report</h3>
      <p className="mt-2 max-w-sm text-sm text-white/80">
        Create a summary of all immunizations for audit purposes.
      </p>
      <Link
        href={reportsHref}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'mt-6 border-white/80 bg-transparent text-white hover:bg-white/10 hover:text-white'
        )}
      >
        Download PDF
      </Link>
    </div>
  )
}
