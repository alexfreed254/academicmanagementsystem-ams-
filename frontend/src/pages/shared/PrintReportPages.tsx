import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import type { CSSProperties, ReactNode } from 'react'
import { api, getApiErrorMessage } from '@/lib/apiClient'
import type { Row } from '@/api/portals'

/* ── Shared print layout & styles ─────────────────────────────────────────── */

const PRINT_CSS = `
@media print {
  .print-toolbar { display: none !important; }
  body.print-body { background: #fff !important; padding: 0 !important; margin: 0 !important; }
  .print-page { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
  .print-landscape { width: auto !important; }
}
@page { margin: 12mm; }
@page landscape { size: A4 landscape; margin: 8mm; }
.print-landscape { page: landscape; }
body.print-body {
  font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
  background: #e9edf3;
  margin: 0;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.print-toolbar {
  position: sticky; top: 0; z-index: 100;
  background: #0a0f1e; color: #fff;
  padding: 10px 20px;
  display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
}
.print-toolbar span { font-size: 13px; font-weight: 700; }
.print-btn {
  padding: 8px 20px; background: #fbbf24; color: #0a0f1e; border: none; border-radius: 8px;
  font-size: 13px; font-weight: 800; cursor: pointer;
}
.print-btn-secondary {
  padding: 8px 16px; background: rgba(255,255,255,.15); color: #fff; border: 1px solid rgba(255,255,255,.25);
  border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none;
}
.print-page {
  background: #fff; max-width: 900px; margin: 16px auto 32px;
  padding: 28px 32px; box-shadow: 0 4px 24px rgba(0,0,0,.1);
  color: #0a0f1e; font-size: 11px; line-height: 1.45;
}
.print-page.landscape { max-width: 1100px; }
.print-letterhead {
  display: flex; align-items: center; gap: 16px;
  padding-bottom: 12px; border-bottom: 3px solid #0d2f6e; margin-bottom: 12px;
}
.print-letterhead img { width: 64px; height: 64px; object-fit: contain; flex-shrink: 0; }
.print-letterhead-center { flex: 1; text-align: center; }
.print-letterhead-center h1 {
  margin: 0; font-size: 17px; font-weight: 900; text-transform: uppercase; letter-spacing: .06em; color: #0d2f6e;
}
.print-letterhead-center p { margin: 4px 0 0; font-size: 10px; color: #64748b; }
.print-band {
  background: #dce6f4; color: #0f2744; text-align: center; padding: 8px 16px;
  margin: 10px 0; border-radius: 4px; border-bottom: 2px solid #0f2744;
}
.print-band h2 { margin: 0; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
.print-band p { margin: 4px 0 0; font-size: 9px; color: #374151; }
.print-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10px; }
.print-table th {
  background: #dce6f4; color: #0f2744; padding: 7px 8px; text-align: left;
  font-weight: 700; font-size: 8.5px; text-transform: uppercase; border: 1px solid #b9c9de;
}
.print-table td { padding: 6px 8px; border: 1px solid #e5e7eb; vertical-align: middle; }
.print-table tbody tr:nth-child(even) td { background: #f8f9fb; }
.print-meta-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px;
}
.print-meta-box {
  background: #f8f9fb; border: 1px solid #e5e7eb; border-radius: 5px; padding: 7px 10px;
}
.print-meta-lbl { font-size: 7.5px; font-weight: 700; color: #6b7280; text-transform: uppercase; }
.print-meta-val { font-size: 10px; font-weight: 700; margin-top: 2px; }
.print-stats { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.print-stat {
  flex: 1; min-width: 100px; border-radius: 5px; padding: 8px 12px; text-align: center; border: 1px solid #e5e7eb;
}
.print-stat-num { font-size: 16px; font-weight: 900; }
.print-stat-lbl { font-size: 7px; font-weight: 700; color: #6b7280; text-transform: uppercase; }
.grade-M { background: #ede9fe; color: #5b21b6; padding: 2px 8px; border-radius: 999px; font-weight: 800; font-size: 8px; }
.grade-P { background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 999px; font-weight: 800; font-size: 8px; }
.grade-C { background: #dbeafe; color: #1d4ed8; padding: 2px 8px; border-radius: 999px; font-weight: 800; font-size: 8px; }
.grade-NYC { background: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 999px; font-weight: 800; font-size: 8px; }
.print-sig { margin-top: 24px; display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap; page-break-inside: avoid; }
.print-sig-block { flex: 1; min-width: 160px; }
.print-sig-line { border-top: 1.5px solid #0a0f1e; padding-top: 5px; font-size: 8px; font-weight: 700; color: #374151; text-transform: uppercase; }
.print-stamp {
  border: 2px dashed #d1d5db; border-radius: 8px; height: 72px; min-width: 72px;
  display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 8px; text-transform: uppercase;
}
.print-footer {
  margin-top: 14px; padding-top: 8px; border-top: 2px solid #0a0f1e;
  display: flex; justify-content: space-between; font-size: 7.5px; color: #6b7280; flex-wrap: wrap; gap: 8px;
}
.print-empty { text-align: center; padding: 32px; color: #9ca3af; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 5px; }
.att-mark-P { color: #1a7a3c; font-weight: 800; }
.att-mark-A { color: #c0392b; font-weight: 800; }
.att-mark-L { color: #a9740a; font-weight: 800; }
.att-mark-— { color: #cbd5e1; }
`

function usePrintPayload(endpoint: string, enabled = true) {
  const [params] = useSearchParams()
  const qs = params.toString()
  const url = qs ? `${endpoint}?${qs}` : endpoint
  return useQuery({
    queryKey: ['print', url],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1${url}`)
      return data.data as Record<string, unknown>
    },
    enabled,
  })
}

function PrintShell({
  title,
  landscape,
  loading,
  error,
  onRetry,
  children,
}: {
  title: string
  landscape?: boolean
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  children: ReactNode
}) {
  return (
    <div className="print-body">
      <style>{PRINT_CSS}</style>
      <div className="print-toolbar">
        <span>{title}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="print-btn" onClick={() => window.print()}>
            Print / Save PDF
          </button>
          <button type="button" className="print-btn-secondary" onClick={() => window.history.back()}>
            ← Back
          </button>
        </div>
      </div>
      {loading ? (
        <div className="print-page" style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
          Loading report…
        </div>
      ) : error ? (
        <div className="print-page" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: '#991b1b', fontWeight: 700 }}>{error}</p>
          {onRetry ? (
            <button type="button" className="print-btn" style={{ marginTop: 12 }} onClick={onRetry}>
              Retry
            </button>
          ) : null}
        </div>
      ) : (
        <div className={`print-page${landscape ? ' landscape print-landscape' : ''}`}>{children}</div>
      )}
    </div>
  )
}

function InstituteHeader({
  subtitle,
  deptName,
  rightMeta,
}: {
  subtitle?: string
  deptName?: string
  rightMeta?: ReactNode
}) {
  return (
    <div className="print-letterhead">
      <img src="/ttti-logo.jpg" alt="TTTI" />
      <div className="print-letterhead-center">
        <h1>Thika Technical Training Institute</h1>
        {subtitle ? <p>{subtitle}</p> : null}
        {deptName ? <p style={{ fontWeight: 600 }}>{deptName}</p> : null}
      </div>
      {rightMeta ?? <img src="/ttti-logo.jpg" alt="" style={{ opacity: 0.85 }} />}
    </div>
  )
}

function GradeBadge({ grade }: { grade: string }) {
  const g = String(grade || '—').replace(/[^A-Za-z0-9]/g, '')
  const cls = ['M', 'P', 'C', 'NYC'].includes(g) ? `grade-${g}` : ''
  return <span className={cls || undefined}>{grade || '—'}</span>
}

function competenceBadge(code: string | null | undefined) {
  if (!code) return <span style={{ color: '#94a3b8', fontWeight: 700 }}>—</span>
  const map: Record<string, string> = {
    mastery: 'M',
    proficient: 'P',
    competent: 'C',
    not_yet_competent: 'NYC',
    crnm: 'CRNM',
  }
  const label = map[code] ?? code.toUpperCase()
  return <GradeBadge grade={label} />
}

/* ── Marks report (dept_admin / super_admin) ──────────────────────────────── */

export function AdminMarksPrintPage() {
  const q = usePrintPayload('/print/marks')
  const d = q.data
  const marks = ((d?.marks as Row[]) || []) as Row[]

  return (
    <PrintShell
      title={`Marks Report — ${String(d?.dept_name ?? '')}`}
      landscape
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
      onRetry={() => void q.refetch()}
    >
      <InstituteHeader deptName={String(d?.dept_name ?? '')} rightMeta={
        <div style={{ textAlign: 'right', fontSize: 8, color: '#6b7280', lineHeight: 1.7 }}>
          <strong>{String(d?.dept_name ?? '').toUpperCase()}</strong><br />DEPARTMENT<br />
          Academic Year: {String(d?.year ?? '')}
        </div>
      } />
      <div className="print-band">
        <h2>Formative Assessment — Marks Report</h2>
        <p>
          {d?.term ? `Term ${d.term} · ` : ''}
          {d?.class_name ? `${d.class_name} · ` : ''}
          {d?.unit_name ? `${d.unit_name} · ` : ''}
          Academic Year {String(d?.year ?? '')}
        </p>
      </div>
      <div className="print-meta-grid">
        <MetaBox label="Department" value={String(d?.dept_name ?? '—')} />
        <MetaBox label="Academic Year" value={String(d?.year ?? '')} />
        <MetaBox label="Term" value={d?.term ? `Term ${d.term}` : 'All Terms'} />
        <MetaBox label="Total Records" value={String(d?.total ?? 0)} />
        <MetaBox label="Head of Department" value={String(d?.hod_name ?? '')} />
        <MetaBox label="Date Generated" value={String(d?.generated_at ?? '')} />
        <MetaBox label="Pass Rate" value={`${d?.pass_rate ?? 0}%`} />
        <MetaBox label="Average Score" value={`${d?.avg_pct ?? 0}%`} />
      </div>
      <div className="print-stats">
        <StatBox num={String(d?.total ?? 0)} lbl="Mark Entries" bg="#dbeafe" />
        <StatBox num={String(d?.pass_count ?? 0)} lbl="Competent & Above" bg="#dcfce7" />
        <StatBox num={`${d?.pass_rate ?? 0}%`} lbl="Pass Rate" bg="#fef3c7" />
        <StatBox num={`${d?.avg_pct ?? 0}%`} lbl="Average Score" bg="#ede9fe" />
      </div>
      {marks.length ? (
        <table className="print-table">
          <thead>
            <tr>
              <th>#</th><th>Adm. No.</th><th>Student</th><th>Class</th><th>Unit</th>
              <th>Assessment</th><th>Type</th><th>Term</th><th>Score</th><th>Grade</th><th>Trainer</th>
            </tr>
          </thead>
          <tbody>
            {marks.map((m, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td style={{ fontFamily: 'monospace' }}>{String((m.student as Row)?.admission_no ?? '—')}</td>
                <td style={{ fontWeight: 700 }}>{String((m.student as Row)?.full_name ?? '—')}</td>
                <td>{String((m.class_ as Row)?.name ?? '—')}</td>
                <td>{String((m.unit as Row)?.code ?? '—')}</td>
                <td>{String(m.assessment_name ?? '—')}</td>
                <td>{String(m.assessment_type ?? '—')}</td>
                <td>{String(m.term ?? '—')}</td>
                <td>
                  {m.marks_obtained != null ? `${m.marks_obtained}/${m.max_marks}` : '—'}
                  {m.percentage != null ? ` (${m.percentage}%)` : ''}
                </td>
                <td><GradeBadge grade={String(m.grade ?? '—')} /></td>
                <td>{String((m.trainer as Row)?.full_name ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="print-empty"><strong>No marks records found</strong> for the selected filters.</div>
      )}
      <SigFooter refCode={`TTTI/${String(d?.dept_name ?? '').slice(0, 4).toUpperCase()}/MR/${d?.year}`} generated={String(d?.generated_at ?? '')} />
    </PrintShell>
  )
}

/* ── Examination officer marks ─────────────────────────────────────────────── */

export function ExamOfficerMarksPrintPage() {
  const q = usePrintPayload('/print/examination-officer/marks')
  const marks = ((q.data?.marks as Row[]) || []) as Row[]

  return (
    <PrintShell
      title="Examination Officer — Marks Report"
      landscape
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
      onRetry={() => void q.refetch()}
    >
      <InstituteHeader subtitle="Examination Office — Marks Report" />
      <div className="print-band"><h2>Summative / External Marks</h2></div>
      {marks.length ? (
        <table className="print-table">
          <thead>
            <tr>
              <th>#</th><th>Adm. No.</th><th>Student</th><th>Class</th><th>Unit</th><th>Score</th><th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {marks.map((m, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{String((m.user_profiles as Row)?.admission_no ?? '—')}</td>
                <td>{String((m.user_profiles as Row)?.full_name ?? '—')}</td>
                <td>{String((m.classes as Row)?.name ?? '—')}</td>
                <td>{String((m.units as Row)?.code ?? '—')}</td>
                <td>{String(m.score ?? m.marks_obtained ?? '—')}</td>
                <td><GradeBadge grade={String(m.grade ?? '—')} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="print-empty">No marks found.</div>
      )}
      <SigFooter generated={String(q.data?.generated_at ?? '')} />
    </PrintShell>
  )
}

/* ── Trainer formative marks sheet ─────────────────────────────────────────── */

export function TrainerMarksPrintPage() {
  const q = usePrintPayload('/print/trainer/marks')
  const d = q.data
  const assessments = ((d?.assessments as Row[]) || []) as Row[]
  const rows = ((d?.rows as Row[]) || []) as Row[]

  return (
    <PrintShell
      title="Trainer Marks Sheet"
      landscape
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
      onRetry={() => void q.refetch()}
    >
      <InstituteHeader
        deptName={String(d?.dept_name ?? '')}
        subtitle={`Class: ${String((d?.cls as Row)?.name ?? '—')} · Unit: ${String((d?.unit as Row)?.code ?? '')} — ${String((d?.unit as Row)?.name ?? '')}`}
      />
      <div className="print-band">
        <h2>Official Formative Assessment Marks Sheet</h2>
        <p>Year {String(d?.year ?? '')} · Term {String(d?.term ?? '')} · Trainer: {String(d?.trainer_name ?? '')}</p>
      </div>
      {rows.length ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="print-table" style={{ fontSize: 9 }}>
            <thead>
              <tr>
                <th>#</th><th>Adm. No.</th><th>Trainee</th>
                {assessments.map((a) => (
                  <th key={String(a.id)} title={String(a.assessment_name)}>
                    {String(a.assessment_name).slice(0, 12)}/{String(a.max_marks ?? 100)}
                  </th>
                ))}
                <th>Total</th><th>Avg %</th><th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r.num)}>
                  <td>{String(r.num)}</td>
                  <td>{String(r.admission_no)}</td>
                  <td style={{ fontWeight: 700 }}>{String(r.full_name)}</td>
                  {((r.cells as Row[]) || []).map((c, i) => (
                    <td key={i}>{c.marks != null ? String(c.marks) : '—'}</td>
                  ))}
                  <td>{String(r.total)}</td>
                  <td>{r.avg_pct != null ? `${r.avg_pct}%` : '—'}</td>
                  <td><GradeBadge grade={String(r.grade)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="print-empty">No marks entered for this class/unit.</div>
      )}
      <SigFooter generated={String(d?.generated ?? '')} />
    </PrintShell>
  )
}

/* ── Unit attendance register (landscape matrix) ──────────────────────────── */

export function UnitAttendancePrintPage() {
  const q = usePrintPayload('/print/unit-attendance')
  const d = q.data
  const sessionCols = ((d?.session_cols as Row[]) || []) as Row[]
  const studentRows = ((d?.student_rows as Row[]) || []) as Row[]

  return (
    <PrintShell
      title="Unit Attendance Register"
      landscape
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
      onRetry={() => void q.refetch()}
    >
      <InstituteHeader
        deptName={`Department of ${String((d?.dept as Row)?.name ?? '—')}`}
        subtitle="Unit Attendance Register — All Weeks"
      />
      <div className="print-meta-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <MetaBox label="Class" value={String((d?.cls as Row)?.name ?? '—')} />
        <MetaBox label="Unit" value={`${String((d?.unit as Row)?.code ?? '')} — ${String((d?.unit as Row)?.name ?? '')}`} />
        <MetaBox label="Trainer" value={String((d?.trainer as Row)?.name ?? '—')} />
        <MetaBox label="Year" value={String(d?.year ?? '')} />
        <MetaBox label="Term" value={`Term ${String(d?.term ?? '')}`} />
        <MetaBox label="Coverage" value={`${d?.session_count ?? 0} session(s) · ${d?.student_count ?? 0} trainee(s)`} />
      </div>
      <p style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>
        <strong>Key:</strong> P Present · L Late · A Absent · — Not marked
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="print-table" style={{ fontSize: 8 }}>
          <thead>
            <tr>
              <th>#</th><th>Adm</th><th>Name</th>
              {sessionCols.map((s) => (
                <th key={String(s.label)} title={String(s.taken_full ?? '')}>
                  <div>{String(s.label)}</div>
                  {s.date_label ? <div style={{ fontSize: 7, fontWeight: 600 }}>{String(s.date_label)}</div> : null}
                  {s.time_label ? <div style={{ fontSize: 7, color: '#1e4fa3' }}>{String(s.time_label)}</div> : null}
                </th>
              ))}
              <th>P</th><th>A</th><th>%</th>
            </tr>
          </thead>
          <tbody>
            {studentRows.map((row, i) => (
              <tr key={String(row.id ?? i)}>
                <td>{i + 1}</td>
                <td>{String(row.admission_no)}</td>
                <td style={{ fontWeight: 600 }}>{String(row.full_name)}</td>
                {((row.cells as Row[]) || []).map((c, j) => (
                  <td key={j} className={`att-mark-${String(c.mark)}`}>{String(c.mark)}</td>
                ))}
                <td className="att-mark-P">{String(row.present ?? '')}</td>
                <td className="att-mark-A">{String(row.absent ?? '')}</td>
                <td>{row.marked ? `${String(row.rate)}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="print-sig">
        <div className="print-sig-block">
          <div className="print-sig-line">Trainer: {String((d?.trainer as Row)?.name ?? '')}</div>
        </div>
        <div className="print-sig-block"><div className="print-sig-line">Head of Department</div></div>
        <div className="print-stamp">Official<br />Stamp</div>
      </div>
      <SigFooter refCode={String(d?.ref_code ?? '')} generated={String(d?.generated ?? '')} />
    </PrintShell>
  )
}

/* ── Single session attendance ─────────────────────────────────────────────── */

export function SessionPrintPage() {
  const q = usePrintPayload('/print/session')
  const d = q.data
  const records = ((d?.records as Row[]) || []) as Row[]
  const event = d?.active_event as Row | null

  return (
    <PrintShell
      title="Session Attendance Register"
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
      onRetry={() => void q.refetch()}
    >
      <InstituteHeader
        deptName={`Department of ${String((d?.department as Row)?.name ?? '—')}`}
        subtitle="Unit Attendance Register"
      />
      <div className="print-meta-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <MetaBox label="Class" value={String((d?.class as Row)?.name ?? '—')} />
        <MetaBox label="Unit" value={`${String((d?.unit as Row)?.code ?? '')} — ${String((d?.unit as Row)?.name ?? '')}`} />
        <MetaBox label="Week / Lesson" value={`Week ${d?.week} · ${String(d?.lesson)}`} />
        <MetaBox label="Year / Term" value={`${d?.year} · Term ${d?.term}`} />
        <MetaBox label="Trainer" value={String(d?.trainer_name ?? '')} />
        <MetaBox label="Generated" value={String(d?.generated ?? '')} />
      </div>
      {event ? (
        <div style={{ padding: 10, marginBottom: 10, background: '#fff8e1', borderLeft: '4px solid #f9a825', fontSize: 11 }}>
          <strong>{String(event.event_type ?? 'Event')}</strong>
          {event.description ? <p style={{ margin: '4px 0 0', fontWeight: 400 }}>{String(event.description)}</p> : null}
        </div>
      ) : null}
      <table className="print-table">
        <thead>
          <tr><th>#</th><th>Adm. No.</th><th>Trainee Name</th><th>Status</th></tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={String(r.id ?? i)}>
              <td>{i + 1}</td>
              <td>{String((r.user_profiles as Row)?.admission_no ?? '—')}</td>
              <td>{String((r.user_profiles as Row)?.full_name ?? '—')}</td>
              <td className={String(r.status) === 'present' ? 'att-mark-P' : 'att-mark-A'}>
                {String(r.status ?? '—').toUpperCase()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <SigFooter generated={String(d?.generated ?? '')} />
    </PrintShell>
  )
}

/* ── Graduation list ───────────────────────────────────────────────────────── */

export function GraduationListPrintPage() {
  const q = usePrintPayload('/print/graduation-list')
  const d = q.data
  const units = ((d?.units as Row[]) || []) as Row[]
  const rows = ((d?.rows as Row[]) || []) as Row[]
  const meta = (d?.meta as Row) ?? {}
  const stats = (d?.stats as Row) ?? {}

  return (
    <PrintShell
      title="Official Graduation List"
      landscape
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
      onRetry={() => void q.refetch()}
    >
      <InstituteHeader subtitle="Official Graduation List — Summative Competence" />
      <div style={{ textAlign: 'center', margin: '10px 0' }}>
        <p style={{ margin: 0, fontWeight: 800, textTransform: 'uppercase' }}>Department: {String(meta.dept_name ?? '—')}</p>
        <p style={{ margin: '4px 0', fontSize: 11 }}>
          Course: {String(meta.course_name ?? '—')} ({String(meta.course_code ?? '')}) · Class: {String(meta.class_name ?? '—')} · {String(d?.period_label ?? '')}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 10, color: '#64748b' }}>
          Eligible: {String(stats.eligible ?? '')} ({String(stats.pct_eligible ?? '')}%) · Not Eligible:{' '}
          {String(stats.not_eligible ?? '')} · Total: {String(stats.total ?? '')} · Generated:{' '}
          {String(d?.generated ?? '')}
        </p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="print-table">
          <thead>
            <tr>
              <th>#</th><th>Adm.</th><th>Name</th>
              {units.map((u) => (
                <th key={String(u.id)} title={String(u.name)}>
                  <div>{String(u.code)}</div>
                  <div style={{ fontWeight: 600, fontSize: 8 }}>{String(u.name)}</div>
                </th>
              ))}
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{String(r.admission_no)}</td>
                <td style={{ fontWeight: 700 }}>{String(r.full_name)}</td>
                {units.map((u) => (
                  <td key={String(u.id)}>
                    {competenceBadge((r.unit_results as Record<string, string>)?.[String(u.id)])}
                  </td>
                ))}
                <td>
                  <span style={{
                    padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 800,
                    background: r.eligible ? '#e9f7ee' : '#fdeceb',
                    color: r.eligible ? '#166534' : '#991b1b',
                  }}>
                    {r.eligible ? 'Eligible' : 'Not Eligible'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 9.5, color: '#64748b', marginTop: 10 }}>
        M Mastery · P Proficient · C Competent · NYC Not Yet Competent · CRNM Course Requirement Not Met
      </p>
      <SigFooter generated={String(d?.generated ?? '')} />
    </PrintShell>
  )
}

/* ── Class list ────────────────────────────────────────────────────────────── */

export function ClassListPrintPage() {
  const q = usePrintPayload('/print/class-list')
  const d = q.data
  const students = ((d?.students as Row[]) || []) as Row[]

  return (
    <PrintShell
      title="Class List"
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
      onRetry={() => void q.refetch()}
    >
      <InstituteHeader deptName={String(d?.dept_name ?? '')} subtitle="Official Class List" />
      <div className="print-band">
        <h2>{String((d?.cls as Row)?.name ?? 'Class List')}</h2>
        <p>{String(((d?.cls as Row)?.courses as Row)?.name ?? '')} · {students.length} trainee(s)</p>
      </div>
      <table className="print-table">
        <thead>
          <tr><th>#</th><th>Admission No.</th><th>Full Name</th><th>Email</th><th>Phone</th></tr>
        </thead>
        <tbody>
          {students.map((s, i) => (
            <tr key={String(s.id ?? i)}>
              <td>{i + 1}</td>
              <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{String(s.admission_no ?? s.admission_number ?? '—')}</td>
              <td style={{ fontWeight: 700 }}>{String(s.full_name ?? '—')}</td>
              <td>{String(s.email ?? '—')}</td>
              <td>{String(s.mobile_number ?? '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <SigFooter generated={String(d?.date_gen ?? '')} />
    </PrintShell>
  )
}

/* ── Assessment sheet ──────────────────────────────────────────────────────── */

export function AssessmentSheetPrintPage() {
  const q = usePrintPayload('/print/assessment-sheet')
  const d = q.data
  const eligible = ((d?.eligible as Row[]) || []) as Row[]

  return (
    <PrintShell
      title="Assessment Sheet"
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
      onRetry={() => void q.refetch()}
    >
      <InstituteHeader deptName={String(d?.dept_name ?? '')} subtitle="Eligible Trainees — Assessment Sheet" />
      <div className="print-band">
        <h2>{String((d?.cls as Row)?.name ?? '')} — {String((d?.unit as Row)?.code ?? '')}</h2>
        <p>{String(d?.term_label ?? '')} {String(d?.year ?? '')} · Min attendance {String(d?.min_pct ?? 80)}%</p>
      </div>
      <table className="print-table">
        <thead>
          <tr><th>#</th><th>Admission</th><th>Name</th><th>Present</th><th>Total</th><th>%</th></tr>
        </thead>
        <tbody>
          {eligible.map((e, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{String(e.admission_number)}</td>
              <td>{String(e.full_name)}</td>
              <td>{String(e.present)}</td>
              <td>{String(e.total)}</td>
              <td>{String(e.pct)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      {eligible.length === 0 ? <div className="print-empty">No eligible trainees for the selected filters.</div> : null}
      <SigFooter generated={String(d?.date_gen ?? '')} />
    </PrintShell>
  )
}

/* ── Trainee attendance report (admin) ─────────────────────────────────────── */

export function TraineeReportPrintPage() {
  const q = usePrintPayload('/print/trainee-report')
  const d = q.data
  const records = ((d?.records as Row[]) || []) as Row[]
  const summary = (d?.summary as Row) ?? {}
  const student = (d?.student as Row) ?? {}

  return (
    <PrintShell
      title="Trainee Attendance Report"
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
      onRetry={() => void q.refetch()}
    >
      <InstituteHeader deptName={String(d?.dept_name ?? '')} subtitle="Trainee Unit Attendance Report" />
      <div className="print-meta-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <MetaBox label="Trainee" value={String(student.full_name ?? '—')} />
        <MetaBox label="Admission" value={String(student.admission_no ?? student.admission_number ?? '—')} />
        <MetaBox label="Unit" value={`${summary.unit_code} — ${summary.unit_name}`} />
        <MetaBox label="Attendance Rate" value={`${summary.pct ?? 0}%`} />
      </div>
      <table className="print-table">
        <thead>
          <tr><th>#</th><th>Date</th><th>Week</th><th>Lesson</th><th>Status</th><th>Trainer</th></tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={String(r.id ?? i)}>
              <td>{i + 1}</td>
              <td>{String(r.attendance_date ?? '—').slice(0, 16)}</td>
              <td>{String(r.week ?? '—')}</td>
              <td>{String(r.lesson ?? '—')}</td>
              <td className={String(r.status) === 'present' ? 'att-mark-P' : 'att-mark-A'}>{String(r.status ?? '—')}</td>
              <td>{String((r.trainers as Row)?.full_name ?? '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <SigFooter generated={String(d?.generated ?? '')} />
    </PrintShell>
  )
}

/* ── Student unit report ───────────────────────────────────────────────────── */

export function StudentUnitReportPrintPage() {
  const q = usePrintPayload('/print/student-unit-report')
  const d = q.data
  const records = ((d?.records as Row[]) || []) as Row[]
  const info = (d?.info as Row) ?? {}

  return (
    <PrintShell
      title="Unit Attendance Report"
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
      onRetry={() => void q.refetch()}
    >
      <InstituteHeader
        deptName={String(info.dept_name ?? '')}
        subtitle={`Unit: ${String((d?.unit as Row)?.code ?? '')} — ${String((d?.unit as Row)?.name ?? '')}`}
      />
      <div className="print-meta-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <MetaBox label="Student" value={String((d?.student as Row)?.full_name ?? '—')} />
        <MetaBox label="Admission" value={String((d?.student as Row)?.admission_no ?? '—')} />
        <MetaBox label="Class" value={String(info.class_name ?? '—')} />
        <MetaBox label="Attendance" value={`${d?.attended ?? 0}/${d?.total ?? 0} (${d?.pct ?? 0}%)`} />
      </div>
      <table className="print-table">
        <thead>
          <tr><th>#</th><th>Date</th><th>Week</th><th>Lesson</th><th>Status</th></tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={String(r.id ?? i)}>
              <td>{i + 1}</td>
              <td>{String(r.attendance_date ?? '—').slice(0, 16)}</td>
              <td>{String(r.week ?? '—')}</td>
              <td>{String(r.lesson ?? '—')}</td>
              <td className={['present', 'late'].includes(String(r.status)) ? 'att-mark-P' : 'att-mark-A'}>
                {String(r.status ?? '—')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <SigFooter refCode={String(d?.ref_code ?? '')} generated={String(d?.date_gen ?? '')} />
    </PrintShell>
  )
}

/* ── Trainee approved exam bookings ────────────────────────────────────────── */

export function TraineeApprovedBookingsPrintPage() {
  const q = usePrintPayload('/print/trainee-approved-bookings')
  const d = q.data
  const bookings = ((d?.bookings as Row[]) || []) as Row[]
  const student = (d?.student as Row) ?? {}

  return (
    <PrintShell
      title="Approved Exam Bookings"
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
      onRetry={() => void q.refetch()}
    >
      <InstituteHeader deptName={String(d?.dept_name ?? '')} subtitle="Approved Exam Bookings" />
      <div className="print-meta-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <MetaBox label="Trainee" value={String(student.full_name ?? '—')} />
        <MetaBox label="Admission" value={String(student.admission_no ?? '—')} />
        <MetaBox label="Class" value={String(d?.class_name ?? '—')} />
      </div>
      <table className="print-table">
        <thead>
          <tr><th>#</th><th>Unit</th><th>Exam Date</th><th>Serial</th><th>Status</th></tr>
        </thead>
        <tbody>
          {bookings.map((b, i) => (
            <tr key={String(b.id ?? i)}>
              <td>{i + 1}</td>
              <td>{String((b.units as Row)?.code ?? '—')} — {String((b.units as Row)?.name ?? '')}</td>
              <td>{String(b.exam_date ?? '—').slice(0, 10)}</td>
              <td>{String(b.serial_number ?? '—')}</td>
              <td>{String(b.status ?? 'approved')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <SigFooter generated={String(d?.date_gen ?? '')} />
    </PrintShell>
  )
}

/* ── Clearance form (printable blank with student info) ────────────────────── */

const ACADEMIC_DEPTS = [
  'AGRIC & ENVIRONMENTAL STUDIES',
  'APPLIED SCIENCES',
  'BUILDING AND CIVIL ENG.',
  'BUSINESS STUDIES',
  'ELECTRICAL & ELECTRONICS ENG.',
  'HEALTH SCIENCES',
  'ICT',
  'LIBERAL STUDIES',
  'MOTOR VEHICLE',
  'HOSPITALITY',
]
const OTHER_SECTIONS = ['INSTITUTE LIBRARY', 'KENYA NATIONAL LIBRARY', 'STORE', 'GAMES', 'DEAN OF STUDENTS']

export function ClearanceFormPrintPage() {
  const q = usePrintPayload('/print/clearance-form')
  const student = (q.data?.student as Row) ?? {}
  const cr = (q.data?.clearance_request as Row) ?? {}

  return (
    <PrintShell
      title="Student Clearance Form"
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
      onRetry={() => void q.refetch()}
    >
      <div className="print-letterhead" style={{ borderBottomColor: '#006600' }}>
        <img src="/ttti-logo.jpg" alt="" />
        <div className="print-letterhead-center">
          <h1 style={{ color: '#006600' }}>Thika Technical Training Institute</h1>
          <p style={{ fontWeight: 700, textTransform: 'uppercase' }}>Student Clearance Form</p>
          <p>TTTI/ADM/CLEAR/F1</p>
        </div>
        <img src="/ttti-logo.jpg" alt="" />
      </div>
      <div style={{ border: '1px solid #000', padding: '6px 10px', marginBottom: 8, fontSize: 11, display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
        <span><strong>Name:</strong> {String(student.full_name ?? '_______________')}</span>
        <span><strong>Adm No:</strong> {String(student.admission_no ?? '_______________')}</span>
        <span><strong>ID No:</strong> {String(student.national_id ?? '_______________')}</span>
        <span><strong>Phone:</strong> {String(student.mobile_number ?? '_______________')}</span>
        <span><strong>Email:</strong> {String(student.email ?? '_______________')}</span>
      </div>
      <div style={{ border: '1px solid #000', padding: '6px 10px', marginBottom: 10, fontSize: 11, display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
        <span><strong>Department:</strong> {String((cr.departments as Row)?.name ?? '___________________________')}</span>
        <span><strong>Course:</strong> {String((cr.courses as Row)?.name ?? '___________________________')}</span>
      </div>
      <SectionHeading>Subject / Trainer Clearance</SectionHeading>
      <ClearanceTable rows={14} cols={['S/No', 'Subject / Trainer', 'Lost Item(s)', 'Cost', 'Sign']} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <SectionHeading>Academic Departments</SectionHeading>
          <ClearanceTable
            rows={ACADEMIC_DEPTS.length}
            cols={['S/No', 'Department', 'Lost Items', 'Cost', 'HOD Sign']}
            fillFirstCol={ACADEMIC_DEPTS}
          />
        </div>
        <div style={{ flex: '0 0 260px' }}>
          <SectionHeading>Other Sections</SectionHeading>
          <ClearanceTable
            rows={OTHER_SECTIONS.length}
            cols={['S/No', 'Department', 'Lost Items', 'Cost', 'HOD Sign']}
            fillFirstCol={OTHER_SECTIONS}
          />
        </div>
      </div>
      <SectionHeading>Finance Office Clearance</SectionHeading>
      <div style={{ border: '1px solid #000', padding: 10, fontSize: 11 }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <FinanceField label="Amount Paid" />
          <FinanceField label="Receipt No." />
          <FinanceField label="Finance Officer Sign" />
          <FinanceField label="Date" />
        </div>
      </div>
      <p style={{ marginTop: 16, fontSize: 10, color: '#64748b' }}>
        Print this form, obtain required signatures, and submit to the Registrar.{' '}
        <Link to={`/clearance/certificate/${String(cr.id ?? '')}`}>View digital certificate →</Link>
      </p>
    </PrintShell>
  )
}

/* ── Small helpers ─────────────────────────────────────────────────────────── */

function MetaBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="print-meta-box">
      <div className="print-meta-lbl">{label}</div>
      <div className="print-meta-val">{value}</div>
    </div>
  )
}

function StatBox({ num, lbl, bg }: { num: string; lbl: string; bg: string }) {
  return (
    <div className="print-stat" style={{ background: bg }}>
      <div className="print-stat-num">{num}</div>
      <div className="print-stat-lbl">{lbl}</div>
    </div>
  )
}

function SigFooter({ refCode, generated }: { refCode?: string; generated?: string }) {
  return (
    <div className="print-footer">
      {refCode ? <span>Ref: {refCode}</span> : <span />}
      <span style={{ textAlign: 'center', flex: 1 }}>
        <strong>THIKA TECHNICAL TRAINING INSTITUTE</strong> · Official Academic Record
      </span>
      {generated ? <span>Generated: {generated}</span> : null}
    </div>
  )
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', background: '#d0d0d0',
      border: '1px solid #000', padding: '4px 8px', textAlign: 'center', marginBottom: 0,
    }}>
      {children}
    </div>
  )
}

function ClearanceTable({
  rows,
  cols,
  fillFirstCol,
}: {
  rows: number
  cols: string[]
  fillFirstCol?: string[]
}) {
  return (
    <table className="print-table" style={{ marginBottom: 10, fontSize: 11 }}>
      <thead>
        <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, i) => (
          <tr key={i}>
            <td style={{ textAlign: 'center', width: 32 }}>{i + 1}</td>
            <td>{fillFirstCol?.[i] ?? '\u00a0'}</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function FinanceField({ label }: { label: string }) {
  return (
    <div style={{ flex: 1, minWidth: 160 }}>
      <label style={{ fontWeight: 700, display: 'block', marginBottom: 2 }}>{label}</label>
      <div style={{ borderBottom: '1px solid #555', minHeight: 18 }}>&nbsp;</div>
    </div>
  )
}

/** Build a print URL preserving current search params */
export function printUrl(base: string, params: URLSearchParams) {
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

export function PrintPdfLink({
  to,
  params,
  label = 'Print / PDF',
  style,
}: {
  to: string
  params?: URLSearchParams
  label?: string
  style?: CSSProperties
}) {
  const href = params ? printUrl(to, params) : to
  return (
    <Link
      to={href}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 700,
        background: '#b91c1c',
        color: '#fff',
        textDecoration: 'none',
        ...style,
      }}
    >
      <i className="fas fa-print" /> {label}
    </Link>
  )
}
