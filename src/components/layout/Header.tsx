'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Bell, LogOut, Menu, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { clearAuthCache } from '@/lib/auth/profile-cache'
import type { UserProfile } from '@/types/database'
import { OfflineIndicator } from '@/components/offline/OfflineIndicator'
import { SyncStatus } from '@/components/offline/SyncStatus'
import { FarmSyncPill } from '@/components/dashboard/FarmSyncPill'
import { useSidebar } from '@/components/layout/SidebarContext'

const PAGE_TITLES: Record<string, string> = {
  '': 'Dashboard',
  system: 'System Dashboard',
  admin: 'Admin Dashboard',
  farm: 'Dashboard',
  farms: 'Farms',
  users: 'Users',
  admins: 'Admins',
  organizations: 'Organizations',
  flocks: 'Flocks',
  sales: 'Sales',
  reports: 'Reports',
  settings: 'Settings',
  'daily-entry': 'Daily Entry',
  inventory: 'Inventory',
  vaccinations: 'Vaccinations',
  customers: 'Customers',
  expenses: 'Expenses',
}

function getPageTitle(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  for (let i = segments.length - 1; i >= 0; i--) {
    const title = PAGE_TITLES[segments[i]]
    if (title) return title
  }
  return 'Dashboard'
}

interface HeaderProps {
  profile?: UserProfile
}

export function Header({ profile }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { toggle } = useSidebar()

  const title = getPageTitle(pathname)
  const name = profile?.name ?? 'User'
  const email = profile?.email ?? ''

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const farmQ = searchParams.get('farm')
  const profileSettingsPath =
    profile?.role === 'SYSTEM_OWNER'
      ? '/system/settings'
      : profile?.role === 'ADMIN'
        ? '/admin/settings'
        : farmQ
          ? `/farm/settings?farm=${encodeURIComponent(farmQ)}`
          : '/farm/settings'

  const handleSignOut = async () => {
    clearAuthCache()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-30 flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-page-bg px-4 py-3 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-card ring-1 ring-black/[0.04] hover:bg-gray-50 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="truncate text-xl font-semibold leading-7 tracking-tight text-gray-900 sm:text-2xl sm:leading-8">
          {title}
        </h1>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {profile?.role === 'FARM_USER' ? (
          <div className="hidden sm:block">
            <FarmSyncPill />
          </div>
        ) : (
          <>
            <OfflineIndicator />
            <SyncStatus />
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-xl text-gray-500 hover:bg-white hover:text-gray-700 hover:shadow-card"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-page-bg" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex min-h-11 items-center gap-2 rounded-xl border-0 bg-white px-3 py-2 shadow-card outline-none transition-shadow hover:shadow-card-md">
            <Avatar className="h-9 w-9 ring-0">
              <AvatarFallback className="bg-primary-gradient text-xs font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[140px] truncate text-sm font-medium text-gray-800 sm:block">
              {name}
            </span>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-card-md">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-0.5">
                <span className="font-medium text-gray-900">{name}</span>
                <span className="truncate text-xs font-normal text-gray-500">{email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 rounded-lg"
              onClick={() => router.push(profileSettingsPath)}
            >
              <User className="h-4 w-4" />
              Profile settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 rounded-lg text-red-600 focus:text-red-600"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
