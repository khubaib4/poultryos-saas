'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { clearFailedQueueItems } from '@/lib/offline/offlineCrud'
import { db, type SyncQueueRecord } from '@/lib/offline/db'
import { retryFailed } from '@/lib/offline/syncService'
import { useOfflineOptional } from '@/components/providers/OfflineProvider'
import { toast } from 'sonner'

interface SyncDetailsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SyncDetailsPanel({ open, onOpenChange }: SyncDetailsPanelProps) {
  const offline = useOfflineOptional()
  const [rows, setRows] = useState<SyncQueueRecord[]>([])

  async function load() {
    const all = await db.syncQueue.orderBy('timestamp').reverse().toArray()
    setRows(all)
  }

  useEffect(() => {
    if (open) void load()
  }, [open, offline?.pendingCount])

  async function onRetryFailed() {
    await retryFailed()
    await offline?.refreshPending()
    await load()
    toast.success('Retrying failed items.')
  }

  async function onClearFailed() {
    await clearFailedQueueItems()
    await offline?.refreshPending()
    await load()
    toast.message('Cleared failed queue items.')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sync queue</DialogTitle>
          <DialogDescription>
            Pending changes are sent automatically when you&apos;re back online.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-sm">
          {rows.length === 0 ? (
            <li className="text-muted-foreground">No queued changes.</li>
          ) : (
            rows.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border bg-muted/30 px-3 py-2 font-mono text-xs"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-semibold text-foreground">{r.opKind}</span>
                  <span
                    className={
                      r.status === 'failed'
                        ? 'text-destructive'
                        : r.status === 'syncing'
                          ? 'text-blue-600'
                          : 'text-muted-foreground'
                    }
                  >
                    {r.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-muted-foreground">
                  {new Date(r.timestamp).toLocaleString()} · retries {r.retryCount}
                </p>
              </li>
            ))
          )}
        </ul>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void onRetryFailed()}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Retry failed
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => void onClearFailed()}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Clear failed
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
