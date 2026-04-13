'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, UserPlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addWorkerToFarmAction } from '@/lib/actions/farms'
import { WorkerCredentialsDialog } from '@/components/farms/WorkerCredentialsDialog'
import { toast } from 'sonner'

const addWorkerSchema = z
  .object({
    name: z.string().min(1, 'Name is required.').max(120),
    email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
    phone: z.string().max(40).optional(),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    passwordConfirm: z.string().min(1, 'Confirm the password.'),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.passwordConfirm) {
      ctx.addIssue({
        code: 'custom',
        message: 'Passwords do not match.',
        path: ['passwordConfirm'],
      })
    }
  })

type AddWorkerValues = z.infer<typeof addWorkerSchema>

interface AddWorkerDialogProps {
  farmId: string
}

export function AddWorkerDialog({ farmId }: AddWorkerDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [credentialsOpen, setCredentialsOpen] = useState(false)
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(
    null
  )
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<AddWorkerValues>({
    resolver: zodResolver(addWorkerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      passwordConfirm: '',
    },
  })

  const onSubmit = (data: AddWorkerValues) => {
    startTransition(async () => {
      const result = await addWorkerToFarmAction(farmId, {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        password: data.password,
      })

      if ('error' in result) {
        setError('root', { message: result.error })
        return
      }

      reset()
      setOpen(false)
      setCreds(result.worker)
      setCredentialsOpen(true)
      toast.success('Worker added to this farm.')
      router.refresh()
    })
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) reset()
        }}
      >
        <DialogTrigger
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <UserPlus className="h-4 w-4" />
          Add Worker
        </DialogTrigger>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Add farm worker</DialogTitle>
            <DialogDescription>
              Create a login for someone who will manage this farm. They must use
              the email and password you set here.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
            {errors.root && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errors.root.message}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="aw-name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input id="aw-name" disabled={isPending} {...register('name')} />
              {errors.name && (
                <p className="text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="aw-email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="aw-email"
                type="email"
                autoComplete="off"
                disabled={isPending}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="aw-phone">
                Phone{' '}
                <span className="text-gray-400 font-normal text-xs">(optional)</span>
              </Label>
              <Input id="aw-phone" disabled={isPending} {...register('phone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aw-pw">
                Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="aw-pw"
                type="password"
                autoComplete="new-password"
                disabled={isPending}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="aw-pw2">
                Confirm password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="aw-pw2"
                type="password"
                autoComplete="new-password"
                disabled={isPending}
                {...register('passwordConfirm')}
              />
              {errors.passwordConfirm && (
                <p className="text-xs text-red-600">{errors.passwordConfirm.message}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
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
                  'Create worker'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {creds && (
        <WorkerCredentialsDialog
          open={credentialsOpen}
          onOpenChange={(v) => {
            setCredentialsOpen(v)
            if (!v) setCreds(null)
          }}
          email={creds.email}
          password={creds.password}
        />
      )}
    </>
  )
}
