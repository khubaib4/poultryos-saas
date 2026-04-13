'use client'

import { WifiOff } from 'lucide-react'
import { useOfflineOptional } from '@/components/providers/OfflineProvider'

export function OfflineIndicator() {
  const offline = useOfflineOptional()
  if (!offline || offline.isOnline) return null

  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900"
      role="status"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>You&apos;re offline. Changes will sync when connected.</span>
    </div>
  )
}
