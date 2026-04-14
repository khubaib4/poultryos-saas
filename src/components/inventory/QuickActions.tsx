import Link from 'next/link'
import { QrCode, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickActionsProps {
  newOrderHref: string
  scanHref: string
  className?: string
}

export function QuickActions({ newOrderHref, scanHref, className }: QuickActionsProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-100 bg-white p-6 shadow-sm',
        className
      )}
    >
      <h2 className="text-lg font-semibold text-gray-900">Quick actions</h2>
      <ul className="mt-5 space-y-3">
        <li>
          <Link
            href={newOrderHref}
            className="flex gap-4 rounded-xl border border-gray-100 p-4 transition-colors hover:bg-gray-50"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Truck className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-gray-900">New order</p>
              <p className="text-sm text-gray-500">Request from supplier</p>
            </div>
          </Link>
        </li>
        <li>
          <Link
            href={scanHref}
            className="flex gap-4 rounded-xl border border-gray-100 p-4 transition-colors hover:bg-gray-50"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <QrCode className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Scan item</p>
              <p className="text-sm text-gray-500">Log inventory via QR (coming soon)</p>
            </div>
          </Link>
        </li>
      </ul>
    </div>
  )
}
