'use client'

import { useRouter } from 'next/navigation'
import { MoreVertical, Eye, Ban, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { suspendAdmin, activateAdmin } from '@/lib/actions/system'
import { toast } from 'sonner'

interface AdminRowActionsProps {
  adminId: string
  status: string
}

export function AdminRowActions({ adminId, status }: AdminRowActionsProps) {
  const router = useRouter()
  const suspended = status === 'SUSPENDED'

  async function toggle() {
    const res = suspended ? await activateAdmin(adminId) : await suspendAdmin(adminId)
    if ('error' in res) {
      toast.error(res.error)
      return
    }
    toast.success(suspended ? 'Admin activated.' : 'Admin suspended.')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100">
        <MoreVertical className="h-4 w-4 text-gray-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onClick={() => router.push(`/system/admins/${adminId}`)}
        >
          <Eye className="h-4 w-4" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onClick={() => {
            void toggle()
          }}
        >
          {suspended ? (
            <>
              <Check className="h-4 w-4" />
              Activate
            </>
          ) : (
            <>
              <Ban className="h-4 w-4" />
              Suspend
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
