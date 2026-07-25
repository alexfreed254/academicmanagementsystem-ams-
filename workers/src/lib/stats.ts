/**
 * Dashboard count helpers — TypeScript port of stats_utils.py.
 *
 * Uses PostgREST `count: 'exact'` with `head: true` so KPIs are never silently
 * capped by the default row limit, exactly like the Flask helpers.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

type Db = SupabaseClient

export async function exactCount(query: PromiseLike<{ count: number | null }>): Promise<number> {
  return query.then(
    (res) => res.count ?? 0,
    () => 0,
  )
}

/** Exact row count with optional equality filters (stats_utils.count_table). */
export async function countTable(
  db: Db,
  table: string,
  filters: Record<string, string | number | boolean | null | undefined> = {},
): Promise<number> {
  let q = db.from(table).select('id', { count: 'exact', head: true })
  for (const [col, val] of Object.entries(filters)) {
    if (val === null || val === undefined) continue
    q = q.eq(col, val)
  }
  return exactCount(q)
}

/** {status: exact_count} for each status (stats_utils.count_status_map). */
export async function countStatusMap(
  db: Db,
  table: string,
  statuses: readonly string[],
  extra: Record<string, string | null | undefined> = {},
): Promise<Record<string, number>> {
  const entries = await Promise.all(
    statuses.map(async (status) => {
      const filters: Record<string, string | null | undefined> = { status, ...extra }
      return [status, await countTable(db, table, filters)] as const
    }),
  )
  return Object.fromEntries(entries)
}

export interface ClearanceKpi {
  pending: number
  approved: number
  completed: number
  rejected: number
  returned: number
  in_progress: number
  total: number
}

/**
 * Map clearance_requests statuses to dashboard labels (stats_utils.clearance_kpi):
 *   pending  = pending + in_progress + returned
 *   approved = completed
 */
export async function clearanceKpi(db: Db, departmentId?: string | null): Promise<ClearanceKpi> {
  const statuses = ['pending', 'in_progress', 'returned', 'completed', 'rejected'] as const
  const base = await countStatusMap(db, 'clearance_requests', statuses, {
    department_id: departmentId ?? undefined,
  })
  const pending = base.pending + base.in_progress + base.returned
  return {
    pending,
    approved: base.completed,
    completed: base.completed,
    rejected: base.rejected,
    returned: base.returned,
    in_progress: base.in_progress,
    total: pending + base.completed + base.rejected,
  }
}

const ATTACHMENT_STATUSES = [
  'pending',
  'approved',
  'active',
  'completed',
  'rejected',
  'terminated',
] as const

/** Count industrial_attachments by status for a set of students, chunked. */
export async function attachmentStatusCounts(
  db: Db,
  studentIds: string[],
): Promise<Record<string, number>> {
  const result: Record<string, number> = Object.fromEntries(
    ATTACHMENT_STATUSES.map((s) => [s, 0]),
  )
  if (studentIds.length === 0) return result

  const chunkSize = 80
  for (let i = 0; i < studentIds.length; i += chunkSize) {
    const chunk = studentIds.slice(i, i + chunkSize)
    const { data } = await db
      .from('industrial_attachments')
      .select('status')
      .in('student_id', chunk)
    for (const row of data ?? []) {
      const s = (row as { status?: string }).status || 'pending'
      result[s] = (result[s] ?? 0) + 1
    }
  }
  return result
}

/** Tally a column into {label: count} preserving first-seen order. */
export function tally(rows: Array<Record<string, unknown>>, column: string, fallback = 'Other') {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = (row[column] as string) || fallback
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return { labels: [...map.keys()], counts: [...map.values()] }
}
