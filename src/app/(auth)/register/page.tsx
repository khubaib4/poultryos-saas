'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { registerAction } from '@/lib/auth/actions'

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters.'),
    email: z.string().email('Please enter a valid email address.'),
    phone: z.string().optional(),
    organizationName: z
      .string()
      .min(2, 'Organization name must be at least 2 characters.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
      .regex(/[0-9]/, 'Password must contain at least one number.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = (data: RegisterForm) => {
    startTransition(async () => {
      const result = await registerAction({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        organizationName: data.organizationName,
      })

      if ('error' in result) {
        setError('root', { message: result.error })
      } else {
        router.push(result.redirectTo)
      }
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page-bg px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-gradient text-lg font-bold text-white shadow-sm"
              aria-hidden
            >
              P
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900">
              PoultryOS
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Create your organization and start with the Admin role
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Create account</CardTitle>
            <CardDescription>
              Register to manage farms, workers, and reporting from one place.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <CardContent className="space-y-4 pt-0">
              {errors.root && (
                <div
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    errors.root.message?.toLowerCase().includes('confirm')
                      ? 'border-blue-200 bg-blue-50 text-blue-800'
                      : 'border-red-200 bg-error-light text-red-800'
                  }`}
                >
                  {errors.root.message}
                </div>
              )}

              <div className="space-y-0">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Muhammad Ahmed"
                  autoComplete="name"
                  disabled={isPending}
                  {...register('name')}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-0">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isPending}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-0">
                <Label htmlFor="phone">
                  Phone{' '}
                  <span className="font-normal text-gray-500">(optional)</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+92 300 0000000"
                  autoComplete="tel"
                  disabled={isPending}
                  {...register('phone')}
                />
              </div>

              <div className="space-y-0">
                <Label htmlFor="organizationName">Organization / farm name</Label>
                <Input
                  id="organizationName"
                  type="text"
                  placeholder="Ahmed Poultry Farms"
                  disabled={isPending}
                  {...register('organizationName')}
                />
                {errors.organizationName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.organizationName.message}
                  </p>
                )}
              </div>

              <div className="space-y-0">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters, letters and numbers"
                  autoComplete="new-password"
                  disabled={isPending}
                  {...register('password')}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Use at least 8 characters with letters and numbers.
                </p>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-0">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  disabled={isPending}
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </CardContent>
          </form>

          <CardFooter className="justify-center pt-6">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-medium text-green-600 hover:text-green-700 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
