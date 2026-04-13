import { Lightbulb } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const TIPS = [
  'Ensure water nipples are checked daily for consistent hydration.',
  'Keep litter dry to reduce ammonia and improve bird comfort.',
  'Record mortalities early—small changes can signal health issues.',
  'Clean feeders regularly to prevent mold and feed wastage.',
  'Maintain steady ventilation to keep temperature and humidity stable.',
]

function pickTip(): string {
  const day = new Date().toISOString().slice(0, 10)
  let hash = 0
  for (let i = 0; i < day.length; i++) hash = (hash * 31 + day.charCodeAt(i)) >>> 0
  return TIPS[hash % TIPS.length]!
}

export function SmartTip() {
  const tip = pickTip()

  return (
    <Card className="overflow-hidden shadow-sm ring-1 ring-black/[0.04]">
      <div
        className="relative h-40 w-full"
        style={{
          background:
            'linear-gradient(135deg, rgba(34,197,94,0.18) 0%, rgba(22,163,74,0.12) 55%, rgba(0,0,0,0.10) 100%)',
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
          <Lightbulb className="h-3.5 w-3.5" aria-hidden />
          Smart Tip
        </div>
      </div>
      <CardContent className="pt-4">
        <p className="text-sm leading-relaxed text-gray-700">{tip}</p>
      </CardContent>
    </Card>
  )
}

