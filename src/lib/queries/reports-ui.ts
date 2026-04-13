import { getActiveFlocks } from '@/lib/queries/flocks'

export async function getFlockRowsForReports(
  farmId: string
): Promise<{ id: string; label: string }[]> {
  const flocks = await getActiveFlocks(farmId)
  return flocks.map((f) => ({
    id: f.id,
    label: `${f.batch_number} — ${f.breed}`,
  }))
}

export async function getFlockRowsForReportsFarmIds(
  farmIds: string[]
): Promise<{ id: string; label: string }[]> {
  const lists = await Promise.all(farmIds.map((id) => getActiveFlocks(id)))
  return lists.flat().map((f) => ({
    id: f.id,
    label: `${f.batch_number} — ${f.breed}`,
  }))
}
