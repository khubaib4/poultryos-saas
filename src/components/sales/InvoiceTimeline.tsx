import { cn } from '@/lib/utils'

export interface InvoiceTimelineItem {
  id: string
  title: string
  subtitle?: string
  tone: 'done' | 'pending' | 'action'
}

const dotClass: Record<InvoiceTimelineItem['tone'], string> = {
  done: 'bg-green-500 ring-green-200',
  pending: 'bg-gray-300 ring-gray-100',
  action: 'bg-amber-500 ring-amber-200',
}

export function InvoiceTimeline({ items }: { items: InvoiceTimelineItem[] }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/[0.04]">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        Timeline
      </p>
      <ul className="mt-4 space-y-0">
        {items.map((item, i) => (
          <li key={item.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'mt-0.5 h-3 w-3 shrink-0 rounded-full ring-2',
                  dotClass[item.tone]
                )}
              />
              {i < items.length - 1 && (
                <span className="my-1 w-px flex-1 min-h-[28px] bg-gray-200" />
              )}
            </div>
            <div className={cn('pb-4', i === items.length - 1 && 'pb-0')}>
              <p className="text-sm font-semibold text-gray-900">{item.title}</p>
              {item.subtitle && (
                <p className="mt-0.5 text-xs text-gray-500">{item.subtitle}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
