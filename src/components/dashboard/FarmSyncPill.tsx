'use client'

import { useSyncExternalStore } from 'react'
import { useOfflineOptional } from '@/components/providers/OfflineProvider'

function subscribeOnline(cb: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

function onlineSnapshot() {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

function formatRelativeTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'Just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function FarmSyncPill() {
  const offline = useOfflineOptional()
  const isOnline = useSyncExternalStore(subscribeOnline, onlineSnapshot, () => true)

  const label = (() => {
    if (!isOnline) return 'Offline'
    if (!offline) return 'Just now'
    if (offline.isSyncing) return 'Syncing…'
    if (offline.pendingCount > 0) {
      return `${offline.pendingCount} pending`
    }
    if (offline.lastSyncAt) return formatRelativeTime(offline.lastSyncAt)
    return 'Just now'
  })()

  const dotClass =
    !isOnline || (offline && offline.pendingCount > 0 && !offline.isSyncing)
      ? 'bg-amber-500'
      : offline?.isSyncing
        ? 'bg-blue-500 animate-pulse'
        : 'bg-green-500'

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} aria-hidden />
      <span className="font-medium text-gray-600">Farm Sync:</span>
      <span className="tabular-nums text-gray-900">{label}</span>
    </div>
  )
}
