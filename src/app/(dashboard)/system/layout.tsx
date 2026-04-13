import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth/session'

export default async function SystemLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await getSessionProfile()

  if (profile.role !== 'SYSTEM_OWNER') {
    if (profile.role === 'ADMIN') redirect('/admin')
    if (profile.role === 'FARM_USER') redirect('/farm')
    redirect('/login')
  }

  if (profile.status !== 'ACTIVE') {
    redirect('/login')
  }

  return <>{children}</>
}
