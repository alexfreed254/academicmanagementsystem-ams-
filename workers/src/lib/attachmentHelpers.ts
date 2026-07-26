/**
 * Placement-first industrial attachment helpers (port of routes/attachment_helpers.py).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

type Row = Record<string, unknown>

async function tableOk(db: SupabaseClient, table: string): Promise<boolean> {
  try {
    const { error } = await db.from(table).select('id').limit(1)
    return !error
  } catch {
    return false
  }
}

export async function attachmentPeriodsExist(db: SupabaseClient): Promise<boolean> {
  return tableOk(db, 'attachment_periods')
}

export async function getOpenPeriod(
  db: SupabaseClient,
  term?: string,
  year?: number,
): Promise<Row | null> {
  if (!(await tableOk(db, 'attachment_periods'))) return null
  try {
    let q = db.from('attachment_periods').select('*').eq('is_open', true)
    if (term) q = q.eq('term', term)
    if (year) q = q.eq('year', year)
    const { data } = await q.order('application_closes', { ascending: false }).limit(1)
    const period = ((data ?? []) as Row[])[0]
    if (!period) return null
    const today = new Date().toISOString().slice(0, 10)
    if (period.application_opens && String(period.application_opens) > today) return null
    if (period.application_closes && String(period.application_closes) < today) return null
    return period
  } catch {
    return null
  }
}

async function isStudentEligible(db: SupabaseClient, studentId: string, periodId: string): Promise<boolean> {
  if (!periodId || !(await tableOk(db, 'attachment_period_eligibility'))) return true
  try {
    const { data } = await db
      .from('attachment_period_eligibility')
      .select('is_eligible')
      .eq('period_id', periodId)
      .eq('student_id', studentId)
      .limit(1)
    const row = ((data ?? []) as Row[])[0]
    if (!row) return false
    return Boolean(row.is_eligible)
  } catch {
    return true
  }
}

export async function studentCanSubmitPlacement(
  db: SupabaseClient,
  studentId: string,
  term: string,
  year: number,
): Promise<{ allowed: boolean; message: string; period: Row | null }> {
  const period = await getOpenPeriod(db, term || undefined, year || undefined)
  if (period) {
    const eligible = await isStudentEligible(db, studentId, String(period.id || ''))
    if (!eligible) {
      return {
        allowed: false,
        message:
          'You are not on the eligible list for this attachment period. Contact the Industrial Liaison Officer.',
        period,
      }
    }
    return { allowed: true, message: '', period }
  }
  if (await attachmentPeriodsExist(db)) {
    return {
      allowed: false,
      message:
        'No attachment application window is open for the selected term and year. Wait for the liaison officer to open the period.',
      period: null,
    }
  }
  return { allowed: true, message: '', period: null }
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const r = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * r * Math.asin(Math.sqrt(a))
}

export const INDUSTRIES = [
  'Electrical Engineering',
  'Mechanical Engineering',
  'Information Technology',
  'Civil Engineering',
  'Automotive Engineering',
  'Hospitality',
  'Business Management',
  'Health Sciences',
  'Agriculture',
  'Construction',
  'Manufacturing',
  'Other',
] as const
