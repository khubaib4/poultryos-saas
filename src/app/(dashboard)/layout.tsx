import { Suspense } from 'react'
import { getSessionProfile } from '@/lib/auth/session'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import type { UserProfile } from '@/types/database'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await getSessionProfile()
  const typedProfile = profile as UserProfile

  return (
    <div className="flex h-screen overflow-hidden bg-page-bg">
      <Suspense
        fallback={
          <aside className="flex h-screen w-60 shrink-0 flex-col bg-white shadow-card" />
        }
      >
        <Sidebar profile={typedProfile} />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header profile={typedProfile} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
