import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UpgradePromoProps {
  /** e.g. reports or settings */
  href?: string
  className?: string
}

export function UpgradePromo({
  href = '/farm/reports',
  className,
}: UpgradePromoProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-sm ring-1 ring-black/[0.06] ${className ?? ''}`}
      style={{
        background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      }}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Sparkles className="h-6 w-6 text-white" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold tracking-tight">Predictive Analytics Pro</h3>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/90">
              Upgrade to predict flock health patterns with AI.
            </p>
          </div>
        </div>
        <Link href={href} className="shrink-0">
          <Button
            variant="outline"
            className="border-white/80 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
          >
            Try now
          </Button>
        </Link>
      </div>
    </div>
  )
}
