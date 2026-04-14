import { Suspense } from 'react'
import { getSessionProfile } from '@/lib/auth/session'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { SidebarProvider } from '@/components/layout/SidebarContext'
import type { UserProfile } from '@/types/database'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await getSessionProfile()
  const typedProfile = profile as UserProfile

  return (
    <SidebarProvider>
      <div className="flex min-h-screen overflow-hidden bg-page-bg">
        <Suspense
          fallback={
            <aside className="hidden h-screen w-60 shrink-0 bg-white shadow-card lg:flex lg:flex-col" />
          }
        >
          <Sidebar profile={typedProfile} />
        </Suspense>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header profile={typedProfile} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 safe-area-inset">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
