import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import type { LucideIcon } from 'lucide-react'

interface FarmPlaceholderPageProps {
  title: string
  description?: string
  icon: LucideIcon
  body: string
}

export function FarmPlaceholderPage({
  title,
  description,
  icon: Icon,
  body,
}: FarmPlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <EmptyState icon={Icon} title="Coming soon" description={body} />
    </div>
  )
}
