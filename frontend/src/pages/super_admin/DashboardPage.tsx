import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Doughnut, Line, Bar, PolarArea } from 'react-chartjs-2'
import { fetchSuperAdminDashboard, type Row } from '@/api/portals'
import { PortalShell } from '@/layouts/PortalShell'
import { PrideFooter } from '@/components/PrideFooter'
import { ErrorState, PageSkeleton } from '@/components/ui/States'
import { getApiErrorMessage } from '@/lib/apiClient'
import './DashboardPage.css'

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
)

const TITLE = 'System Dashboard'
const EASE = 'easeInOutQuart' as const
const GRID = 'rgba(0,0,0,0.04)'

/* ── Row helpers ─────────────────────────────────── */
function text(value: unknown, fallback = ''): string {
  return value === null || value === undefined || value === '' ? fallback : String(value)
}

function joined(row: Row, key: string): Row {
  const value = row[key]
  return value && typeof value === 'object' ? (value as Row) : {}
}

function titleCase(value: string): string {
  return value.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

/* ── Chart builders (mirrors template script block) ─ */
const rolePalette = [
  '#16a34a', '#6d28d9', '#1d4ed8', '#0891b2', '#d97706', '#dc2626',
  '#9333ea', '#ea580c', '#0f766e', '#b45309', '#475569',
]
const roleOrder = [
  'student', 'trainer', 'dept_admin', 'super_admin', 'examination_officer',
  'internal_verifier', 'cdacc_verifier', 'service_dept', 'liaison_officer',
  'industry_mentor', 'workshop_technician',
]

function buildRoles(roleMap: Record<string, number>) {
  const labels: string[] = []
  const data: number[] = []
  const colors: string[] = []
  roleOrder.forEach((r, i) => {
    if (roleMap[r]) {
      labels.push(r.replace(/_/g, ' '))
      data.push(roleMap[r])
      colors.push(rolePalette[i] || '#94a3b8')
    }
  })
  Object.keys(roleMap).forEach((r) => {
    if (!roleOrder.includes(r)) {
      labels.push(r)
      data.push(roleMap[r])
      colors.push('#94a3b8')
    }
  })
  return { labels, data, colors }
}

function donutData(labels: string[], data: number[], colors: string[]): ChartData<'doughnut'> {
  return {
    labels,
    datasets: [
      { data, backgroundColor: colors, borderWidth: 3, borderColor: '#fff', hoverBorderWidth: 4 },
    ],
  }
}

function donutOptions(cutout = '72%'): ChartOptions<'doughnut'> {
  return {
    cutout,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => ' ' + c.label + ': ' + String(c.raw) } },
    },
    animation: { duration: 800, easing: EASE },
  }
}

const lineOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { position: 'top', labels: { font: { size: 12 }, usePointStyle: true } },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: { grid: { color: GRID }, ticks: { font: { size: 11 } } },
    y: { grid: { color: GRID }, beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } },
  },
  animation: { duration: 900, easing: EASE },
}

const barOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { position: 'top', labels: { font: { size: 12 }, usePointStyle: true } },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    y: { grid: { color: GRID }, beginAtZero: true, ticks: { font: { size: 11 } } },
  },
  animation: { duration: 900, easing: EASE },
}

const polarOptions: ChartOptions<'polarArea'> = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: { legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 12 } } },
  animation: { duration: 800, easing: EASE },
}

/* ── Small presentational pieces ─────────────────── */
function StatCard({
  accent,
  iconBg,
  icon,
  label,
  value,
  to,
}: {
  accent: string
  iconBg: string
  icon: string
  label: string
  value: number
  to?: string
}) {
  const style = { '--accent': accent, ...(to ? { cursor: 'pointer' } : {}) } as CSSProperties
  const body = (
    <>
      <div className="s-icon" style={{ background: iconBg }}>
        <i className={`fas fa-${icon}`}></i>
      </div>
      <div className="s-info">
        <h3>{label}</h3>
        <p>{value}</p>
      </div>
    </>
  )
  if (to) {
    return (
      <Link to={to} className="s-card" style={{ ...style, textDecoration: 'none' }}>
        {body}
      </Link>
    )
  }
  return (
    <div className="s-card" style={style}>
      {body}
    </div>
  )
}

function SummativeLink({
  to,
  hoverColor,
  hoverShadow,
  iconBg,
  iconColor,
  icon,
  title,
  sub,
}: {
  to: string
  hoverColor: string
  hoverShadow: string
  iconBg: string
  iconColor: string
  icon: string
  title: ReactNode
  sub: ReactNode
}) {
  const base: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#fff',
    border: '1.5px solid #e8eef6',
    borderRadius: 12,
    padding: '14px 16px',
    textDecoration: 'none',
    color: '#0f172a',
    transition: 'border-color .15s,box-shadow .15s',
  }
  const onOver = (e: MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.borderColor = hoverColor
    e.currentTarget.style.boxShadow = hoverShadow
  }
  const onOut = (e: MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.borderColor = '#e8eef6'
    e.currentTarget.style.boxShadow = 'none'
  }
  return (
    <Link to={to} style={base} onMouseOver={onOver} onMouseOut={onOut}>
      <span
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: iconBg,
          color: iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
        }}
      >
        <i className={`fas fa-${icon}`}></i>
      </span>
      <span>
        <strong style={{ display: 'block', fontSize: 13 }}>{title}</strong>
        <small style={{ color: '#64748b', fontSize: 11 }}>{sub}</small>
      </span>
    </Link>
  )
}

/* ── Page ────────────────────────────────────────── */
export default function SuperAdminDashboardPage() {
  const q = useQuery({
    queryKey: ['super-admin', 'dashboard'],
    queryFn: fetchSuperAdminDashboard,
    refetchInterval: 20_000,
  })

  if (q.isLoading) {
    return (
      <PortalShell title={TITLE}>
        <PageSkeleton />
      </PortalShell>
    )
  }

  if (q.isError) {
    return (
      <PortalShell title={TITLE}>
        <div className="p-6">
          <ErrorState message={getApiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
        </div>
      </PortalShell>
    )
  }

  const data = q.data!
  const stats = data.stats
  const iaStats = data.ia_stats
  const caStats = data.ca_stats
  const deptStats = data.dept_stats || []
  const recentAssessments = data.recent_assessments || []
  const recentClearances = data.recent_clearances || []
  const recentLogs = data.recent_logs || []

  const iaTotal =
    (iaStats.pending || 0) +
    (iaStats.active || 0) +
    (iaStats.approved || 0) +
    (iaStats.completed || 0) +
    (iaStats.rejected || 0)
  const caTotal = (caStats.pending || 0) + (caStats.approved || 0) + (caStats.rejected || 0)

  const clTotal = stats.clearances || 1
  const clPending = stats.clearances_pending || 0
  const clCompleted = stats.clearances_completed || 0
  const clOther = (stats.clearances || 0) - clPending - clCompleted

  const roles = buildRoles(data.role_map || {})
  const atypePalette = ['#1d4ed8', '#6d28d9', '#f59e0b', '#16a34a', '#dc2626', '#0891b2', '#ec4899']
  const maxStudents = deptStats.length
    ? Math.max(...deptStats.map((d) => d.student_count)) || 1
    : 1

  return (
    <PortalShell title={TITLE}>
      <div className="sa-dashboard">
        <div className="page-wrap">
          {/* ── System Overview Stats ─── */}
          <p className="section-title" style={{ justifyContent: 'space-between' }}>
            <span>
              <i className="fas fa-chart-bar"></i> System Overview
            </span>
            <span
              id="live-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                background: '#ecfdf5',
                border: '1.5px solid #a7f3d0',
                color: '#047857',
                fontWeight: 700,
                fontSize: 11,
                padding: '4px 11px',
                borderRadius: 30,
                textTransform: 'none',
                letterSpacing: 0,
              }}
            >
              <span
                id="live-dot"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: q.isFetching ? '#f59e0b' : '#10b981',
                  animation: 'livePulse 1.8s infinite',
                }}
              ></span>
              <span id="live-text">Live</span>
            </span>
          </p>
          <div className="stats-grid">
            <StatCard
              accent="linear-gradient(90deg,#1565c0,#42a5f5)"
              iconBg="linear-gradient(135deg,#1565c0,#0d47a1)"
              icon="sitemap"
              label="Departments"
              value={stats.departments || 0}
            />
            <StatCard
              accent="linear-gradient(90deg,#6d28d9,#a78bfa)"
              iconBg="linear-gradient(135deg,#6d28d9,#4c1d95)"
              icon="chalkboard-teacher"
              label="Trainers"
              value={stats.trainers || 0}
            />
            <StatCard
              accent="linear-gradient(90deg,#16a34a,#4ade80)"
              iconBg="linear-gradient(135deg,#16a34a,#15803d)"
              icon="user-graduate"
              label="Students"
              value={stats.students || 0}
            />
            <StatCard
              accent="linear-gradient(90deg,#ea580c,#fb923c)"
              iconBg="linear-gradient(135deg,#ea580c,#c2410c)"
              icon="door-open"
              label="Classes"
              value={stats.classes || 0}
            />
            <StatCard
              accent="linear-gradient(90deg,#0891b2,#22d3ee)"
              iconBg="linear-gradient(135deg,#0891b2,#0e7490)"
              icon="book"
              label="Units"
              value={stats.units || 0}
            />
            <StatCard
              accent="linear-gradient(90deg,#d97706,#fbbf24)"
              iconBg="linear-gradient(135deg,#d97706,#b45309)"
              icon="calendar-check"
              label="Attendance"
              value={stats.attendance || 0}
            />
            <StatCard
              accent="linear-gradient(90deg,#dc2626,#f87171)"
              iconBg="linear-gradient(135deg,#dc2626,#b91c1c)"
              icon="file-alt"
              label="Assessments"
              value={stats.assessments || 0}
            />
            <StatCard
              accent="linear-gradient(90deg,#1d4ed8,#60a5fa)"
              iconBg="linear-gradient(135deg,#1d4ed8,#1e5a9f)"
              icon="clipboard-check"
              label="Clearances"
              value={stats.clearances || 0}
            />
            <StatCard
              accent="linear-gradient(90deg,#0f766e,#2dd4bf)"
              iconBg="linear-gradient(135deg,#0f766e,#115e59)"
              icon="bus"
              label="Trip Reports"
              value={stats.trips_total || 0}
              to="/academic-trips"
            />
            <StatCard
              accent="linear-gradient(90deg,#b45309,#fbbf24)"
              iconBg="linear-gradient(135deg,#b45309,#92400e)"
              icon="award"
              label="Summative NYC"
              value={stats.summative_nyc || 0}
              to="/summative/"
            />
          </div>

          {/* ── Quick Actions ─── */}
          <p className="section-title">
            <i className="fas fa-bolt"></i> Quick Actions
          </p>
          <div className="p-card" style={{ marginBottom: 24 }}>
            <div className="quick-actions">
              <Link to="/super-admin/users" className="qa-btn">
                <i className="fas fa-user-plus"></i> Add User
              </Link>
              <Link to="/super-admin/departments" className="qa-btn">
                <i className="fas fa-sitemap"></i> Departments
              </Link>
              <Link to="/super-admin/courses" className="qa-btn">
                <i className="fas fa-graduation-cap"></i> Courses
              </Link>
              <Link to="/super-admin/classes" className="qa-btn">
                <i className="fas fa-door-open"></i> Classes
              </Link>
              <Link to="/super-admin/units" className="qa-btn">
                <i className="fas fa-book"></i> Units
              </Link>
              <Link to="/super-admin/assessments?status=pending" className="qa-btn">
                <i className="fas fa-clock"></i> Pending POE
              </Link>
              <Link to="/super-admin/attendance" className="qa-btn">
                <i className="fas fa-clipboard-list"></i> Attendance
              </Link>
              <Link to="/super-admin/marks" className="qa-btn">
                <i className="fas fa-chart-line"></i> Marks
              </Link>
              <Link to="/super-admin/clearances" className="qa-btn">
                <i className="fas fa-clipboard-check"></i> Clearances
              </Link>
              <Link to="/super-admin/companies" className="qa-btn">
                <i className="fas fa-industry"></i> Companies
              </Link>
              <Link to="/super-admin/logs" className="qa-btn">
                <i className="fas fa-history"></i> Audit Logs
              </Link>
            </div>
          </div>

          {/* ── Summative Assessment (TVET CDACC) ─── */}
          <p className="section-title">
            <i className="fas fa-award"></i> Summative Assessment (TVET CDACC)
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))',
              gap: 12,
              marginBottom: 24,
            }}
          >
            <SummativeLink
              to="/summative/"
              hoverColor="#6366f1"
              hoverShadow="0 4px 14px -4px rgba(99,102,241,.25)"
              iconBg="#eef2ff"
              iconColor="#4f46e5"
              icon="th-large"
              title="Overview"
              sub={<>Hub &amp; stats</>}
            />
            <SummativeLink
              to="/summative/entry"
              hoverColor="#2563eb"
              hoverShadow="0 4px 14px -4px rgba(37,99,235,.25)"
              iconBg="#dbeafe"
              iconColor="#1d4ed8"
              icon="edit"
              title="Competence Entry"
              sub="M / P / C / NYC / CRNM"
            />
            <SummativeLink
              to="/summative/analysis"
              hoverColor="#b45309"
              hoverShadow="0 4px 14px -4px rgba(180,83,9,.25)"
              iconBg="#fef3c7"
              iconColor="#b45309"
              icon="chart-bar"
              title="Unit Performance"
              sub="Pass rates per unit / trainer"
            />
            <SummativeLink
              to="/summative/reports"
              hoverColor="#15803d"
              hoverShadow="0 4px 14px -4px rgba(21,128,61,.25)"
              iconBg="#dcfce7"
              iconColor="#15803d"
              icon="download"
              title={<>Reports &amp; Downloads</>}
              sub="Per class, term, trainer"
            />
            <SummativeLink
              to="/summative/graduation-list"
              hoverColor="#7c3aed"
              hoverShadow="0 4px 14px -4px rgba(124,58,237,.25)"
              iconBg="#ede9fe"
              iconColor="#6d28d9"
              icon="user-graduate"
              title="Graduation List"
              sub={<>Official PDF &amp; Excel</>}
            />
          </div>

          {/* Row 1: Assessment status · User roles · Industrial Attachments */}
          <p className="section-title">
            <i className="fas fa-chart-pie"></i> Status Breakdown — System-Wide
          </p>
          <div className="analytics-row col3">
            {/* Assessment status donut */}
            <div className="a-card">
              <div className="a-card-head">
                <h4>
                  <i className="fas fa-file-alt" style={{ color: '#dc2626' }}></i> Assessments
                </h4>
                <span className="sub">{stats.assessments || 0} total</span>
              </div>
              <div className="a-card-body">
                <div className="donut-wrap" style={{ height: 170 }}>
                  <Doughnut
                    data={donutData(
                      ['Pending', 'Approved', 'Rejected'],
                      [stats.pending || 0, stats.approved || 0, stats.rejected || 0],
                      ['#f59e0b', '#16a34a', '#dc2626'],
                    )}
                    options={donutOptions()}
                  />
                  <div className="donut-center">
                    <strong>{stats.assessments || 0}</strong>
                    <span>Total</span>
                  </div>
                </div>
                <div className="leg-row">
                  <div className="leg-pill">
                    <div className="leg-dot" style={{ background: '#f59e0b' }}></div>Pending{' '}
                    <strong style={{ color: '#0f172a', marginLeft: 3 }}>{stats.pending || 0}</strong>
                  </div>
                  <div className="leg-pill">
                    <div className="leg-dot" style={{ background: '#16a34a' }}></div>Approved{' '}
                    <strong style={{ color: '#0f172a', marginLeft: 3 }}>{stats.approved || 0}</strong>
                  </div>
                  <div className="leg-pill">
                    <div className="leg-dot" style={{ background: '#dc2626' }}></div>Rejected{' '}
                    <strong style={{ color: '#0f172a', marginLeft: 3 }}>{stats.rejected || 0}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* User roles donut */}
            <div className="a-card">
              <div className="a-card-head">
                <h4>
                  <i className="fas fa-users" style={{ color: '#6d28d9' }}></i> User Roles
                </h4>
                <span className="sub">{stats.users || 0} total</span>
              </div>
              <div className="a-card-body">
                <div className="donut-wrap" style={{ height: 170 }}>
                  <Doughnut
                    data={donutData(roles.labels, roles.data, roles.colors)}
                    options={donutOptions()}
                  />
                  <div className="donut-center">
                    <strong>{stats.users || 0}</strong>
                    <span>Users</span>
                  </div>
                </div>
                <div className="leg-row">
                  <div className="leg-pill">
                    <div className="leg-dot" style={{ background: '#16a34a' }}></div>Students{' '}
                    <strong style={{ color: '#0f172a', marginLeft: 3 }}>{stats.students || 0}</strong>
                  </div>
                  <div className="leg-pill">
                    <div className="leg-dot" style={{ background: '#6d28d9' }}></div>Trainers{' '}
                    <strong style={{ color: '#0f172a', marginLeft: 3 }}>{stats.trainers || 0}</strong>
                  </div>
                  <div className="leg-pill">
                    <div className="leg-dot" style={{ background: '#1d4ed8' }}></div>Dept Admins{' '}
                    <strong style={{ color: '#0f172a', marginLeft: 3 }}>
                      {stats.dept_admins || 0}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Industrial attachments donut */}
            <div className="a-card">
              <div className="a-card-head">
                <h4>
                  <i className="fas fa-industry" style={{ color: '#16a34a' }}></i> Industrial
                  Attachments
                </h4>
                <span className="sub">System-wide</span>
              </div>
              <div className="a-card-body">
                <div className="donut-wrap" style={{ height: 170 }}>
                  <Doughnut
                    data={donutData(
                      ['Active', 'Completed', 'Pending', 'Approved', 'Rejected', 'Terminated'],
                      [
                        iaStats.active || 0,
                        iaStats.completed || 0,
                        iaStats.pending || 0,
                        iaStats.approved || 0,
                        iaStats.rejected || 0,
                        iaStats.terminated || 0,
                      ],
                      ['#1d4ed8', '#16a34a', '#f59e0b', '#0891b2', '#dc2626', '#94a3b8'],
                    )}
                    options={donutOptions()}
                  />
                  <div className="donut-center">
                    <strong>{iaTotal}</strong>
                    <span>Total</span>
                  </div>
                </div>
                <div className="a-mini-stats">
                  <div className="a-mini-stat">
                    <strong style={{ color: '#1d4ed8' }}>{iaStats.active || 0}</strong>
                    <span>Active</span>
                  </div>
                  <div className="a-mini-stat">
                    <strong style={{ color: '#16a34a' }}>{iaStats.completed || 0}</strong>
                    <span>Done</span>
                  </div>
                  <div className="a-mini-stat">
                    <strong style={{ color: '#f59e0b' }}>{iaStats.pending || 0}</strong>
                    <span>Pending</span>
                  </div>
                  <div className="a-mini-stat">
                    <strong style={{ color: '#dc2626' }}>{iaStats.rejected || 0}</strong>
                    <span>Rejected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: 7-day trend + Course Applications */}
          <p className="section-title">
            <i className="fas fa-chart-line"></i> Activity Trends
          </p>
          <div className="analytics-row col21">
            {/* 7-day attendance trend */}
            <div className="a-card">
              <div className="a-card-head">
                <h4>
                  <i className="fas fa-calendar-check" style={{ color: '#0891b2' }}></i> 7-Day
                  Attendance Trend
                </h4>
                <span className="sub">All departments · last 7 days</span>
              </div>
              <div className="a-card-body">
                <Line
                  style={{ maxHeight: 200 }}
                  data={{
                    labels: data.trend_labels,
                    datasets: [
                      {
                        label: 'Present',
                        data: data.trend_present,
                        borderColor: '#16a34a',
                        backgroundColor: 'rgba(22,163,74,.10)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#16a34a',
                        pointRadius: 4,
                        borderWidth: 2.5,
                      },
                      {
                        label: 'Absent',
                        data: data.trend_absent,
                        borderColor: '#dc2626',
                        backgroundColor: 'rgba(220,38,38,.07)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#dc2626',
                        pointRadius: 4,
                        borderWidth: 2.5,
                      },
                    ],
                  }}
                  options={lineOptions}
                />
              </div>
            </div>

            {/* Course applications */}
            <div className="a-card">
              <div className="a-card-head">
                <h4>
                  <i className="fas fa-file-signature" style={{ color: '#ea580c' }}></i> Course
                  Applications
                </h4>
                <span className="sub">System-wide</span>
              </div>
              <div className="a-card-body">
                <div className="donut-wrap" style={{ height: 160 }}>
                  <Doughnut
                    data={donutData(
                      ['Pending', 'Approved', 'Rejected'],
                      [caStats.pending || 0, caStats.approved || 0, caStats.rejected || 0],
                      ['#f59e0b', '#16a34a', '#dc2626'],
                    )}
                    options={donutOptions()}
                  />
                  <div className="donut-center">
                    <strong>{caTotal}</strong>
                    <span>Total</span>
                  </div>
                </div>
                <div className="a-mini-stats">
                  <div className="a-mini-stat">
                    <strong style={{ color: '#f59e0b' }}>{caStats.pending || 0}</strong>
                    <span>Pending</span>
                  </div>
                  <div className="a-mini-stat">
                    <strong style={{ color: '#16a34a' }}>{caStats.approved || 0}</strong>
                    <span>Approved</span>
                  </div>
                  <div className="a-mini-stat">
                    <strong style={{ color: '#dc2626' }}>{caStats.rejected || 0}</strong>
                    <span>Rejected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Department comparison bar + Assessment types */}
          <p className="section-title">
            <i className="fas fa-chart-bar"></i> Department Comparison
          </p>
          <div className="analytics-row col2">
            {/* Students/Trainers/Classes per department */}
            <div className="a-card">
              <div className="a-card-head">
                <h4>
                  <i className="fas fa-sitemap" style={{ color: '#1e5a9f' }}></i> Headcount by
                  Department
                </h4>
                <span className="sub">Students · Trainers · Classes</span>
              </div>
              <div className="a-card-body">
                <Bar
                  style={{ maxHeight: 230 }}
                  data={{
                    labels: data.dept_chart_labels,
                    datasets: [
                      {
                        label: 'Students',
                        data: data.dept_chart_students,
                        backgroundColor: 'rgba(22,163,74,.75)',
                        borderColor: '#16a34a',
                        borderWidth: 1.5,
                        borderRadius: 4,
                      },
                      {
                        label: 'Trainers',
                        data: data.dept_chart_trainers,
                        backgroundColor: 'rgba(109,40,217,.70)',
                        borderColor: '#6d28d9',
                        borderWidth: 1.5,
                        borderRadius: 4,
                      },
                      {
                        label: 'Classes',
                        data: data.dept_chart_classes,
                        backgroundColor: 'rgba(29,78,216,.70)',
                        borderColor: '#1d4ed8',
                        borderWidth: 1.5,
                        borderRadius: 4,
                      },
                    ],
                  }}
                  options={barOptions}
                />
              </div>
            </div>

            {/* Assessment types polar */}
            <div className="a-card">
              <div className="a-card-head">
                <h4>
                  <i className="fas fa-layer-group" style={{ color: '#6d28d9' }}></i> Assessment
                  Types
                </h4>
                <span className="sub">Distribution</span>
              </div>
              <div className="a-card-body">
                <PolarArea
                  style={{ maxHeight: 230 }}
                  data={{
                    labels: data.atype_labels,
                    datasets: [
                      {
                        data: data.atype_counts,
                        backgroundColor: atypePalette.map((c) => c + 'cc'),
                        borderColor: atypePalette,
                        borderWidth: 1.5,
                      },
                    ],
                  }}
                  options={polarOptions}
                />
              </div>
            </div>
          </div>

          {/* Row 4: Clearance status bar (full width) */}
          <p className="section-title">
            <i className="fas fa-clipboard-check"></i> Clearance Overview
          </p>
          <div className="analytics-row col1">
            <div className="a-card">
              <div className="a-card-head">
                <h4>
                  <i className="fas fa-clipboard-check" style={{ color: '#1d4ed8' }}></i> Clearance
                  Requests
                </h4>
                <span className="sub">{stats.clearances || 0} total · all departments</span>
              </div>
              <div
                className="a-card-body"
                style={{ display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap' }}
              >
                <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
                  <Doughnut
                    data={donutData(
                      ['Pending/In Progress', 'Completed', 'Other'],
                      [clPending, clCompleted, clOther],
                      ['#f59e0b', '#16a34a', '#94a3b8'],
                    )}
                    options={donutOptions('68%')}
                  />
                  <div
                    className="donut-center"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <strong
                      style={{
                        fontSize: 26,
                        fontWeight: 900,
                        color: '#0f172a',
                        fontFamily: "'Poppins',sans-serif",
                      }}
                    >
                      {stats.clearances || 0}
                    </strong>
                    <span
                      style={{
                        fontSize: 10,
                        color: '#94a3b8',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}
                    >
                      Total
                    </span>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: '#475569',
                        marginBottom: 5,
                      }}
                    >
                      <span>
                        <span style={{ color: '#f59e0b' }}>●</span> Pending / In Progress
                      </span>
                      <span>{clPending}</span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        background: '#f1f5f9',
                        borderRadius: 9999,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          background: '#f59e0b',
                          borderRadius: 9999,
                          width: `${Math.round((clPending / clTotal) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: '#475569',
                        marginBottom: 5,
                      }}
                    >
                      <span>
                        <span style={{ color: '#16a34a' }}>●</span> Completed
                      </span>
                      <span>{clCompleted}</span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        background: '#f1f5f9',
                        borderRadius: 9999,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          background: '#16a34a',
                          borderRadius: 9999,
                          width: `${Math.round((clCompleted / clTotal) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: '#475569',
                        marginBottom: 5,
                      }}
                    >
                      <span>
                        <span style={{ color: '#64748b' }}>●</span> Other
                      </span>
                      <span>{clOther}</span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        background: '#f1f5f9',
                        borderRadius: 9999,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          background: '#94a3b8',
                          borderRadius: 9999,
                          width: `${Math.round((clOther / clTotal) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Assessments ─── */}
          <div>
            <div className="p-card">
              <div className="p-card-header">
                <span>
                  <i className="fas fa-file-alt" style={{ color: '#dc2626', marginRight: 6 }}></i>
                  Assessments
                </span>
                <Link to="/super-admin/assessments">View All &rarr;</Link>
              </div>
              <div className="mini-stats">
                <div className="mini-stat">
                  <p>{stats.assessments || 0}</p>
                  <span>Total</span>
                </div>
                <div className="mini-stat">
                  <p style={{ color: '#ea580c' }}>{stats.pending || 0}</p>
                  <span>Pending</span>
                </div>
                <div className="mini-stat">
                  <p style={{ color: '#16a34a' }}>{stats.approved || 0}</p>
                  <span>Approved</span>
                </div>
                <div className="mini-stat">
                  <p style={{ color: '#dc2626' }}>{stats.rejected || 0}</p>
                  <span>Rejected</span>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Unit</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAssessments.length > 0 ? (
                    recentAssessments.slice(0, 6).map((a, index) => {
                      const student = joined(a, 'user_profiles')
                      const unit = joined(a, 'units')
                      const status = text(a.status, 'pending')
                      const uploadedAt = text(a.uploaded_at)
                      return (
                        <tr key={text(a.id) || index}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{text(student.full_name, '—')}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>
                              {text(student.admission_no)}
                            </div>
                          </td>
                          <td>{text(unit.name, '—')}</td>
                          <td>
                            <span className={`b b-${status}`}>{titleCase(status)}</span>
                          </td>
                          <td style={{ color: '#94a3b8', fontSize: 12 }}>
                            {uploadedAt ? uploadedAt.slice(0, 10) : '—'}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>
                        <i
                          className="fas fa-inbox"
                          style={{
                            fontSize: 24,
                            display: 'block',
                            marginBottom: 8,
                            opacity: 0.4,
                          }}
                        ></i>
                        No assessments yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Clearance ─── */}
          <div>
            <div className="p-card">
              <div className="p-card-header">
                <span>
                  <i
                    className="fas fa-clipboard-check"
                    style={{ color: '#1d4ed8', marginRight: 6 }}
                  ></i>
                  Clearance Requests
                </span>
                <Link to="/super-admin/clearances">View All &rarr;</Link>
              </div>
              <div className="mini-stats">
                <div className="mini-stat">
                  <p>{stats.clearances || 0}</p>
                  <span>Total</span>
                </div>
                <div className="mini-stat">
                  <p style={{ color: '#ea580c' }}>{clPending}</p>
                  <span>Pending</span>
                </div>
                <div className="mini-stat">
                  <p style={{ color: '#16a34a' }}>{clCompleted}</p>
                  <span>Completed</span>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentClearances.length > 0 ? (
                    recentClearances.slice(0, 5).map((c, index) => {
                      const student = joined(c, 'user_profiles')
                      const course = joined(c, 'courses')
                      const cs = text(c.status, 'pending')
                      const badge =
                        cs === 'completed'
                          ? 'approved'
                          : cs === 'pending' || cs === 'in_progress'
                            ? 'pending'
                            : 'rejected'
                      return (
                        <tr key={text(c.id) || index}>
                          <td>{text(student.full_name, '—')}</td>
                          <td style={{ fontSize: 12, color: '#64748b' }}>
                            {text(course.name, '—')}
                          </td>
                          <td>
                            <span className={`b b-${badge}`}>
                              {titleCase(cs.replace(/_/g, ' '))}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>
                        No clearance requests.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Department Breakdown ─── */}
          <p className="section-title">
            <i className="fas fa-sitemap"></i> Department Breakdown
          </p>
          <div className="p-card" style={{ marginBottom: 24 }}>
            <table>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Classes</th>
                  <th>Trainers</th>
                  <th>Students</th>
                  <th style={{ minWidth: 140 }}>Student Load</th>
                </tr>
              </thead>
              <tbody>
                {deptStats.length > 0 ? (
                  deptStats.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <strong>{d.name}</strong>
                      </td>
                      <td>{d.class_count}</td>
                      <td>{d.trainer_count}</td>
                      <td>
                        <span
                          className="b b-primary"
                          style={{
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                          }}
                        >
                          {d.student_count}
                        </span>
                      </td>
                      <td>
                        <div className="dept-bar">
                          <div
                            className="dept-bar-fill"
                            style={{
                              width: `${Math.round((d.student_count / (maxStudents || 1)) * 100)}%`,
                            }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>
                      <i
                        className="fas fa-sitemap"
                        style={{ fontSize: 32, display: 'block', marginBottom: 10, opacity: 0.3 }}
                      ></i>
                      No departments yet.{' '}
                      <Link
                        to="/super-admin/departments"
                        style={{ color: '#1d4ed8', fontWeight: 700 }}
                      >
                        Add one &rarr;
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Audit Logs ─── */}
          <p className="section-title">
            <i className="fas fa-history"></i> Recent Audit Logs
          </p>
          <div className="p-card">
            <div className="p-card-header">
              <span>Last 10 System Actions</span>
              <Link to="/super-admin/logs">Full Log &rarr;</Link>
            </div>
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.length > 0 ? (
                  recentLogs.slice(0, 10).map((l, index) => {
                    const profile = joined(l, 'user_profiles')
                    const createdAt = text(l.created_at)
                    return (
                      <tr key={text(l.id) || index}>
                        <td>
                          <strong>{text(profile.full_name, 'System')}</strong>
                        </td>
                        <td style={{ fontSize: 12, color: '#64748b' }}>{text(l.actor_role, '—')}</td>
                        <td>
                          <code
                            style={{
                              fontSize: 11,
                              background: '#f1f5f9',
                              color: '#1e5a9f',
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontWeight: 600,
                            }}
                          >
                            {text(l.action, '—')}
                          </code>
                        </td>
                        <td style={{ fontSize: 12, color: '#64748b' }}>{text(l.target, '—')}</td>
                        <td style={{ fontSize: 11.5, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {createdAt ? createdAt.slice(0, 16).replace('T', ' ') : '—'}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>
                      No logs yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Footer motto ─── */}
          <div style={{ textAlign: 'center', padding: '24px 0 8px', color: '#94a3b8', fontSize: 12 }}>
            <i className="fas fa-shield-alt" style={{ color: '#1e5a9f', marginRight: 6 }}></i>
            <em>"Verified Learning. Mapped Progress. Empowered Futures."</em>
          </div>
        </div>
        <PrideFooter showLiveBadge={false} />
      </div>
    </PortalShell>
  )
}
