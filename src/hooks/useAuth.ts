'use client'

import { useEffect, useState } from 'react'
import { useAuthContext } from '@/components/providers/AuthProvider'

/**
 * Exposes auth context plus `isOffline` for offline-first UI and cached profile use.
 */
export function useAuth() {
  const ctx = useAuthContext()
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  )

  useEffect(() => {
    const onOnline = () => setIsOffline(false)
    const onOffline = () => setIsOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return { ...ctx, isOffline }
}
