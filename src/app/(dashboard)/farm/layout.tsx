import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth/session'
import { getAssignedFarms } from '@/lib/queries/farm-user'
import { FarmWorkspaceShell } from '@/components/farm/FarmWorkspaceShell'

export default async function FarmSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await getSessionProfile()

  if (profile.role !== 'FARM_USER') {
    if (profile.role === 'ADMIN') redirect('/admin')
    if (profile.role === 'SYSTEM_OWNER') redirect('/system')
    redirect('/login')
  }

  const farms = await getAssignedFarms(profile.id)

  return <FarmWorkspaceShell farms={farms}>{children}</FarmWorkspaceShell>
}
