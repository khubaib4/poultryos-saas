'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  cacheAuth,
  clearAuthCache,
  getCachedAuth,
} from '@/lib/auth/profile-cache'
import type { UserProfile } from '@/types/database'

interface AuthContextType {
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  profile: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, status, organization_id')
        .eq('id', userId)
        .single()

      if (error) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const cached = getCachedAuth()
          if (cached?.profile.id === userId) {
            setProfile(cached.profile)
            return
          }
        }
        setProfile(null)
        return
      }

      if (data) {
        const p = data as UserProfile
        setProfile(p)
        cacheAuth(p)
      } else {
        setProfile(null)
      }
    },
    [supabase]
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        void fetchProfile(session.user.id).finally(() => setLoading(false))
        return
      }
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const cached = getCachedAuth()
        if (cached?.profile) {
          setProfile(cached.profile)
          setLoading(false)
          return
        }
      }
      setProfile(null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearAuthCache()
        setProfile(null)
        setLoading(false)
        return
      }
      if (session?.user) {
        void fetchProfile(session.user.id).finally(() => setLoading(false))
        return
      }
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const cached = getCachedAuth()
        if (cached?.profile) {
          setProfile(cached.profile)
          setLoading(false)
          return
        }
      }
      clearAuthCache()
      setProfile(null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase, fetchProfile])

  const signOut = useCallback(async () => {
    clearAuthCache()
    await supabase.auth.signOut()
    setProfile(null)
    router.push('/login')
  }, [supabase, router])

  return (
    <AuthContext.Provider value={{ profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => useContext(AuthContext)
