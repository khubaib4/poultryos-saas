'use client'

import { useCallback, useState } from 'react'
import { useOfflineOptional } from '@/components/providers/OfflineProvider'

interface UseOfflineMutationResult<TArgs extends unknown[], TResult> {
  mutate: (...args: TArgs) => Promise<TResult | { offline: true }>
  isPending: boolean
  isOffline: boolean
}

export function useOfflineMutation<TArgs extends unknown[], TResult>(
  onlineMutation: (...args: TArgs) => Promise<TResult>,
  offlineHandler?: (...args: TArgs) => Promise<TResult | { offline: true }>
): UseOfflineMutationResult<TArgs, TResult> {
  const offline = useOfflineOptional()
  const isOnline = offline?.isOnline ?? true
  const [isPending, setPending] = useState(false)

  const mutate = useCallback(
    async (...args: TArgs) => {
      if (isOnline) {
        setPending(true)
        try {
          return await onlineMutation(...args)
        } finally {
          setPending(false)
        }
      }
      if (offlineHandler) {
        setPending(true)
        try {
          return await offlineHandler(...args)
        } finally {
          setPending(false)
        }
      }
      throw new Error('You are offline.')
    },
    [isOnline, onlineMutation, offlineHandler]
  )

  return {
    mutate,
    isPending,
    isOffline: !isOnline,
  }
}
