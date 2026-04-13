import { createClient } from '@/lib/supabase/server'
import type { EggCategory } from '@/types/database'

function mapRow(row: Record<string, unknown>): EggCategory {
  return {
    id: String(row.id),
    farm_id: String(row.farm_id),
    name: String(row.name),
    description: row.description != null ? String(row.description) : null,
    default_price: Number(row.default_price ?? 0),
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
    updated_at: row.updated_at != null ? String(row.updated_at) : null,
  }
}

/** Active categories for sales forms (sorted). */
export async function getEggCategories(farmId: string): Promise<EggCategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('egg_categories')
    .select('*')
    .eq('farm_id', farmId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error || !data) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[getEggCategories]', error?.message)
    }
    return []
  }
  return data.map((r) => mapRow(r as Record<string, unknown>))
}

export async function getEggCategory(id: string): Promise<EggCategory | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('egg_categories')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return mapRow(data as Record<string, unknown>)
}

/** All categories including inactive (settings UI). */
export async function getAllEggCategories(farmId: string): Promise<EggCategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('egg_categories')
    .select('*')
    .eq('farm_id', farmId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error || !data) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[getAllEggCategories]', error?.message)
    }
    return []
  }
  return data.map((r) => mapRow(r as Record<string, unknown>))
}
