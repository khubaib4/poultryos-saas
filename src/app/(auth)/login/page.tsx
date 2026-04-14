'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  BarChart3,
  Egg,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Package,
  Tractor,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginAction } from '@/lib/auth/actions'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await loginAction(email, password)
      if ('error' in result) {
        setError(result.error)
      } else {
        router.push(result.redirectTo || '/admin')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* Left Side - Branding Panel */}
        <div className="relative flex shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-green-500 to-green-600 p-8 lg:w-1/2 lg:p-12">
          {/* Honeycomb pattern overlay */}
          <div
            className="login-pattern pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
            aria-hidden
          />

          <div className="relative z-10">
            {/* Logo */}
            <div className="mb-12 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                <Tractor className="h-6 w-6 text-white" aria-hidden />
              </div>
              <span className="text-xl font-semibold text-white">PoultryOS</span>
            </div>

            {/* Headline */}
            <h1 className="mb-8 text-4xl font-bold leading-tight text-white lg:text-5xl">
              Smart Farm
              <br />
              Management
            </h1>

            {/* Feature list */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white/90">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                  <Egg className="h-5 w-5 text-white" aria-hidden />
                </div>
                <span>Track egg production in real-time</span>
              </div>
              <div className="flex items-center gap-3 text-white/90">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                  <BarChart3 className="h-5 w-5 text-white" aria-hidden />
                </div>
                <span>Monitor flock health</span>
              </div>
              <div className="flex items-center gap-3 text-white/90">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                  <Package className="h-5 w-5 text-white" aria-hidden />
                </div>
                <span>Manage sales &amp; inventory</span>
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <div className="relative z-10 mt-10">
            <div className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm ring-1 ring-white/15">
              <div className="mb-3 flex gap-1" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className="h-4 w-4 fill-current text-amber-400"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>

              <p className="mb-4 text-white/90 italic">
                "PoultryOS has transformed how we manage our 50,000-bird facility. The
                data insights are incredible for predicting yields."
              </p>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 text-sm font-semibold text-white">
                  A
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-white">Ahmed</p>
                  <p className="truncate text-sm text-white/70">
                    Farm Owner, Green Valleys Poultry
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex flex-1 items-center justify-center bg-white p-8 lg:w-1/2 lg:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h2 className="mb-2 text-3xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-gray-500">Sign in to your farm account</p>
            </div>

            {error ? (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-medium text-gray-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@farm.com"
                    autoComplete="email"
                    disabled={loading}
                    required
                    className="h-12 rounded-xl border-gray-200 bg-gray-50 pl-12 focus-visible:border-green-500 focus-visible:ring-green-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={loading}
                    required
                    className="h-12 rounded-xl border-gray-200 bg-gray-50 pl-12 pr-12 focus-visible:border-green-500 focus-visible:ring-green-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-green-500 text-base font-medium text-white hover:bg-green-600"
              >
                {loading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In
                    <ArrowRight className="h-5 w-5" />
                  </span>
                )}
              </Button>
            </form>

            <p className="mt-8 text-center text-gray-500">
              Don&apos;t have an account?{' '}
              <a
                href="#"
                className="font-semibold text-gray-900 hover:text-green-600"
              >
                Contact Admin
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
