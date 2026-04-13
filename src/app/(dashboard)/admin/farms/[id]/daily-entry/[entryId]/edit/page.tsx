import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string; entryId: string }>
}

export default async function AdminFarmDailyEntryEditRedirect({ params }: PageProps) {
  const { id } = await params
  redirect(`/admin/farms/${id}`)
}
