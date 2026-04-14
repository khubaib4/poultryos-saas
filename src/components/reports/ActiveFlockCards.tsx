import Link from 'next/link'
import { withFarmQuery } from '@/lib/farm-worker-nav'
import { cn } from '@/lib/utils'

export interface ActiveFlockCardModel {
  id: string
  title: string
  status: 'healthy' | 'alert' | 'peak'
  birds: number
  ageWeeks: number
  actionLabel: string
  href: string
}

const statusStyles = {
  healthy: { badge: 'bg-emerald-100 text-emerald-800', text: 'Healthy state' },
  alert: { badge: 'bg-amber-100 text-amber-800', text: 'Alert: high temp' },
  peak: { badge: 'bg-blue-100 text-blue-800', text: 'Peak cycle' },
}

interface ActiveFlockCardsProps {
  cards: ActiveFlockCardModel[]
}

export function ActiveFlockCards({ cards }: ActiveFlockCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((c) => {
        const st = statusStyles[c.status]
        return (
          <div
            key={c.id}
            className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-gray-900">{c.title}</h4>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                  st.badge
                )}
              >
                {st.text}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-xs uppercase text-gray-400">Bird count</dt>
                <dd className="font-semibold text-gray-900">{c.birds.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-gray-400">Age (wks)</dt>
                <dd className="font-semibold text-gray-900">{c.ageWeeks}</dd>
              </div>
            </dl>
            <Link
              href={c.href}
              className="mt-4 inline-flex justify-center rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              {c.actionLabel}
            </Link>
          </div>
        )
      })}
    </div>
  )
}

export function buildActiveFlockCards(
  farmId: string,
  flocks: {
    flockId: string
    batchNumber: string
    birdCount: number
    mortalityRate: number
  }[]
): ActiveFlockCardModel[] {
  return flocks.slice(0, 3).map((f, i) => {
    let status: ActiveFlockCardModel['status'] = 'healthy'
    if (f.mortalityRate > 1) status = 'alert'
    else if (i === 2) status = 'peak'
    const actions = ['Manage shed', 'Check cooling', 'Monitor pullets']
    return {
      id: f.flockId,
      title: `Active flock ${String(i + 1).padStart(2, '0')}`,
      status,
      birds: f.birdCount,
      ageWeeks: 24 + i * 2,
      actionLabel: actions[i] ?? 'View flock',
      href: withFarmQuery(`/farm/flocks/${f.flockId}`, farmId),
    }
  })
}
