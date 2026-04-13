import { createClient } from '@/lib/supabase/server'

type RequireFarmWorkerOptions = {
  /** Shown when an org admin tries to mutate farm-worker-only data. */
  adminBlockedMessage?: string
}

/** Ensures the current user is a FARM_USER assigned to the farm (not admin-only). */
export async function requireFarmWorkerForFarm(
  farmId: string,
  opts?: RequireFarmWorkerOptions
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { data: u, error: userErr } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userErr || !u) return { error: 'Could not verify your account.' }

  if (u.role === 'ADMIN' || u.role === 'SYSTEM_OWNER') {
    return {
      error:
        opts?.adminBlockedMessage ??
        'This action is for farm workers. Admins manage organization settings from the Admin area.',
    }
  }

  if (u.role !== 'FARM_USER') {
    return { error: 'You are not allowed to perform this action.' }
  }

  const { data: assignment } = await supabase
    .from('farm_users')
    .select('id')
    .eq('farm_id', farmId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!assignment) {
    return { error: 'You are not assigned to this farm.' }
  }

  return { ok: true }
}
