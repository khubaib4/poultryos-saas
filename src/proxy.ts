import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { PROFILE_COOKIE_NAME } from '@/lib/auth/profile-cache'
import { isTransientAuthFailure } from '@/lib/auth/transient-auth'
import type { UserProfile } from '@/types/database'

function getProfileFromRequestCookie(
  request: NextRequest
): UserProfile | null {
  const raw = request.cookies.get(PROFILE_COOKIE_NAME)?.value
  if (!raw) return null
  try {
    const profile = JSON.parse(decodeURIComponent(raw)) as UserProfile
    if (profile?.id && profile?.email && profile?.role) return profile
  } catch {
    /* ignore */
  }
  return null
}

function dashboardUrlForRole(role: UserProfile['role'], request: NextRequest) {
  if (role === 'SYSTEM_OWNER')
    return NextResponse.redirect(new URL('/system', request.url))
  if (role === 'ADMIN')
    return NextResponse.redirect(new URL('/admin', request.url))
  return NextResponse.redirect(new URL('/farm', request.url))
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user: { id: string } | null = null
  let authUnreachable = false

  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      authUnreachable = isTransientAuthFailure(error.message)
      user = null
    } else {
      user = data.user
    }
  } catch (e) {
    authUnreachable = true
    user = null
    void e
  }

  const cookieProfile = getProfileFromRequestCookie(request)
  const trustOfflineHint = authUnreachable && !!cookieProfile

  const { pathname } = request.nextUrl

  const isProtected =
    pathname.startsWith('/system') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/farm')

  // Unauthenticated → redirect away from protected routes (unless offline hint)
  if (isProtected && !user) {
    if (!trustOfflineHint) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return response
  }

  const isAuthPage = pathname === '/login' || pathname === '/register'

  // Authenticated (or offline hint) → redirect away from auth pages
  if (isAuthPage && (user || trustOfflineHint)) {
    if (user) {
      let role: UserProfile['role'] | undefined
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
        role = profile?.role as UserProfile['role'] | undefined
      } catch {
        if (cookieProfile?.id === user.id) role = cookieProfile.role
      }
      if (!role && cookieProfile?.id === user.id) role = cookieProfile.role
      if (role === 'SYSTEM_OWNER') {
        return NextResponse.redirect(new URL('/system', request.url))
      }
      if (role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
      return NextResponse.redirect(new URL('/farm', request.url))
    }
    if (cookieProfile) {
      return dashboardUrlForRole(cookieProfile.role, request)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/system/:path*',
    '/admin/:path*',
    '/farm/:path*',
    '/login',
    '/register',
  ],
}
