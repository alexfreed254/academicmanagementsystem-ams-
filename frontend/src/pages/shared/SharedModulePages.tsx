import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, getApiErrorMessage } from '@/lib/apiClient'
import { deleteAction, postAction } from '@/api/mutations'
import { PortalShell } from '@/layouts/PortalShell'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/ui/States'
import { InteractiveTablePage, StatusPill, cell } from '@/pages/shared/InteractiveTablePage'
import { PrintPdfLink } from '@/pages/shared/PrintReportPages'
import type { Row } from '@/api/portals'

const summativeColumns = [
  {
    key: 'student',
    label: 'Trainee',
    render: (r: Row) => (
      <div>
        <div style={{ fontWeight: 700 }}>{cell(r, 'user_profiles.full_name')}</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{cell(r, 'user_profiles.admission_no', '')}</div>
      </div>
    ),
  },
  {
    key: 'unit',
    label: 'Unit',
    render: (r: Row) => (
      <div>
        <div style={{ fontWeight: 600 }}>{cell(r, 'units.name')}</div>
        <div style={{ fontSize: 11, color: '#1d4ed8' }}>{cell(r, 'units.code', '')}</div>
      </div>
    ),
  },
  { key: 'competence', label: 'Competence', render: (r: Row) => <StatusPill value={r.competence} /> },
  { key: 'result', label: 'Result' },
  { key: 'recorded_at', label: 'Recorded' },
]

export function ClearanceApproverPage() {
  return (
    <InteractiveTablePage
      title="Clearance Approvals"
      subtitle="Review and action clearance steps assigned to your role."
      endpoint="/clearance/approver"
      rowsKey="pending"
      columns={[
        { key: 'student', label: 'Student', render: (r) => cell(r, 'user_profiles.full_name') },
        { key: 'approver_category', label: 'Category' },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
        { key: 'created_at', label: 'Requested' },
      ]}
      actions={[
        {
          label: 'Approve',
          tone: 'primary',
          when: (r) => String(r.status || '') === 'pending',
          run: (row) => postAction(`/clearance/approvals/${row.id}/approve`),
        },
        {
          label: 'Reject',
          tone: 'danger',
          requireComment: true,
          when: (r) => String(r.status || '') === 'pending',
          run: (row, comment) => postAction(`/clearance/approvals/${row.id}/reject`, { comments: comment }),
        },
      ]}
    />
  )
}

export function ClearanceStudentPage() {
  return (
    <InteractiveTablePage
      title="Course Clearance"
      subtitle="Track your departmental clearance progress toward certificate issuance."
      endpoint="/clearance/student"
      rowsKey="requests"
      columns={[
        { key: 'courses.name', label: 'Course', render: (r) => cell(r, 'courses.name') },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
        { key: 'created_at', label: 'Started' },
      ]}
      extraHeader={
        <span style={{ fontSize: 12, color: '#64748b', maxWidth: 280 }}>
          Clearance requests appear here once started. Contact your department if a course is missing.
        </span>
      }
    />
  )
}

export function ServiceClearancePage() {
  return (
    <InteractiveTablePage
      title="Pending Clearances"
      subtitle="Service-department clearance queue for your office."
      endpoint="/clearance/service-dept"
      rowsKey="pending"
      columns={[
        { key: 'student', label: 'Student', render: (r) => cell(r, 'user_profiles.full_name') },
        { key: 'approver_category', label: 'Category' },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      ]}
      actions={[
        {
          label: 'Approve',
          tone: 'primary',
          when: (r) => String(r.status || '') === 'pending',
          run: (row) => postAction(`/clearance/approvals/${row.id}/approve`),
        },
        {
          label: 'Reject',
          tone: 'danger',
          requireComment: true,
          when: (r) => String(r.status || '') === 'pending',
          run: (row, comment) => postAction(`/clearance/approvals/${row.id}/reject`, { comments: comment }),
        },
      ]}
    />
  )
}

export function SummativeHubPage() {
  const links = [
    { to: '/summative/overview', title: 'Overview', sub: 'Competence records', icon: 'th-large', bg: '#eef2ff', color: '#4f46e5' },
    { to: '/summative/entry', title: 'Competence Entry', sub: 'In-portal workspace', icon: 'edit', bg: '#dbeafe', color: '#1d4ed8' },
    { to: '/summative/analysis', title: 'Unit Performance', sub: 'In-portal workspace', icon: 'chart-bar', bg: '#fef3c7', color: '#b45309' },
    { to: '/summative/reports', title: 'Reports & Downloads', sub: 'Worker + optional legacy PDFs', icon: 'download', bg: '#dcfce7', color: '#15803d' },
    { to: '/summative/graduation-list', title: 'Graduation List', sub: 'In-portal workspace', icon: 'user-graduate', bg: '#ede9fe', color: '#6d28d9' },
  ]
  return (
    <PortalShell title="Summative Assessment">
      <div style={{ padding: 24 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>Summative Assessment (TVET CDACC)</h1>
        <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 13 }}>
          Competence workflows open inside the Cloudflare SPA. PDF/Excel generation still requires an optional Flask
          legacy host (`VITE_LEGACY_ORIGIN`) until those exporters are ported to Workers.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
          {links.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: '#fff',
                border: '1.5px solid #e8eef6',
                borderRadius: 12,
                padding: '14px 16px',
                textDecoration: 'none',
                color: '#0f172a',
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: item.bg,
                  color: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className={`fas fa-${item.icon}`} />
              </span>
              <span>
                <strong style={{ display: 'block', fontSize: 13 }}>{item.title}</strong>
                <small style={{ color: '#64748b', fontSize: 11 }}>{item.sub}</small>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </PortalShell>
  )
}

export function SummativeOverviewPage() {
  return (
    <InteractiveTablePage
      title="Summative Overview"
      subtitle="Competence records across trainees and units."
      endpoint="/summative/overview"
      rowsKey="items"
      columns={summativeColumns}
      extraHeader={
        <Link to="/summative/" style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>
          ← Hub
        </Link>
      }
    />
  )
}

export function SummativeEntryPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ student_id: '', unit_id: '', competence: '', result: '' })
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const overview = useQuery({
    queryKey: ['portal-table', '/summative/overview'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/summative/overview')
      return data.data as Record<string, unknown>
    },
  })

  const save = useMutation({
    mutationFn: async () => {
      await postAction('/summative/entry', {
        student_id: form.student_id.trim(),
        unit_id: form.unit_id.trim(),
        competence: form.competence,
        result: form.result.trim() || undefined,
      })
    },
    onSuccess: () => {
      setMsg('Competence saved.')
      setErr(null)
      setForm({ student_id: '', unit_id: '', competence: '', result: '' })
      void qc.invalidateQueries({ queryKey: ['portal-table', '/summative/overview'] })
    },
    onError: (e) => {
      setErr(getApiErrorMessage(e))
      setMsg(null)
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.student_id.trim() || !form.unit_id.trim() || !form.competence) {
      setErr('Student ID, unit ID and competence are required.')
      return
    }
    save.mutate()
  }

  const rows = ((overview.data?.items as Row[]) || []) as Row[]
  const inputStyle: CSSProperties = {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    fontWeight: 500,
    color: '#0f172a',
  }

  return (
    <PortalShell title="Competence Entry">
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>Competence Entry</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Record summative competence outcomes for trainees.</p>
          </div>
          <Link to="/summative/" style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', alignSelf: 'center' }}>
            ← Hub
          </Link>
        </div>

        {msg ? (
          <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#dcfce7', color: '#166534', fontSize: 13 }}>
            {msg}
          </div>
        ) : null}
        {err ? (
          <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#fee2e2', color: '#991b1b', fontSize: 13 }}>
            {err}
          </div>
        ) : null}

        <form
          onSubmit={onSubmit}
          style={{
            marginBottom: 16,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
            gap: 12,
          }}
        >
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>
            Student ID
            <input
              value={form.student_id}
              required
              onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}
              style={inputStyle}
              placeholder="User profile UUID"
            />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>
            Unit ID
            <input
              value={form.unit_id}
              required
              onChange={(e) => setForm((f) => ({ ...f, unit_id: e.target.value }))}
              style={inputStyle}
              placeholder="Unit UUID"
            />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>
            Competence
            <select
              value={form.competence}
              required
              onChange={(e) => setForm((f) => ({ ...f, competence: e.target.value }))}
              style={inputStyle}
            >
              <option value="">Select…</option>
              <option value="competent">Competent</option>
              <option value="not_yet_competent">Not yet competent</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>
            Result / notes
            <input
              value={form.result}
              onChange={(e) => setForm((f) => ({ ...f, result: e.target.value }))}
              style={inputStyle}
            />
          </label>
          <div style={{ gridColumn: '1 / -1' }}>
            <button
              type="submit"
              disabled={save.isPending}
              style={{
                border: 'none',
                background: '#0f172a',
                color: '#fff',
                borderRadius: 8,
                padding: '10px 16px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {save.isPending ? 'Saving…' : 'Save competence'}
            </button>
          </div>
        </form>

        {overview.isLoading ? (
          <PageSkeleton />
        ) : overview.isError ? (
          <ErrorState message={getApiErrorMessage(overview.error)} onRetry={() => void overview.refetch()} />
        ) : (
          <div
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,.04)',
            }}
          >
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0' }}>
              <strong style={{ fontSize: 14 }}>
                {rows.length} record{rows.length === 1 ? '' : 's'}
              </strong>
            </div>
            {rows.length === 0 ? (
              <div style={{ padding: 40 }}>
                <EmptyState title="No records found" />
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {summativeColumns.map((col) => (
                        <th
                          key={col.key}
                          style={{
                            textAlign: 'left',
                            padding: '11px 14px',
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#64748b',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            borderBottom: '1px solid #e2e8f0',
                          }}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={cell(row, 'id', String(i))} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {summativeColumns.map((col) => (
                          <td key={col.key} style={{ padding: '12px 14px', fontSize: 13, color: '#334155' }}>
                            {col.render ? col.render(row) : cell(row, col.key)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </PortalShell>
  )
}

export function SummativeReportsPage() {
  return (
    <InteractiveTablePage
      title="Summative Reports"
      subtitle="Competence overview used for analysis and reporting."
      endpoint="/summative/overview"
      rowsKey="items"
      columns={summativeColumns}
      extraHeader={
        <Link to="/summative/" style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>
          ← Hub
        </Link>
      }
    />
  )
}

export function SummativeAnalysisPage() {
  const q = useQuery({
    queryKey: ['portal-table', '/summative/overview', 'analysis'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/summative/overview')
      return data.data as Record<string, unknown>
    },
  })

  if (q.isLoading) {
    return (
      <PortalShell title="Unit Performance">
        <PageSkeleton />
      </PortalShell>
    )
  }
  if (q.isError) {
    return (
      <PortalShell title="Unit Performance">
        <div className="p-6">
          <ErrorState message={getApiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
        </div>
      </PortalShell>
    )
  }

  const rows = ((q.data?.items as Row[]) || []) as Row[]
  const byUnit = new Map<
    string,
    { unit: string; code: string; total: number; competent: number; nyc: number }
  >()
  for (const r of rows) {
    const id = cell(r, 'unit_id', cell(r, 'units.name'))
    const existing = byUnit.get(id) || {
      unit: cell(r, 'units.name'),
      code: cell(r, 'units.code', ''),
      total: 0,
      competent: 0,
      nyc: 0,
    }
    existing.total += 1
    const comp = String(r.competence || '')
    if (comp === 'competent' || comp === 'mastery' || comp === 'proficient') existing.competent += 1
    if (comp === 'not_yet_competent' || comp === 'crnm') existing.nyc += 1
    byUnit.set(id, existing)
  }
  const units = [...byUnit.values()].sort((a, b) => a.unit.localeCompare(b.unit))

  return (
    <PortalShell title="Unit Performance">
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
              Unit Performance Analysis
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
              Pass rates and competence breakdown per unit.
            </p>
          </div>
          <Link to="/summative/" style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', alignSelf: 'center' }}>
            ← Hub
          </Link>
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,.04)',
          }}
        >
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0' }}>
            <strong style={{ fontSize: 14 }}>
              {units.length} unit{units.length === 1 ? '' : 's'}
            </strong>
          </div>
          {units.length === 0 ? (
            <div style={{ padding: 40 }}>
              <EmptyState title="No summative records to analyse" />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Unit', 'Code', 'Assessed', 'Competent+', 'NYC / CRNM', 'Pass rate'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '11px 14px',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => {
                    const rate = u.total ? Math.round((u.competent / u.total) * 100) : 0
                    return (
                      <tr key={`${u.code}-${u.unit}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>{u.unit}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#1d4ed8' }}>{u.code || '—'}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13 }}>{u.total}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#15803d' }}>{u.competent}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#c2410c' }}>{u.nyc}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700 }}>{rate}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  )
}

export function SummativeGraduationPage() {
  const [params] = useSearchParams()
  const q = useQuery({
    queryKey: ['portal-table', '/summative/overview', 'graduation'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/summative/overview')
      return data.data as Record<string, unknown>
    },
  })

  if (q.isLoading) {
    return (
      <PortalShell title="Graduation List">
        <PageSkeleton />
      </PortalShell>
    )
  }
  if (q.isError) {
    return (
      <PortalShell title="Graduation List">
        <div className="p-6">
          <ErrorState message={getApiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
        </div>
      </PortalShell>
    )
  }

  const rows = (((q.data?.items as Row[]) || []) as Row[]).filter((r) => {
    const c = String(r.competence || '')
    return c === 'competent' || c === 'mastery' || c === 'proficient'
  })

  return (
    <PortalShell title="Graduation List">
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>Graduation List</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
              Trainees marked competent (or higher) on summative assessment.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {params.get('class_id') ? (
              <PrintPdfLink to="/summative/graduation-list/print" params={params} label="Print graduation list" style={{ background: '#c2410c' }} />
            ) : null}
            <Link to="/summative/" style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>
              ← Hub
            </Link>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0' }}>
            <strong style={{ fontSize: 14 }}>
              {rows.length} competent record{rows.length === 1 ? '' : 's'}
            </strong>
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: 40 }}>
              <EmptyState title="No competent records found" />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {summativeColumns.map((col) => (
                      <th
                        key={col.key}
                        style={{
                          textAlign: 'left',
                          padding: '11px 14px',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={cell(row, 'id', String(i))} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {summativeColumns.map((col) => (
                        <td key={col.key} style={{ padding: '12px 14px', fontSize: 13, color: '#334155' }}>
                          {col.render ? col.render(row) : cell(row, col.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  )
}

export function AcademicTripsPage() {
  return (
    <InteractiveTablePage
      title="Academic Trip Reports"
      subtitle="Department trip reports uploaded by trainers and admins."
      endpoint="/academic-trips"
      rowsKey="trips"
      columns={[
        {
          key: 'title',
          label: 'Title',
          render: (r) => (
            <Link to={`/academic-trips/${r.id}`} style={{ fontWeight: 700, color: '#7b1fa2', textDecoration: 'none' }}>
              {cell(r, 'title')}
            </Link>
          ),
        },
        { key: 'destination', label: 'Destination' },
        { key: 'trip_date', label: 'Date' },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      ]}
      createLabel="Add trip"
      createFields={[
        { name: 'title', label: 'Title', required: true },
        { name: 'destination', label: 'Destination' },
        { name: 'trip_date', label: 'Trip date', type: 'date' },
        { name: 'summary', label: 'Summary', type: 'textarea' },
      ]}
      extraHeader={
        <Link
          to="/academic-trips/upload"
          style={{
            border: 'none',
            background: '#0f172a',
            color: '#fff',
            borderRadius: 8,
            padding: '8px 12px',
            fontWeight: 700,
            fontSize: 12,
            textDecoration: 'none',
          }}
        >
          Upload trip report
        </Link>
      }
      actions={[
        {
          label: 'Delete',
          tone: 'danger',
          run: (row) => deleteAction(`/academic-trips/${row.id}`),
        },
      ]}
    />
  )
}

export function AcademicTripsUploadPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '',
    destination: '',
    trip_date: '',
    summary: '',
  })
  const [msg, setMsg] = useState<string | null>(null)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: async () => {
      const res = await postAction('/academic-trips', {
        title: form.title.trim().toUpperCase(),
        destination: form.destination.trim().toUpperCase() || undefined,
        trip_date: form.trip_date || undefined,
        summary: form.summary.trim() || undefined,
      })
      return res as { data?: { item?: Row }; item?: Row }
    },
    onSuccess: (data) => {
      const id = data?.data?.item?.id ?? data?.item?.id
      setMsg('Trip report saved.')
      setErrMsg(null)
      if (id) navigate(`/academic-trips/${id}`, { replace: true })
      else navigate('/academic-trips', { replace: true })
    },
    onError: (e) => {
      setErrMsg(getApiErrorMessage(e))
      setMsg(null)
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      setErrMsg('Trip title is required.')
      return
    }
    save.mutate()
  }

  const inputStyle: CSSProperties = {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 14,
    fontWeight: 500,
    color: '#0f172a',
    width: '100%',
  }

  return (
    <PortalShell title="Upload Trip Report">
      <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
        <Link to="/academic-trips" style={{ fontSize: 13, fontWeight: 600, color: '#1565c0' }}>
          ← Back to Trips
        </Link>
        <h1 style={{ margin: '12px 0 8px', fontSize: 24, fontWeight: 800, color: '#1e293b' }}>
          Upload New Trip Report
        </h1>
        <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 14 }}>
          Fill in the trip details. Title and destination are stored in capital letters. Media attachments can be
          added from the trip detail page after saving.
        </p>

        {msg ? (
          <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#dcfce7', color: '#166534' }}>
            {msg}
          </div>
        ) : null}
        {errMsg ? (
          <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#fee2e2', color: '#991b1b' }}>
            {errMsg}
          </div>
        ) : null}

        <form
          onSubmit={onSubmit}
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 28,
            boxShadow: '0 2px 8px rgba(0,0,0,.06)',
            display: 'grid',
            gap: 16,
          }}
        >
          <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
            Trip title *
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              style={{ ...inputStyle, textTransform: 'uppercase' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
            Destination
            <input
              value={form.destination}
              onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
              style={{ ...inputStyle, textTransform: 'uppercase' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
            Trip date
            <input
              type="date"
              value={form.trip_date}
              onChange={(e) => setForm((f) => ({ ...f, trip_date: e.target.value }))}
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>
            Summary / report
            <textarea
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              rows={5}
              style={inputStyle}
            />
          </label>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Link
              to="/academic-trips"
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                background: '#f1f5f9',
                color: '#475569',
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={save.isPending}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: 8,
                background: '#0f2744',
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {save.isPending ? 'Saving…' : 'Save trip report'}
            </button>
          </div>
        </form>
      </div>
    </PortalShell>
  )
}

export function AcademicTripDetailPage() {
  const { id } = useParams()
  const q = useQuery({
    queryKey: ['academic-trip', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/academic-trips/${id}`)
      return data.data as { trip: Row; media?: Row[] }
    },
  })

  if (q.isLoading) {
    return (
      <PortalShell title="Trip Details">
        <PageSkeleton />
      </PortalShell>
    )
  }
  if (q.isError) {
    return (
      <PortalShell title="Trip Details">
        <div className="p-6">
          <ErrorState message={getApiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
        </div>
      </PortalShell>
    )
  }

  const trip = q.data?.trip
  const media = q.data?.media || []
  if (!trip) {
    return (
      <PortalShell title="Trip Details">
        <div className="p-6">
          <EmptyState title="Trip not found" />
        </div>
      </PortalShell>
    )
  }

  return (
    <PortalShell title="Trip Details">
      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        <Link to="/academic-trips" style={{ fontSize: 13, fontWeight: 600, color: '#7b1fa2' }}>
          ← Back to All Trips
        </Link>
        <div
          style={{
            marginTop: 16,
            background: 'linear-gradient(135deg,#7b1fa2,#9c27b0)',
            color: '#fff',
            padding: 32,
            borderRadius: 12,
            marginBottom: 24,
          }}
        >
          <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800 }}>{cell(trip, 'title')}</h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: 16 }}>
            <i className="fas fa-map-marker-alt" style={{ marginRight: 6 }} />
            {cell(trip, 'destination', '—')}
          </p>
          <span style={{ display: 'inline-block', marginTop: 12 }}>
            <StatusPill value={trip.status} />
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Trip Information</h3>
            <div style={{ display: 'grid', gap: 12, fontSize: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Date</div>
                <div style={{ fontWeight: 700 }}>{cell(trip, 'trip_date')}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Status</div>
                <div style={{ fontWeight: 700 }}>{cell(trip, 'status')}</div>
              </div>
            </div>
            {trip.summary ? (
              <div style={{ marginTop: 16, background: '#f8fafc', padding: 16, borderRadius: 8, borderLeft: '4px solid #7b1fa2', lineHeight: 1.8, color: '#475569', fontSize: 14 }}>
                {cell(trip, 'summary')}
              </div>
            ) : null}
          </div>

          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Media</h3>
              <Link to={`/academic-trips/${id}/media`} style={{ fontSize: 12, fontWeight: 700, color: '#7b1fa2' }}>
                Add media
              </Link>
            </div>
            {media.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                <i className="fas fa-images" style={{ fontSize: 40, marginBottom: 12, display: 'block' }} />
                No photos or videos yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12 }}>
                {media.map((m, i) => (
                  <a
                    key={cell(m, 'id', String(i))}
                    href={cell(m, 'file_url', cell(m, 'url', '#'))}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'block',
                      borderRadius: 10,
                      overflow: 'hidden',
                      aspectRatio: '16/9',
                      background: '#e2e8f0',
                      textDecoration: 'none',
                      color: '#0f172a',
                      fontSize: 11,
                      padding: 8,
                    }}
                  >
                    {cell(m, 'caption', cell(m, 'file_name', `Media ${i + 1}`))}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PortalShell>
  )
}

export function AcademicTripMediaPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [caption, setCaption] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileBase64, setFileBase64] = useState('')
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: async () => {
      await postAction(`/academic-trips/${id}/media`, {
        caption: caption.trim() || undefined,
        file_name: fileName,
        file_base64: fileBase64,
      })
    },
    onSuccess: () => navigate(`/academic-trips/${id}`, { replace: true }),
    onError: (e) => setErrMsg(getApiErrorMessage(e)),
  })

  async function onFile(file: File | null) {
    if (!file) return
    setFileName(file.name)
    const buf = await file.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!)
    setFileBase64(btoa(binary))
  }

  return (
    <PortalShell title="Add Trip Media">
      <div style={{ padding: 24, maxWidth: 640, margin: '0 auto' }}>
        <Link to={`/academic-trips/${id}`} style={{ fontSize: 13, fontWeight: 600, color: '#1565c0' }}>
          ← Back to trip
        </Link>
        <h1 style={{ margin: '12px 0 16px', fontSize: 22, fontWeight: 800 }}>Add Media</h1>
        {errMsg ? (
          <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#fee2e2', color: '#991b1b' }}>
            {errMsg}
          </div>
        ) : null}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!fileBase64) {
              setErrMsg('Choose a photo or video file.')
              return
            }
            save.mutate()
          }}
          style={{ background: '#fff', borderRadius: 12, padding: 24, display: 'grid', gap: 14, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}
        >
          <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
            File
            <input type="file" accept="image/*,video/*" onChange={(e) => void onFile(e.target.files?.[0] || null)} />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
            Caption
            <input value={caption} onChange={(e) => setCaption(e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }} />
          </label>
          <button
            type="submit"
            disabled={save.isPending}
            style={{ border: 'none', background: '#0f2744', color: '#fff', borderRadius: 8, padding: '12px 16px', fontWeight: 700, cursor: 'pointer' }}
          >
            {save.isPending ? 'Uploading…' : 'Upload media'}
          </button>
        </form>
      </div>
    </PortalShell>
  )
}

export function BiometricPage() {
  return (
    <PortalShell title="Biometric Attendance">
      <div style={{ padding: 24 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>Biometric Attendance</h1>
        <p style={{ margin: '0 0 18px', color: '#64748b', fontSize: 13 }}>
          Scanner registration and biometric lesson attendance.
        </p>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
          <p style={{ margin: 0, color: '#475569', fontSize: 13 }}>
            Use this portal section to access biometric attendance workflows. Device registration for super admins is under
            System → Scanner Registration.
          </p>
          <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/trainer/attendance" style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 13 }}>
              Mark class attendance →
            </Link>
            <Link to="/super-admin/biometric-scanners" style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 13 }}>
              Scanner registration →
            </Link>
          </div>
        </div>
      </div>
    </PortalShell>
  )
}
