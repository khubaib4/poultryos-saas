/**
 * Client-side key for remembering the selected farm when building /farm/* links
 * from the global sidebar (synced from URL by FarmWorkspaceShell).
 */
export const SELECTED_FARM_STORAGE_KEY = 'poultryos_selected_farm_id'

export function farmQuerySuffix(farmId: string | null): string {
  if (!farmId) return ''
  return `?farm=${encodeURIComponent(farmId)}`
}

/** Append or replace `farm` query param on a /farm path. */
export function withFarmQuery(
  path: string,
  farmId: string,
  extraParams?: Record<string, string>
): string {
  const [base, existing] = path.split('?')
  const p = new URLSearchParams(existing ?? '')
  p.set('farm', farmId)
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      p.set(k, v)
    }
  }
  return `${base}?${p.toString()}`
}
