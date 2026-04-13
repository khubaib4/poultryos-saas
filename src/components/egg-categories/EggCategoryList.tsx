'use client'

import { Fragment, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  deleteEggCategoryAction,
  reorderEggCategoriesAction,
  seedDefaultEggCategoriesAction,
  updateEggCategoryAction,
} from '@/lib/actions/egg-categories'
import { EggCategoryFormDialog } from '@/components/egg-categories/EggCategoryFormDialog'
import type { EggCategory } from '@/types/database'
import { toast } from 'sonner'

interface EggCategoryListProps {
  farmId: string
  initialCategories: EggCategory[]
}

export function EggCategoryList({ farmId, initialCategories }: EggCategoryListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<EggCategory | null>(null)

  const sorted = useMemo(
    () =>
      [...initialCategories].sort(
        (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
      ),
    [initialCategories]
  )

  const refresh = () => router.refresh()

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir
    if (j < 0 || j >= sorted.length) return
    const next = [...sorted]
    const t = next[index]
    next[index] = next[j]
    next[j] = t
    startTransition(async () => {
      const res = await reorderEggCategoriesAction(
        farmId,
        next.map((c) => c.id)
      )
      if ('error' in res) {
        toast.error(res.error)
        return
      }
      toast.success('Order updated.')
      refresh()
    })
  }

  const toggleActive = (c: EggCategory) => {
    startTransition(async () => {
      const res = await updateEggCategoryAction(c.id, {
        is_active: !c.is_active,
      })
      if ('error' in res) {
        toast.error(res.error)
        return
      }
      toast.success(c.is_active ? 'Category deactivated.' : 'Category activated.')
      refresh()
    })
  }

  const softDelete = (c: EggCategory) => {
    if (!confirm(`Deactivate “${c.name}”? It will be hidden from new sales.`)) return
    startTransition(async () => {
      const res = await deleteEggCategoryAction(c.id)
      if ('error' in res) {
        toast.error(res.error)
        return
      }
      toast.success('Category deactivated.')
      refresh()
    })
  }

  const seedDefaults = () => {
    startTransition(async () => {
      const res = await seedDefaultEggCategoriesAction(farmId)
      if ('error' in res) {
        toast.error(res.error)
        return
      }
      toast.success('Default categories added.')
      refresh()
    })
  }

  return (
    <Fragment>
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base">Egg categories</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Labels and default PKR prices for sale line items. Workers pick these when
            recording a sale.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {sorted.length === 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={seedDefaults}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Add Grade A / B / Cracked defaults'
              )}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className="bg-primary hover:bg-primary-dark gap-1.5"
            disabled={isPending}
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Add category
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
            <p>No egg categories set up yet.</p>
            <p className="mt-2">
              Use <strong>Add category</strong> or load the usual Grade A / B / Cracked
              defaults.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Default (PKR)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-44">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((c, i) => (
                <TableRow key={c.id}>
                  <TableCell className="align-middle">
                    <div className="flex flex-col gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="h-7 w-7"
                        disabled={isPending || i === 0}
                        aria-label="Move up"
                        onClick={() => move(i, -1)}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="h-7 w-7"
                        disabled={isPending || i === sorted.length - 1}
                        aria-label="Move down"
                        onClick={() => move(i, 1)}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {c.description ?? '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(c.default_price).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        c.is_active
                          ? 'bg-primary-light text-primary-dark border border-primary/20'
                          : 'bg-gray-100 text-gray-600'
                      }
                    >
                      {c.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7"
                        disabled={isPending}
                        onClick={() => toggleActive(c)}
                      >
                        {c.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1"
                        disabled={isPending}
                        onClick={() => {
                          setEditing(c)
                          setDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      {c.is_active && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-red-600"
                          disabled={isPending}
                          onClick={() => softDelete(c)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

    </Card>
    <EggCategoryFormDialog
      farmId={farmId}
      open={dialogOpen}
      onOpenChange={(v) => {
        setDialogOpen(v)
        if (!v) setEditing(null)
      }}
      category={editing}
      onSaved={refresh}
    />
    </Fragment>
  )
}
