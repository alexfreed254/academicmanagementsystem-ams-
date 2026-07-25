import { Link } from 'react-router-dom'
import { PortalShell } from '@/layouts/PortalShell'
import { ApiTablePage, StatusPill, cell } from '@/pages/shared/ApiTablePage'

export function ClearanceApproverPage() {
  return (
    <ApiTablePage
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
    />
  )
}

export function ClearanceStudentPage() {
  return (
    <ApiTablePage
      title="Course Clearance"
      subtitle="Track your departmental clearance progress toward certificate issuance."
      endpoint="/clearance/student"
      rowsKey="requests"
      columns={[
        { key: 'courses.name', label: 'Course', render: (r) => cell(r, 'courses.name') },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
        { key: 'created_at', label: 'Started' },
      ]}
    />
  )
}

export function ServiceClearancePage() {
  return (
    <ApiTablePage
      title="Pending Clearances"
      subtitle="Service-department clearance queue for your office."
      endpoint="/clearance/service-dept"
      rowsKey="pending"
      columns={[
        { key: 'student', label: 'Student', render: (r) => cell(r, 'user_profiles.full_name') },
        { key: 'approver_category', label: 'Category' },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      ]}
    />
  )
}

export function SummativeHubPage() {
  const links = [
    { to: '/summative/', title: 'Overview', sub: 'Hub & stats', icon: 'th-large', bg: '#eef2ff', color: '#4f46e5' },
    { to: '/summative/entry', title: 'Competence Entry', sub: 'M / P / C / NYC / CRNM', icon: 'edit', bg: '#dbeafe', color: '#1d4ed8' },
    { to: '/summative/analysis', title: 'Unit Performance', sub: 'Pass rates per unit / trainer', icon: 'chart-bar', bg: '#fef3c7', color: '#b45309' },
    { to: '/summative/reports', title: 'Reports & Downloads', sub: 'Per class, term, trainer', icon: 'download', bg: '#dcfce7', color: '#15803d' },
    { to: '/summative/graduation-list', title: 'Graduation List', sub: 'Official PDF & Excel', icon: 'user-graduate', bg: '#ede9fe', color: '#6d28d9' },
  ]
  return (
    <PortalShell title="Summative Assessment">
      <div style={{ padding: 24 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>Summative Assessment (TVET CDACC)</h1>
        <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 13 }}>
          Competence entry, unit performance analysis, downloads and graduation lists.
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

export function AcademicTripsPage() {
  return (
    <ApiTablePage
      title="Academic Trip Reports"
      subtitle="Department trip reports uploaded by trainers and admins."
      endpoint="/academic-trips"
      rowsKey="trips"
      columns={[
        { key: 'title', label: 'Title' },
        { key: 'destination', label: 'Destination' },
        { key: 'trip_date', label: 'Date' },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      ]}
    />
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
