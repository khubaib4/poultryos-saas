import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Build the env name at runtime so Next.js does not replace it with `undefined`
 * at build time when the secret was not present in the build environment
 * (e.g. CI `next build` without the key, then runtime inject on Vercel).
 */
function serviceRoleEnvName(): string {
  return ['SUPABASE', 'SERVICE', 'ROLE', 'KEY'].join('_')
}

function readRawServiceRoleKey(): string | undefined {
  const name = serviceRoleEnvName()
  return (process.env as Record<string, string | undefined>)[name]
}

function normalizeSecret(value: string): string {
  return value.trim().replace(/^["']|["']$/g, '')
}

/** Why the service role key is unusable (for clearer errors; never logs the key). */
export function getServiceRoleEnvIssue(): 'missing' | 'empty' | null {
  const raw = readRawServiceRoleKey()
  if (raw === undefined) return 'missing'
  const normalized = normalizeSecret(raw)
  if (normalized.length === 0) return 'empty'
  return null
}

/**
 * Service-role client for admin-only server operations (e.g. creating farm worker auth users).
 * Returns null if SUPABASE_SERVICE_ROLE_KEY is missing or blank.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = readRawServiceRoleKey()
  const normalized = key !== undefined ? normalizeSecret(key) : ''
  if (!url || normalized.length === 0) return null
  return createClient(url, normalized, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * If worker provisioning cannot run, returns a user-facing reason.
 * Uses runtime env reads so production hosts pick up secrets set after build.
 */
export function serviceRoleKeySetupError(): string | null {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    return 'NEXT_PUBLIC_SUPABASE_URL is missing. Add it to .env.local at the project root.'
  }
  const issue = getServiceRoleEnvIssue()
  if (issue === 'empty') {
    return (
      'SUPABASE_SERVICE_ROLE_KEY is set but the value is empty. Paste the full service_role secret on the ' +
      'same line (no line break after =), save .env.local, and restart the dev server (stop and run npm run dev again).'
    )
  }
  if (issue === 'missing') {
    return (
      'SUPABASE_SERVICE_ROLE_KEY is not available to the server. For local dev: put it in `.env.local` ' +
      'next to package.json, save, then fully restart `npm run dev`. For Vercel/hosting: add ' +
      'SUPABASE_SERVICE_ROLE_KEY in Project → Settings → Environment Variables for Production (and Preview if needed), then redeploy — ' +
      'a variable only on your machine will not work in the cloud.'
    )
  }
  return null
}
