'use client'

import { useRouter } from 'next/navigation'
import { MoreVertical, Eye, Pencil, Ban, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { suspendOrganization, activateOrganization } from '@/lib/actions/system'
import { toast } from 'sonner'

interface OrganizationActionsProps {
  orgId: string
  status: string
}

export function OrganizationActions({ orgId, status }: OrganizationActionsProps) {
  const router = useRouter()
  const active = status === 'ACTIVE'

  async function toggle() {
    const res = active
      ? await suspendOrganization(orgId)
      : await activateOrganization(orgId)
    if ('error' in res) {
      toast.error(res.error)
      return
    }
    toast.success(active ? 'Organization suspended.' : 'Organization activated.')
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
          onClick={() => router.push(`/system/organizations/${orgId}`)}
        >
          <Eye className="h-4 w-4" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onClick={() => router.push(`/system/organizations/${orgId}/edit`)}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onClick={() => {
            void toggle()
          }}
        >
          {active ? (
            <>
              <Ban className="h-4 w-4" />
              Suspend
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Activate
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
