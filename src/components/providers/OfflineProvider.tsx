'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import { getPendingQueueCount } from '@/lib/offline/offlineCrud'
import { getLastSyncTime, processQueue } from '@/lib/offline/syncService'

interface OfflineContextValue {
  isOnline: boolean
  pendingCount: number
  isSyncing: boolean
  lastSyncAt: number | null
  refreshPending: () => Promise<void>
  triggerSync: () => Promise<{ processed: number; errors: string[] }>
}

const OfflineContext = createContext<OfflineContextValue | null>(null)

function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

function getOnlineSnapshot() {
  return navigator.onLine
}

function getServerOnlineSnapshot() {
  return true
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerOnlineSnapshot)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)

  const refreshPending = useCallback(async () => {
    try {
      const n = await getPendingQueueCount()
      setPendingCount(n)
    } catch {
      setPendingCount(0)
    }
    setLastSyncAt(getLastSyncTime())
  }, [])

  useEffect(() => {
    void refreshPending()
  }, [refreshPending])

  useEffect(() => {
    setLastSyncAt(getLastSyncTime())
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('poultryos_pending_count', String(pendingCount))
    } catch {
      /* ignore */
    }
  }, [pendingCount])

  const triggerSyncInner = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { processed: 0, errors: ['Offline'] as string[] }
    }
    setIsSyncing(true)
    try {
      const result = await processQueue()
      await refreshPending()
      return result
    } finally {
      setIsSyncing(false)
    }
  }, [refreshPending])

  useEffect(() => {
    if (!isOnline) return
    let cancelled = false
    ;(async () => {
      setIsSyncing(true)
      try {
        await processQueue()
      } finally {
        if (!cancelled) {
          setIsSyncing(false)
          await refreshPending()
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOnline, refreshPending])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        void reg.update()
        if ('sync' in reg) {
          void (reg as ServiceWorkerRegistration & { sync: { register: (t: string) => Promise<void> } }).sync
            .register('poultryos-sync')
            .catch(() => {})
        }
      })
      .catch(() => {})

    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'SYNC_REQUEST') {
        void triggerSyncInner()
      }
    }
    navigator.serviceWorker.addEventListener('message', onMsg)
    return () => navigator.serviceWorker.removeEventListener('message', onMsg)
  }, [triggerSyncInner])

  const value = useMemo<OfflineContextValue>(
    () => ({
      isOnline,
      pendingCount,
      isSyncing,
      lastSyncAt,
      refreshPending,
      triggerSync: triggerSyncInner,
    }),
    [isOnline, pendingCount, isSyncing, lastSyncAt, refreshPending, triggerSyncInner]
  )

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
}

export function useOffline() {
  const ctx = useContext(OfflineContext)
  if (!ctx) {
    throw new Error('useOffline must be used within OfflineProvider')
  }
  return ctx
}

/** Safe for components outside provider (e.g. optional UI). */
export function useOfflineOptional(): OfflineContextValue | null {
  return useContext(OfflineContext)
}
