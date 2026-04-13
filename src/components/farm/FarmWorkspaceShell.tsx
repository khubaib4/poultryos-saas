'use client'

import { useEffect, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Building2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SELECTED_FARM_STORAGE_KEY } from '@/lib/farm-worker-nav'
import type { FarmWithStats } from '@/types/database'

interface FarmWorkspaceShellProps {
  farms: FarmWithStats[]
  children: React.ReactNode
}

export function FarmWorkspaceShell({ farms, children }: FarmWorkspaceShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selected = searchParams.get('farm')
  const validSelected = useMemo(
    () =>
      selected && farms.some((f) => f.id === selected) ? selected : null,
    [farms, selected]
  )

  useEffect(() => {
    if (farms.length === 0) return
    const first = farms[0].id
    const ok = selected && farms.some((f) => f.id === selected)
    if (ok) {
      try {
        localStorage.setItem(SELECTED_FARM_STORAGE_KEY, selected!)
      } catch {
        /* ignore */
      }
      return
    }
    const p = new URLSearchParams(searchParams.toString())
    p.set('farm', first)
    const qs = p.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
    try {
      localStorage.setItem(SELECTED_FARM_STORAGE_KEY, first)
    } catch {
      /* ignore */
    }
  }, [farms, pathname, router, searchParams, selected])

  const onFarmChange = (farmId: string) => {
    const p = new URLSearchParams(searchParams.toString())
    p.set('farm', farmId)
    try {
      localStorage.setItem(SELECTED_FARM_STORAGE_KEY, farmId)
    } catch {
      /* ignore */
    }
    router.push(`${pathname}?${p.toString()}`)
  }

  return (
    <div className="space-y-4">
      {farms.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-900">
          <Building2 className="mx-auto mb-2 h-10 w-10 opacity-60" />
          <p className="font-medium">No farms assigned</p>
          <p className="mt-1 text-amber-800">
            Ask your organization admin to assign you to a farm in PoultryOS.
          </p>
        </div>
      )}
      {farms.length > 1 && (
        <div className="flex flex-col gap-2 rounded-xl border bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Building2 className="h-4 w-4 text-primary" />
            <span>Working at</span>
          </div>
          <div className="flex flex-col gap-1.5 sm:min-w-[240px]">
            <Label className="sr-only">Farm</Label>
            <Select
              value={validSelected ?? farms[0].id}
              onValueChange={(v) => v && onFarmChange(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select farm" />
              </SelectTrigger>
              <SelectContent>
                {farms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {children}
    </div>
  )
}
