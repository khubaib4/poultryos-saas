'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createFarmAction,
  updateFarmAction,
  type CreateFarmResult,
} from '@/lib/actions/farms'
import { WorkerCredentialsDialog } from '@/components/farms/WorkerCredentialsDialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const farmEditSchema = z.object({
  name: z.string().min(2, 'Farm name must be at least 2 characters.').max(100),
  location: z.string().max(200).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
})

type FarmEditValues = z.infer<typeof farmEditSchema>

const createFarmFormSchema = z
  .object({
    name: z.string().min(2, 'Farm name must be at least 2 characters.').max(100),
    location: z.string().max(200).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    createWorker: z.boolean(),
    workerName: z.string().optional(),
    workerEmail: z.string().optional(),
    workerPhone: z.string().optional(),
    workerPassword: z.string().optional(),
    workerPasswordConfirm: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.createWorker) return
    if (!data.workerName?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Worker name is required.',
        path: ['workerName'],
      })
    }
    const em = data.workerEmail?.trim()
    if (!em) {
      ctx.addIssue({
        code: 'custom',
        message: 'Worker email is required.',
        path: ['workerEmail'],
      })
    } else {
      const r = z.string().email().safeParse(em)
      if (!r.success) {
        ctx.addIssue({
          code: 'custom',
          message: 'Enter a valid email address.',
          path: ['workerEmail'],
        })
      }
    }
    const pw = data.workerPassword
    if (!pw || pw.length < 8) {
      ctx.addIssue({
        code: 'custom',
        message: 'Password must be at least 8 characters.',
        path: ['workerPassword'],
      })
    }
    if (pw !== data.workerPasswordConfirm) {
      ctx.addIssue({
        code: 'custom',
        message: 'Passwords do not match.',
        path: ['workerPasswordConfirm'],
      })
    }
  })

type CreateFarmFormValues = z.infer<typeof createFarmFormSchema>

function FarmEditForm({
  farmId,
  initialValues,
  className,
}: {
  farmId: string
  initialValues?: Partial<FarmEditValues>
  className?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<FarmEditValues>({
    resolver: zodResolver(farmEditSchema),
    defaultValues: {
      name: initialValues?.name ?? '',
      location: initialValues?.location ?? '',
      status: initialValues?.status ?? 'ACTIVE',
    },
  })

  const statusValue = watch('status')

  const onSubmit = (data: FarmEditValues) => {
    startTransition(async () => {
      const result = await updateFarmAction(farmId, data)
      if ('error' in result) {
        setError('root', { message: result.error })
        return
      }
      toast.success('Farm updated.')
      router.push('/admin/farms')
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn('space-y-5', className)}>
      {errors.root && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.root.message}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">
          Farm Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g. North Farm"
          disabled={isPending}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">
          Location{' '}
          <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </Label>
        <Input
          id="location"
          placeholder="e.g. Lahore, Punjab"
          disabled={isPending}
          {...register('location')}
        />
        {errors.location && (
          <p className="text-xs text-red-600">{errors.location.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={statusValue}
          onValueChange={(v) => setValue('status', v as 'ACTIVE' | 'INACTIVE')}
          disabled={isPending}
        >
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          className="bg-primary hover:bg-primary-dark"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/farms')}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

function FarmCreateForm({
  organizationId,
  initialValues,
  className,
}: {
  organizationId: string
  initialValues?: Partial<FarmEditValues>
  className?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [credentials, setCredentials] = useState<{
    email: string
    password: string
  } | null>(null)
  const [credentialsOpen, setCredentialsOpen] = useState(false)
  const [pendingFarmId, setPendingFarmId] = useState<string | null>(null)
  const [partial, setPartial] = useState<{ farmId: string; error: string } | null>(
    null
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<CreateFarmFormValues>({
    resolver: zodResolver(createFarmFormSchema),
    defaultValues: {
      name: initialValues?.name ?? '',
      location: initialValues?.location ?? '',
      status: initialValues?.status ?? 'ACTIVE',
      createWorker: true,
      workerName: '',
      workerEmail: '',
      workerPhone: '',
      workerPassword: '',
      workerPasswordConfirm: '',
    },
  })

  const statusValue = watch('status')
  const createWorker = watch('createWorker')

  const onSubmit = (data: CreateFarmFormValues) => {
    setPartial(null)
    startTransition(async () => {
      const result = await createFarmAction({
        name: data.name,
        location: data.location,
        status: data.status,
        organization_id: organizationId,
        createWorker: data.createWorker,
        workerName: data.workerName,
        workerEmail: data.workerEmail,
        workerPhone: data.workerPhone,
        workerPassword: data.workerPassword,
      })

      if ('error' in result) {
        setError('root', { message: result.error })
        return
      }

      const partialResult = result as CreateFarmResult
      if ('partial' in partialResult && partialResult.partial) {
        const pr = partialResult as Extract<CreateFarmResult, { partial: true }>
        setPartial({ farmId: pr.farmId, error: pr.error })
        toast.warning('Farm created, but the worker account could not be completed.')
        router.refresh()
        return
      }

      router.refresh()
      const ok = partialResult as Extract<CreateFarmResult, { id: string }>
      if (ok.worker) {
        setPendingFarmId(ok.id)
        setCredentials(ok.worker)
        setCredentialsOpen(true)
        toast.success('Farm and worker account created.')
      } else {
        toast.success('Farm created.')
        router.push('/admin/farms')
      }
    })
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className={cn('space-y-5', className)}>
        {errors.root && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors.root.message}
          </div>
        )}

        {partial && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 space-y-2">
            <p className="font-medium">Farm created — worker step incomplete</p>
            <p className="text-amber-800/90">{partial.error}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href={`/admin/farms/${partial.farmId}`}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'inline-flex items-center'
                )}
              >
                Open farm & add worker
              </Link>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-amber-900"
                onClick={() => setPartial(null)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">
            Farm Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            placeholder="e.g. North Farm"
            disabled={isPending}
            {...register('name')}
          />
          {errors.name && (
            <p className="text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">
            Location{' '}
            <span className="text-gray-400 font-normal text-xs">(optional)</span>
          </Label>
          <Input
            id="location"
            placeholder="e.g. Lahore, Punjab"
            disabled={isPending}
            {...register('location')}
          />
          {errors.location && (
            <p className="text-xs text-red-600">{errors.location.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={statusValue}
            onValueChange={(v) => setValue('status', v as 'ACTIVE' | 'INACTIVE')}
            disabled={isPending}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
          <div className="flex items-start gap-3">
            <input
              id="createWorker"
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-gray-300"
              checked={createWorker}
              disabled={isPending}
              onChange={(e) => {
                setValue('createWorker', e.target.checked, { shouldValidate: true })
              }}
            />
            <div className="space-y-1">
              <Label htmlFor="createWorker" className="text-sm font-medium cursor-pointer">
                Create a worker account for this farm
              </Label>
              <p className="text-xs text-muted-foreground">
                The worker can sign in and manage this farm only. You can turn this off
                and add workers later from the farm page.
              </p>
            </div>
          </div>

          {createWorker && (
            <div className="space-y-4 pt-2 border-t">
              <p className="text-sm font-medium text-gray-900">Worker details</p>
              <div className="space-y-2">
                <Label htmlFor="workerName">
                  Worker name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="workerName"
                  disabled={isPending}
                  {...register('workerName')}
                />
                {errors.workerName && (
                  <p className="text-xs text-red-600">{errors.workerName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="workerEmail">
                  Worker email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="workerEmail"
                  type="email"
                  autoComplete="off"
                  disabled={isPending}
                  {...register('workerEmail')}
                />
                {errors.workerEmail && (
                  <p className="text-xs text-red-600">{errors.workerEmail.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="workerPhone">
                  Worker phone{' '}
                  <span className="text-gray-400 font-normal text-xs">(optional)</span>
                </Label>
                <Input id="workerPhone" disabled={isPending} {...register('workerPhone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workerPassword">
                  Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="workerPassword"
                  type="password"
                  autoComplete="new-password"
                  disabled={isPending}
                  {...register('workerPassword')}
                />
                {errors.workerPassword && (
                  <p className="text-xs text-red-600">{errors.workerPassword.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="workerPasswordConfirm">
                  Confirm password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="workerPasswordConfirm"
                  type="password"
                  autoComplete="new-password"
                  disabled={isPending}
                  {...register('workerPasswordConfirm')}
                />
                {errors.workerPasswordConfirm && (
                  <p className="text-xs text-red-600">
                    {errors.workerPasswordConfirm.message}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            className="bg-primary hover:bg-primary-dark"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              'Create Farm'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/farms')}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </form>

      {credentials && (
        <WorkerCredentialsDialog
          open={credentialsOpen}
          onOpenChange={(open) => {
            setCredentialsOpen(open)
            if (!open) {
              setCredentials(null)
              if (pendingFarmId) {
                router.push(`/admin/farms/${pendingFarmId}`)
                setPendingFarmId(null)
              }
            }
          }}
          email={credentials.email}
          password={credentials.password}
          title="Farm created — worker credentials"
        />
      )}
    </>
  )
}

interface FarmFormProps {
  organizationId: string
  farmId?: string
  initialValues?: Partial<FarmEditValues>
  className?: string
}

export function FarmForm({
  organizationId,
  farmId,
  initialValues,
  className,
}: FarmFormProps) {
  if (farmId) {
    return (
      <FarmEditForm
        farmId={farmId}
        initialValues={initialValues}
        className={className}
      />
    )
  }
  return (
    <FarmCreateForm
      organizationId={organizationId}
      initialValues={initialValues}
      className={className}
    />
  )
}
