'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Customer } from '@/types/database'

interface CustomerPickerProps {
  customers: Customer[]
  value: string | null
  onChange: (customerId: string | null) => void
  disabled?: boolean
  placeholder?: string
}

export function CustomerPicker({
  customers,
  value,
  onChange,
  disabled,
  placeholder = 'Select customer…',
}: CustomerPickerProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const selected = customers.find((c) => c.id === value)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return customers
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        (c.phone && c.phone.toLowerCase().includes(s)) ||
        (c.business_name && c.business_name.toLowerCase().includes(s))
    )
  }, [customers, q])

  return (
    <div className="relative w-full max-w-md">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-lg border border-input bg-background px-2.5 text-sm',
          'outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          disabled && 'opacity-50 pointer-events-none'
        )}
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected ? selected.name : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-white shadow-md">
            <input
              className="w-full border-b px-2.5 py-2 text-sm outline-none"
              placeholder="Search name, phone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
            <ul className="max-h-52 overflow-y-auto py-1 text-sm">
              <li>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-gray-500 hover:bg-gray-50"
                  onClick={() => {
                    onChange(null)
                    setOpen(false)
                    setQ('')
                  }}
                >
                  No customer
                </button>
              </li>
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-gray-50',
                      value === c.id && 'bg-primary-lighter'
                    )}
                    onClick={() => {
                      onChange(c.id)
                      setOpen(false)
                      setQ('')
                    }}
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0',
                        value === c.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="truncate">
                      {c.name}
                      {c.phone ? (
                        <span className="text-gray-400"> · {c.phone}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-2.5 py-3 text-center text-gray-500">No matches.</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
