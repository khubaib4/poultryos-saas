'use client'

import { useState } from 'react'
import { CloudOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOfflineOptional } from '@/components/providers/OfflineProvider'
import { SyncDetailsPanel } from '@/components/offline/SyncDetailsPanel'
import { toast } from 'sonner'

export function SyncStatus() {
  const offline = useOfflineOptional()
  const [open, setOpen] = useState(false)

  if (!offline) return null

  const { pendingCount, isSyncing, triggerSync } = offline

  async function manualSync() {
    const r = await triggerSync()
    if (r.errors.length) {
      toast.error(r.errors[0])
    } else if (r.processed > 0) {
      toast.success(`Synced ${r.processed} change(s).`)
    }
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {pendingCount > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
            onClick={() => setOpen(true)}
          >
            <CloudOff className="h-3.5 w-3.5" />
            <span className="tabular-nums">{pendingCount}</span>
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-gray-600"
          disabled={isSyncing || !offline.isOnline}
          onClick={() => void manualSync()}
          title="Sync now"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <SyncDetailsPanel open={open} onOpenChange={setOpen} />
    </>
  )
}
