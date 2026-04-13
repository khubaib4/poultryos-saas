'use client'

import { useEffect, useState } from 'react'
import { HardDrive, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { clearCache } from '@/lib/offline/cacheService'
import { clearAllPendingData } from '@/lib/offline/offlineCrud'
import { getLastSyncTime, processQueue } from '@/lib/offline/syncService'
import { useOfflineOptional } from '@/components/providers/OfflineProvider'
import { toast } from 'sonner'

interface FarmOfflineSettingsProps {
  farmId: string
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function FarmOfflineSettings({ farmId }: FarmOfflineSettingsProps) {
  const offline = useOfflineOptional()
  const [estimate, setEstimate] = useState<{ usage?: number; quota?: number }>({})
  const [lastSync, setLastSync] = useState<number | null>(null)

  useEffect(() => {
    setLastSync(getLastSyncTime())
    if (navigator.storage?.estimate) {
      void navigator.storage.estimate().then((e) => {
        setEstimate({ usage: e.usage, quota: e.quota })
      })
    }
  }, [offline?.pendingCount])

  async function onClearCache() {
    await clearCache()
    await offline?.refreshPending()
    toast.success('Local cache cleared.')
  }

  async function onClearPending() {
    const ok = window.confirm(
      'Remove all unsynced changes stored on this device? This cannot be undone.'
    )
    if (!ok) return
    await clearAllPendingData()
    await offline?.refreshPending()
    toast.message('Pending queue cleared.')
  }

  async function onForceSync() {
    const r = await processQueue()
    setLastSync(getLastSyncTime())
    await offline?.refreshPending()
    if (r.errors.length) toast.error(r.errors[0])
    else if (r.processed > 0) toast.success(`Synced ${r.processed} item(s).`)
    else toast.message('Nothing to sync.')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HardDrive className="h-4 w-4" />
          Offline &amp; sync
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Farm: <span className="font-mono text-foreground">{farmId}</span>
        </p>
        <div className="grid gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Storage used (approx.)</span>
            <span className="font-medium tabular-nums">
              {estimate.usage != null ? formatBytes(estimate.usage) : '—'}
              {estimate.quota != null ? ` / ${formatBytes(estimate.quota)}` : ''}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Last successful sync</span>
            <span className="font-medium">
              {lastSync
                ? new Date(lastSync).toLocaleString()
                : 'Not yet'}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Pending on device</span>
            <span className="font-medium tabular-nums">{offline?.pendingCount ?? 0}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void onClearCache()}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Clear cached data
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => void onClearPending()}
          >
            Clear pending changes
          </Button>
          <Button
            type="button"
            className="bg-primary hover:bg-primary-dark"
            size="sm"
            onClick={() => void onForceSync()}
            disabled={!offline?.isOnline}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Force sync now
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
