import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CostOptimizationTipProps {
  title?: string
  body: string
  ctaLabel?: string
  ctaHref?: string
  className?: string
}

export function CostOptimizationTip({
  title = 'Cost optimization tip',
  body,
  ctaLabel = 'Compare bulk rates',
  ctaHref,
  className,
}: CostOptimizationTipProps) {
  const ctaClass = cn(
    buttonVariants({ variant: 'outline', size: 'default' }),
    'w-full border-white/80 bg-transparent text-white hover:bg-white/10 hover:text-white'
  )

  return (
    <div
      className={cn(
        'flex h-full flex-col justify-between rounded-2xl bg-gradient-to-br from-green-800 to-green-700 p-6 text-white shadow-md',
        className
      )}
    >
      <div className="space-y-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
          <Sparkles className="h-5 w-5 text-white" aria-hidden />
        </div>
        <h3 className="text-lg font-semibold leading-snug">{title}</h3>
        <p className="text-sm leading-relaxed text-white/90">{body}</p>
      </div>
      <div className="mt-6">
        {ctaHref ? (
          <Link href={ctaHref} className={ctaClass}>
            {ctaLabel}
          </Link>
        ) : (
          <span className={cn(ctaClass, 'pointer-events-none opacity-80')}>{ctaLabel}</span>
        )}
      </div>
    </div>
  )
}
