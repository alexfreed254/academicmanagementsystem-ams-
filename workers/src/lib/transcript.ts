/**
 * Port of academic_result_transcript.build_marks_transcript_view — the
 * Oral / Practical / Written column layout used by the Marks & Transcript page.
 */

type Row = Record<string, any>

function bucket(assessmentType: string | null | undefined): 'oral' | 'practical' | 'written' {
  const t = (assessmentType ?? '').toUpperCase().trim()
  if (t === 'ORAL') return 'oral'
  if (t.includes('PRACT')) return 'practical'
  return 'written'
}

function markCell(row: Row | null): string {
  if (!row || row.marks_obtained === null || row.marks_obtained === undefined) return '—'
  const obt = parseFloat(String(row.marks_obtained))
  const mx = parseFloat(String(row.max_marks ?? 100)) || 100
  if (Number.isNaN(obt)) return '—'
  const fmt = (n: number) => (n === Math.trunc(n) ? n.toFixed(0) : n.toFixed(1))
  return `${fmt(obt)}/${fmt(mx)}`
}

function splitByType(rows: Row[]): Record<'oral' | 'practical' | 'written', Row[]> {
  const out: Record<'oral' | 'practical' | 'written', Row[]> = { oral: [], practical: [], written: [] }
  for (const r of rows) out[bucket(r.assessment_type)].push(r)
  return out
}

function slotLabels(unitRows: Row[][], b: 'oral' | 'practical' | 'written', count: number, fallback: string): string[] {
  const labels: string[] = []
  for (let i = 0; i < count; i++) {
    const names: string[] = []
    for (const rows of unitRows) {
      const parts = splitByType(rows)[b]
      if (i < parts.length) {
        const n = (parts[i].assessment_name ?? '').trim()
        if (n) names.push(n)
      }
    }
    if (names.length) {
      const counts = new Map<string, number>()
      for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1)
      labels.push([...counts.entries()].sort((a, b2) => b2[1] - a[1])[0][0])
    } else {
      labels.push(`${fallback} ${i + 1}`)
    }
  }
  return labels
}

export function buildMarksTranscriptView(unitsData: Row[]) {
  const unitRows = unitsData.map((ud) => (ud.assessments ?? []) as Row[])

  let maxOral = 0
  let maxPrac = 0
  let maxWrit = 0
  for (const rows of unitRows) {
    const parts = splitByType(rows)
    maxOral = Math.max(maxOral, parts.oral.length)
    maxPrac = Math.max(maxPrac, parts.practical.length)
    maxWrit = Math.max(maxWrit, parts.written.length)
  }
  if (unitsData.length && maxOral + maxPrac + maxWrit === 0) {
    maxOral = maxPrac = maxWrit = 1
  }

  const oralLabels = maxOral ? slotLabels(unitRows, 'oral', maxOral, 'Oral') : []
  const practicalLabels = maxPrac ? slotLabels(unitRows, 'practical', maxPrac, 'Practical') : []
  const writtenLabels = maxWrit ? slotLabels(unitRows, 'written', maxWrit, 'Written') : []

  const rows = unitsData.map((ud) => {
    const parts = splitByType((ud.assessments ?? []) as Row[])
    return {
      ...ud,
      oral_cells: Array.from({ length: maxOral }, (_, j) => markCell(parts.oral[j] ?? null)),
      practical_cells: Array.from({ length: maxPrac }, (_, j) => markCell(parts.practical[j] ?? null)),
      written_cells: Array.from({ length: maxWrit }, (_, j) => markCell(parts.written[j] ?? null)),
    }
  })

  return {
    oral_labels: oralLabels,
    practical_labels: practicalLabels,
    written_labels: writtenLabels,
    max_oral: maxOral,
    max_practical: maxPrac,
    max_written: maxWrit,
    units_rows: rows,
  }
}
