import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  fetchOversightDashboard,
  type OversightRole,
  type Row,
} from '@/api/portals'
import { PortalShell } from '@/layouts/PortalShell'
import { PrideFooter } from '@/components/PrideFooter'
import { ErrorState, PageSkeleton } from '@/components/ui/States'
import { getApiErrorMessage } from '@/lib/apiClient'
import './oversight.css'

function text(value: unknown, fallback = ''): string {
  return value === null || value === undefined || value === '' ? fallback : String(value)
}

function joined(row: Row, key: string): Row {
  const value = row[key]
  return value && typeof value === 'object' ? (value as Row) : {}
}

function statusLabel(status: unknown): string {
  return text(status)
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

function dateSlice(value: unknown): string {
  return text(value).slice(0, 10)
}

function OversightFilterBar({
  departments,
  department,
  clearHref,
  onApply,
}: {
  departments: Row[]
  department: string
  clearHref: string
  onApply: (dept: string) => void
}) {
  const [draft, setDraft] = useState(department)

  function submit(e: FormEvent) {
    e.preventDefault()
    onApply(draft)
  }

  return (
    <div className="filter-bar">
      <form onSubmit={submit} style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
        <label style={{ fontWeight: 500 }}>Filter by Department:</label>
        <select
          name="department"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={text(dept.id)} value={text(dept.id)}>
              {text(dept.name)}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-view">
          Apply Filter
        </button>
        {department ? (
          <Link to={clearHref} style={{ color: '#1a237e', textDecoration: 'none' }} onClick={() => onApply('')}>
            Clear Filter
          </Link>
        ) : null}
      </form>
    </div>
  )
}

function AdmissionCards({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 30, background: '#f5f5f5', borderRadius: 8 }}>
        No pending admission requests.
      </div>
    )
  }
  return (
    <div className="requests-list">
      {rows.map((req, i) => {
        const dept = joined(req, 'departments')
        return (
          <div key={text(req.id) || i} className="request-card">
            <div className="request-header">
              <div className="request-info">
                <h4>
                  {text(req.full_name, 'Applicant')}
                  {req.phone ? ` (${text(req.phone)})` : ''}
                </h4>
                <p>
                  {text(req.course_name, '—')}
                  {dept.name ? ` — ${text(dept.name)}` : ''}
                </p>
              </div>
              <span className="status-badge status-pending">Pending</span>
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>
              <p>Email: {text(req.email, '—')}</p>
              <p>Submitted: {dateSlice(req.created_at)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ClearanceCards({
  rows,
  emptyText,
  completed = false,
}: {
  rows: Row[]
  emptyText: string
  completed?: boolean
}) {
  if (rows.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 30, background: '#f5f5f5', borderRadius: 8 }}>
        {emptyText}
      </div>
    )
  }
  return (
    <div className="requests-list">
      {rows.map((req, i) => {
        const student = joined(req, 'user_profiles')
        const course = joined(req, 'courses')
        const dept = joined(req, 'departments')
        const status = text(req.status)
        return (
          <div key={text(req.id) || i} className="request-card">
            <div className="request-header">
              <div className="request-info">
                <h4>
                  {text(student.full_name)} ({text(student.admission_no)})
                </h4>
                <p>
                  {text(course.name)} - {text(dept.name)}
                </p>
              </div>
              <span
                className={`status-badge ${completed ? 'status-completed' : `status-${status}`}`}
              >
                {completed ? 'Completed' : statusLabel(status)}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>
              {completed ? (
                <>
                  <p>Completed: {dateSlice(req.completed_at || req.initiated_at)}</p>
                  {req.certificate_issued ? (
                    <p style={{ color: '#28a745' }}>
                      Certificate Issued: {dateSlice(req.certificate_issued_at)}
                    </p>
                  ) : null}
                </>
              ) : (
                <p>Initiated: {dateSlice(req.initiated_at || req.created_at)}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function useOversight(role: OversightRole, title: string) {
  const [department, setDepartment] = useState('')
  const q = useQuery({
    queryKey: ['admin-oversight', role, department],
    queryFn: () => fetchOversightDashboard(role, department),
    refetchInterval: 20_000,
  })
  return { department, setDepartment, q, title }
}

export default function RegistrarDashboardPage() {
  const { department, setDepartment, q, title } = useOversight('registrar', 'Registrar Dashboard')

  if (q.isLoading) {
    return (
      <PortalShell title={title}>
        <PageSkeleton />
      </PortalShell>
    )
  }
  if (q.isError) {
    return (
      <PortalShell title={title}>
        <div className="p-6">
          <ErrorState message={getApiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
        </div>
      </PortalShell>
    )
  }

  const data = q.data!
  const stats = data.stats

  return (
    <PortalShell title={title}>
      <div className="ov-dashboard">
        <OversightFilterBar
          departments={data.departments}
          department={department}
          clearHref="/admin-oversight/registrar"
          onApply={setDepartment}
        />

        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Students</h3>
            <div className="value">{stats.total_students || 0}</div>
          </div>
          <div className="stat-card">
            <h3>Total Courses</h3>
            <div className="value">{stats.total_courses || 0}</div>
          </div>
          <div className="stat-card">
            <h3>Pending Admissions</h3>
            <div className="value">{stats.pending_admissions || 0}</div>
          </div>
          <div className="stat-card">
            <h3>Pending Clearances</h3>
            <div className="value">{stats.pending_clearances || 0}</div>
          </div>
          <div className="stat-card">
            <h3>Completed Clearances</h3>
            <div className="value">{stats.completed_clearances || 0}</div>
          </div>
        </div>

        <h3>Pending Admission Requests</h3>
        <AdmissionCards rows={data.pending_admissions || []} />

        <h3 style={{ marginTop: 30 }}>Pending Clearance Requests</h3>
        <ClearanceCards
          rows={data.pending_clearances || []}
          emptyText="No pending clearance requests."
        />
      </div>
      <PrideFooter />
    </PortalShell>
  )
}
