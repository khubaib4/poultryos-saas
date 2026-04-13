import { Loader2 } from 'lucide-react'

export default function NewDailyEntryLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-gray-500">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm">Loading form…</p>
    </div>
  )
}
