import { Loader2 } from 'lucide-react'

export default function SystemLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-gray-600">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm">Loading…</p>
    </div>
  )
}
