import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const DEFAULT_ROWS = (farmId: string) =>
  [
    { farm_id: farmId, name: 'Grade A', description: null, default_price: 0, sort_order: 0, is_active: true },
    { farm_id: farmId, name: 'Grade B', description: null, default_price: 0, sort_order: 1, is_active: true },
    { farm_id: farmId, name: 'Cracked', description: null, default_price: 0, sort_order: 2, is_active: true },
  ] as const

/**
 * Inserts default egg categories for a new farm. Uses service role when available;
 * otherwise relies on org-admin RLS when an admin creates the farm.
 */
export async function seedDefaultEggCategoriesForFarm(farmId: string): Promise<void> {
  const admin = getSupabaseAdmin()
  const db = admin ?? (await createClient())
  const { count, error: countErr } = await db
    .from('egg_categories')
    .select('*', { count: 'exact', head: true })
    .eq('farm_id', farmId)
  if (countErr) {
    console.error('[seedDefaultEggCategoriesForFarm] count', countErr.message)
    return
  }
  if ((count ?? 0) > 0) return

  const { error } = await db.from('egg_categories').insert([...DEFAULT_ROWS(farmId)])
  if (error && !error.message.includes('duplicate') && error.code !== '23505') {
    console.error('[seedDefaultEggCategoriesForFarm]', error.message)
  }
}
