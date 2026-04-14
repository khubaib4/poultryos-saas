'use client'

import Link from 'next/link'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { lineItemTotal } from '@/lib/sale-utils'
import { formatCurrency } from '@/lib/utils'
import type { SaleEggCategoryOption } from '@/components/sales/egg-sale-types'
import type { SaleLineItem } from '@/types/database'

const OTHER = 'Other' as const

interface LineItemsEditorProps {
  farmId: string
  lines: SaleLineItem[]
  categoryOptions: SaleEggCategoryOption[]
  eggCategories: SaleEggCategoryOption[]
  categoriesLoading: boolean
  categoriesError: string | null
  isPending: boolean
  onAddLine: () => void
  onRemoveLine: (index: number) => void
  onApplyTypeChange: (index: number, value: string) => void
  onUpdateLine: (index: number, patch: Partial<SaleLineItem>) => void
}

export function LineItemsEditor({
  farmId,
  lines,
  categoryOptions,
  eggCategories,
  categoriesLoading,
  categoriesError,
  isPending,
  onAddLine,
  onRemoveLine,
  onApplyTypeChange,
  onUpdateLine,
}: LineItemsEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          Line Items
        </Label>
        <div className="flex items-center gap-2">
          {categoriesLoading && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading…
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-primary hover:text-primary-dark"
            onClick={onAddLine}
            disabled={isPending}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>
      {categoriesError && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Could not load egg categories: {categoriesError}
        </p>
      )}
      {!categoriesLoading && eggCategories.length === 0 && (
        <p className="rounded-xl border border-dashed px-3 py-2 text-sm text-muted-foreground">
          No egg categories. Add them in{' '}
          <Link
            href={`/farm/settings?farm=${encodeURIComponent(farmId)}`}
            className="font-medium text-primary-dark underline underline-offset-2"
          >
            Settings
          </Link>
          .
        </p>
      )}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-black/[0.04]">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              <th className="p-3">Product / Service</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Rate (Rs)</th>
              <th className="p-3 text-right">Amount (Rs)</th>
              <th className="w-10 p-2" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className="p-3 align-top">
                  <Select
                    value={line.type}
                    onValueChange={(v) => v && onApplyTypeChange(i, v)}
                    disabled={isPending}
                  >
                    <SelectTrigger className="h-9 min-w-[200px] max-w-[280px] rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          {`${c.name} — ${formatCurrency(c.default_price)}`}
                        </SelectItem>
                      ))}
                      <SelectItem value={OTHER}>Other (manual)</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 align-top w-24">
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    className="h-9 rounded-lg"
                    value={line.quantity || ''}
                    onChange={(e) =>
                      onUpdateLine(i, { quantity: parseFloat(e.target.value) || 0 })
                    }
                    disabled={isPending}
                  />
                </td>
                <td className="p-3 align-top w-28">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="h-9 rounded-lg"
                    value={line.unit_price || ''}
                    onChange={(e) =>
                      onUpdateLine(i, {
                        unit_price: parseFloat(e.target.value) || 0,
                      })
                    }
                    disabled={isPending}
                  />
                </td>
                <td className="p-3 align-top text-right font-semibold text-gray-900">
                  {formatCurrency(lineItemTotal(line))}
                </td>
                <td className="p-2 align-top">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="h-8 w-8 text-red-600"
                    onClick={() => onRemoveLine(i)}
                    disabled={isPending || lines.length <= 1}
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
