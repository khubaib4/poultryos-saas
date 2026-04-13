'use client'

import { useCallback, useEffect, useState } from 'react'
import { cacheData, getCachedData, getCacheAge } from '@/lib/offline/cacheService'
import { useOfflineOptional } from '@/components/providers/OfflineProvider'

interface UseOfflineDataResult<T> {
  data: T | null
  isOffline: boolean
  isCached: boolean
  lastUpdated: number | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useOfflineData<T>(
  table: string,
  queryFn: () => Promise<T>,
  filters?: { farmId?: string }
): UseOfflineDataResult<T> {
  const offline = useOfflineOptional()
  const isOnline = offline?.isOnline ?? true

  const [data, setData] = useState<T | null>(null)
  const [isCached, setIsCached] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCache = useCallback(async () => {
    const cached = (await getCachedData(table, filters)) as T[]
    const age = await getCacheAge(table)
    setLastUpdated(age)
    if (cached.length > 0) {
      setData(cached as unknown as T)
      setIsCached(true)
    }
  }, [table, filters])

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (isOnline) {
        const fresh = await queryFn()
        setData(fresh)
        setIsCached(false)
        if (Array.isArray(fresh)) {
          await cacheData(table, fresh as unknown[])
        } else if (fresh != null) {
          await cacheData(table, [fresh as unknown])
        }
        setLastUpdated(Date.now())
      } else {
        await loadCache()
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load'
      setError(msg)
      await loadCache()
    } finally {
      setIsLoading(false)
    }
  }, [isOnline, queryFn, table, loadCache])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return {
    data,
    isOffline: !isOnline,
    isCached,
    lastUpdated,
    isLoading,
    error,
    refetch,
  }
}
