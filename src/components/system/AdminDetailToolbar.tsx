'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Check, KeyRound, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  suspendAdmin,
  activateAdmin,
  sendAdminPasswordRecovery,
  setAdminTempPassword,
} from '@/lib/actions/system'
import { toast } from 'sonner'

interface AdminDetailToolbarProps {
  adminId: string
  status: string
}

export function AdminDetailToolbar({ adminId, status }: AdminDetailToolbarProps) {
  const router = useRouter()
  const [pwdOpen, setPwdOpen] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const suspended = status === 'SUSPENDED'

  async function toggleSuspend() {
    setBusy(true)
    const res = suspended ? await activateAdmin(adminId) : await suspendAdmin(adminId)
    setBusy(false)
    if ('error' in res) {
      toast.error(res.error)
      return
    }
    toast.success(suspended ? 'Admin activated.' : 'Admin suspended.')
    router.refresh()
  }

  async function recovery() {
    setBusy(true)
    const res = await sendAdminPasswordRecovery(adminId)
    setBusy(false)
    if ('error' in res) {
      toast.error(res.error)
      return
    }
    if (res.actionLink) {
      try {
        await navigator.clipboard.writeText(res.actionLink)
        toast.success('Recovery link copied to clipboard.')
      } catch {
        toast.message('Recovery link', { description: res.actionLink })
      }
    } else {
      toast.success('Recovery flow completed.')
    }
  }

  async function tempPasswordClick() {
    setBusy(true)
    const res = await setAdminTempPassword(adminId)
    setBusy(false)
    if ('error' in res) {
      toast.error(res.error)
      return
    }
    setTempPassword(res.password)
    setPwdOpen(true)
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={suspended ? 'default' : 'destructive'}
          className={suspended ? 'bg-primary hover:bg-primary-dark' : ''}
          disabled={busy}
          onClick={() => void toggleSuspend()}
        >
          {suspended ? (
            <>
              <Check className="mr-1.5 h-4 w-4" />
              Activate
            </>
          ) : (
            <>
              <Ban className="mr-1.5 h-4 w-4" />
              Suspend
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => void recovery()}
        >
          <Mail className="mr-1.5 h-4 w-4" />
          Reset password
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => void tempPasswordClick()}
        >
          <KeyRound className="mr-1.5 h-4 w-4" />
          Set temp password
        </Button>
      </div>

      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary password</DialogTitle>
            <DialogDescription>
              Share this once with the admin. They should sign in and change it immediately.
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-md bg-muted p-3 font-mono text-sm break-all">{tempPassword}</p>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </>
  )
}
