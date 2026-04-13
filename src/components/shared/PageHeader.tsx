import { type ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 space-y-1">
        <h2 className="text-[28px] font-semibold leading-8 tracking-tight text-gray-900">
          {title}
        </h2>
        {description && (
          <p className="max-w-2xl text-sm leading-5 text-gray-500">{description}</p>
        )}
      </div>
      {action && (
        <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
          {action}
        </div>
      )}
    </div>
  )
}
