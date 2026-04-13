import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

/** Daily entry is managed in the Farm workspace; admins see the farm overview. */
export default async function AdminFarmDailyEntryRedirect({ params }: PageProps) {
  const { id } = await params
  redirect(`/admin/farms/${id}`)
}
