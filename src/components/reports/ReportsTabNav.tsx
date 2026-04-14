import Link from 'next/link'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn } from '@/lib/utils'

const TABS: { key: string; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'production', label: 'Production' },
  { key: 'financial', label: 'Financial' },
  { key: 'flock', label: 'Flock performance' },
  { key: 'inventory', label: 'Inventory' },
]

interface ReportsTabNavProps {
  farmId: string
  active: string
  rangeQuery: Record<string, string>
}

export function ReportsTabNav({ farmId, active, rangeQuery }: ReportsTabNavProps) {
  const base: Record<string, string> = { ...rangeQuery }
  delete base.tab

  return (
    <nav className="flex flex-wrap gap-1 border-b border-gray-200">
      {TABS.map(({ key, label }) => {
        const isActive = active === key
        const extra = key === 'overview' ? base : { ...base, tab: key }
        const href = withFarmQuery('/farm/reports', farmId, extra)
        return (
          <Link
            key={key}
            href={href}
            className={cn(
              '-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
