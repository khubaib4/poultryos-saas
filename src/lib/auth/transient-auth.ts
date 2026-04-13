/** True when Supabase auth likely failed due to network / reachability, not invalid credentials. */
export function isTransientAuthFailure(message: string | undefined): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  if (m.includes('jwt') && m.includes('invalid')) return false
  if (m.includes('session') && (m.includes('missing') || m.includes('expired'))) return false
  return (
    m.includes('fetch') ||
    m.includes('network') ||
    m.includes('failed to fetch') ||
    m.includes('timeout') ||
    m.includes('econnrefused') ||
    m.includes('econnreset') ||
    m.includes('socket') ||
    m.includes('getaddrinfo') ||
    m.includes('enotfound')
  )
}
