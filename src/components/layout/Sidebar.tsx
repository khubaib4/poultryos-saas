'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { SELECTED_FARM_STORAGE_KEY } from '@/lib/farm-worker-nav'
import {
  LayoutDashboard,
  Building2,
  Users,
  Bird,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  ClipboardList,
  Package,
  Syringe,
  UserCheck,
  DollarSign,
  Warehouse,
  Plus,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/types/database'

const systemNav = [
  { href: '/system', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/system/organizations', label: 'Organizations', icon: Building2 },
  { href: '/system/admins', label: 'Admins', icon: UserCheck },
  { href: '/system/settings', label: 'Settings', icon: Settings },
]

const adminNav = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/farms', label: 'Farms', icon: Building2 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

const farmNav = [
  { href: '/farm', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/farm/daily-entry', label: 'Daily Entry', icon: ClipboardList },
  { href: '/farm/flocks', label: 'Flocks', icon: Bird },
  { href: '/farm/customers', label: 'Customers', icon: Users },
  { href: '/farm/sales', label: 'Sales', icon: ShoppingCart },
  { href: '/farm/expenses', label: 'Expenses', icon: DollarSign },
  { href: '/farm/inventory', label: 'Inventory', icon: Package },
  { href: '/farm/vaccinations', label: 'Vaccinations', icon: Syringe },
  { href: '/farm/reports', label: 'Reports', icon: BarChart3 },
  { href: '/farm/settings', label: 'Settings', icon: Settings },
]

function buildFarmWorkerHref(basePath: string, farmQuery: string) {
  if (!farmQuery) return basePath
  const sep = basePath.includes('?') ? '&' : '?'
  return `${basePath}${sep}${farmQuery}`
}

function useWorkerFarmQuery(enabled: boolean): string {
  const searchParams = useSearchParams()
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!enabled) {
      setQ('')
      return
    }
    const fromUrl = searchParams.get('farm')
    if (fromUrl) {
      try {
        localStorage.setItem(SELECTED_FARM_STORAGE_KEY, fromUrl)
      } catch {
        /* ignore */
      }
      setQ(`farm=${encodeURIComponent(fromUrl)}`)
      return
    }
    try {
      const id = localStorage.getItem(SELECTED_FARM_STORAGE_KEY)
      setQ(id ? `farm=${encodeURIComponent(id)}` : '')
    } catch {
      setQ('')
    }
  }, [enabled, searchParams])

  return enabled ? q : ''
}

const ROLE_LABEL: Record<string, string> = {
  SYSTEM_OWNER: 'System Owner',
  ADMIN: 'Admin',
  FARM_USER: 'Farm User',
}

function homeHref(role: string): string {
  if (role === 'SYSTEM_OWNER') return '/system'
  if (role === 'ADMIN') return '/admin'
  return '/farm'
}

interface SidebarProps {
  profile: UserProfile
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const workerFarmQuery = useWorkerFarmQuery(profile.role === 'FARM_USER')

  const navItems =
    profile.role === 'SYSTEM_OWNER'
      ? systemNav
      : profile.role === 'ADMIN'
        ? adminNav
        : farmNav

  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const root = homeHref(profile.role)
  const farmHref =
    profile.role === 'FARM_USER' ? buildFarmWorkerHref(root, workerFarmQuery) : root

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-white shadow-card">
      <div className="flex min-h-16 flex-col px-4 pb-2 pt-4">
        <Link
          href={farmHref}
          className="flex min-h-11 items-start gap-3 rounded-xl px-1 py-1 transition-opacity hover:opacity-90"
        >
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm ring-1 ring-black/[0.06]',
              profile.role === 'FARM_USER'
                ? 'bg-[#DCFCE7] text-primary'
                : 'bg-primary-gradient text-base font-bold text-white'
            )}
          >
            {profile.role === 'FARM_USER' ? (
              <Warehouse className="h-5 w-5" aria-hidden />
            ) : (
              <span className="text-base font-bold text-white">P</span>
            )}
          </div>
          <div className="min-w-0 pt-0.5">
            <span className="text-lg font-semibold tracking-tight text-gray-900">
              PoultryOS
            </span>
            {profile.role === 'FARM_USER' && (
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Farm intelligence
              </p>
            )}
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/')

            const linkHref =
              profile.role === 'FARM_USER'
                ? buildFarmWorkerHref(item.href, workerFarmQuery)
                : item.href

            return (
              <li key={item.href}>
                <Link
                  href={linkHref}
                  className={cn(
                    'flex min-h-11 items-center gap-3 border-l-[3px] py-3 pl-[13px] pr-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-primary bg-transparent font-semibold text-primary'
                      : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      isActive ? 'text-primary' : 'text-gray-400'
                    )}
                    aria-hidden
                  />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {profile.role === 'FARM_USER' ? (
        <div className="px-3 pb-3">
          <Link
            href={buildFarmWorkerHref('/farm/inventory/new', workerFarmQuery)}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-gradient px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark hover:[background-image:none]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add batch
          </Link>
        </div>
      ) : null}

      <div className="space-y-2 border-t border-gray-100 p-3">
        <div className="flex min-h-11 items-center gap-3 rounded-xl px-2 py-2">
          <Avatar className="h-10 w-10 shrink-0 ring-2 ring-white shadow-card">
            <AvatarFallback className="bg-primary-gradient text-sm font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">{profile.name}</p>
            <Badge variant="secondary" className="mt-1 h-5 px-2 text-[11px] font-medium">
              {ROLE_LABEL[profile.role]}
            </Badge>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
