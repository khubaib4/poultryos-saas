import { type LucideIcon } from 'lucide-react'
import { type ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-white px-6 py-16 text-center shadow-card">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-lighter">
        <Icon className="h-8 w-8 text-primary" aria-hidden />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-5 text-gray-500">{description}</p>
      {action && (
        <div className="mt-8 flex w-full max-w-xs flex-col gap-2">{action}</div>
      )}
    </div>
  )
}
