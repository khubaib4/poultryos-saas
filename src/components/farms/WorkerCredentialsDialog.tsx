'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface WorkerCredentialsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: string
  password: string
  title?: string
}

export function WorkerCredentialsDialog({
  open,
  onOpenChange,
  email,
  password,
  title = 'Worker account created',
}: WorkerCredentialsDialogProps) {
  const [copied, setCopied] = useState(false)

  const block = `Email: ${email}\nPassword: ${password}`

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(block)
      setCopied(true)
      toast.success('Credentials copied to clipboard.')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy. Select the text manually.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Save these credentials. The worker will need them to sign in. This
            password is not shown again.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/40 p-3 font-mono text-xs space-y-2">
          <p>
            <span className="text-muted-foreground">Email</span>
            <br />
            <span className="break-all text-foreground">{email}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Password</span>
            <br />
            <span className="break-all text-foreground">{password}</span>
          </p>
        </div>
        <DialogFooter className="border-0 bg-transparent p-0 pt-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={copyAll} className="gap-2">
            {copied ? (
              <Check className="h-4 w-4 text-primary" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            Copy credentials
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
