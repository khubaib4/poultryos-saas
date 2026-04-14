import Link from 'next/link'
import { FileDown, LifeBuoy, Settings } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn } from '@/lib/utils'

interface ReportsSidebarActionsProps {
  farmId: string
}

export function ReportsSidebarActions({ farmId }: ReportsSidebarActionsProps) {
  return (
    <aside className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <Link
        href={`#reports-export`}
        className={cn(
          buttonVariants({ size: 'default' }),
          'rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-center font-semibold text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700'
        )}
      >
        <FileDown className="mr-2 h-4 w-4" />
        Generate report
      </Link>
      <Link
        href={withFarmQuery('/farm/settings', farmId)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        <Settings className="h-4 w-4 text-gray-400" />
        Settings
      </Link>
      <a
        href="mailto:support@poultryos.example"
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        <LifeBuoy className="h-4 w-4 text-gray-400" />
        Support
      </a>
    </aside>
  )
}
