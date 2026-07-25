import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from 'chart.js'
import type { ChartOptions } from 'chart.js'
import { Bar, Doughnut, Line, PolarArea } from 'react-chartjs-2'
import { fetchDeptAdminDashboard, type Row } from '@/api/portals'
import { useAuth } from '@/providers/AuthProvider'
import { PortalShell } from '@/layouts/PortalShell'
import { PrideFooter } from '@/components/PrideFooter'
import { ErrorState, PageSkeleton } from '@/components/ui/States'
import { getApiErrorMessage } from '@/lib/apiClient'
import './DashboardPage.css'

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
)

const TITLE = 'Department Dashboard'
const ease = 'easeInOutQuart' as const
const gridColor = 'rgba(0,0,0,0.04)'

function text(value: unknown, fallback = ''): string {
  return value === null || value === undefined || value === '' ? fallback : String(value)
}

function joined(row: Row, key: string): Row {
  const value = row[key]
  return value && typeof value === 'object' ? (value as Row) : {}
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function notifMeta(type: string): { accent: string; bg: string; icon: string } {
  if (type === 'warning') return { accent: '#f59e0b', bg: '#fffbeb', icon: 'exclamation-triangle' }
  if (type === 'error') return { accent: '#ef4444', bg: '#fef2f2', icon: 'exclamation-circle' }
  if (type === 'success') return { accent: '#10b981', bg: '#ecfdf5', icon: 'check-circle' }
  return { accent: '#3b82f6', bg: '#eff6ff', icon: 'info-circle' }
}

const donutOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '72%',
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (c) => ' ' + c.label + ': ' + String(c.raw) } },
  },
  animation: { duration: 800, easing: ease },
}

const trendOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { position: 'top', labels: { font: { size: 12 }, usePointStyle: true } },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: { grid: { color: gridColor }, ticks: { font: { size: 11 } } },
    y: { grid: { color: gridColor }, ticks: { stepSize: 1, font: { size: 11 } }, beginAtZero: true },
  },
  animation: { duration: 900, easing: ease },
}

const attUnitOptions: ChartOptions<'bar'> = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { position: 'top', labels: { font: { size: 11 }, usePointStyle: true } },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: { stacked: false, grid: { color: gridColor }, ticks: { font: { size: 10 } } },
    y: { stacked: false, grid: { display: false }, ticks: { font: { size: 11 } } },
  },
  animation: { duration: 900, easing: ease },
}

const atypeOptions: ChartOptions<'polarArea'> = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: { legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 12 } } },
  animation: { duration: 800, easing: ease },
}

const classesOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (c) => ' ' + String(c.raw) + ' students' } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    y: { grid: { color: gridColor }, ticks: { stepSize: 1, font: { size: 11 } }, beginAtZero: true },
  },
  animation: { duration: 900, easing: ease },
}

const atypePalette = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#ec4899']
const classPalette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#6366f1', '#14b8a6', '#f97316']

export default function DeptAdminDashboardPage() {
  const { user } = useAuth()
  const q = useQuery({
    queryKey: ['dept-admin', 'dashboard'],
    queryFn: fetchDeptAdminDashboard,
    refetchInterval: 20_000,
  })

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

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
  const appStatus = data.app_status
  const clearance = data.clearance_stats
  const attach = data.attachment_stats

  const clearanceTotal = (clearance.pending ?? 0) + (clearance.approved ?? 0) + (clearance.rejected ?? 0)
  const attachmentsKpi = (attach.active ?? 0) + (attach.completed ?? 0) + (attach.pending ?? 0) + (attach.approved ?? 0)
  const attachmentsTotal = attachmentsKpi + (attach.rejected ?? 0)

  return (
    <PortalShell title={TITLE}>
      <div className="da-dashboard">
        <div className="dash">
          {/* ── Header ── */}
          <div className="dash-header">
            <div>
              <h1>
                <i className="fas fa-tachometer-alt" style={{ color: '#fbbf24', marginRight: 10 }} />
                Department Analytics
              </h1>
              <p>
                Welcome back, <strong>{user?.full_name}</strong>&nbsp;·&nbsp;Full operational overview for your
                department
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              <div className="dept-badge">
                <i className="fas fa-sitemap" style={{ marginRight: 6 }} />
                {(data.department_name || 'DEPARTMENT').toUpperCase()}
              </div>
              <div
                id="live-badge"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  background: 'rgba(16,185,129,.15)',
                  border: '1.5px solid rgba(16,185,129,.45)',
                  color: '#6ee7b7',
                  fontWeight: 700,
                  fontSize: 11.5,
                  padding: '5px 12px',
                  borderRadius: 30,
                }}
              >
                <span
                  id="live-dot"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 0 0 rgba(16,185,129,.7)',
                    animation: 'da-live-pulse 1.8s infinite',
                  }}
                />
                <span id="live-text">Live</span>
              </div>
              <div className="header-time" id="dash-clock">
                {now.toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                <br />
                {now.toLocaleTimeString('en-KE')}
              </div>
            </div>
          </div>

          {/* ── KPI Cards ── */}
          <div className="section-label">
            <i className="fas fa-chart-bar" /> Key Performance Indicators
          </div>
          <div className="kpi-grid">
            <Kpi color="blue" icon="door-open" value={stats.classes ?? 0} label="Classes" />
            <Kpi color="purple" icon="chalkboard-teacher" value={stats.trainers ?? 0} label="Trainers" />
            <Kpi color="green" icon="user-graduate" value={stats.students ?? 0} label="Students" />
            <Kpi color="orange" icon="book" value={stats.units ?? 0} label="Units" />
            <Kpi color="cyan" icon="file-alt" value={stats.assessments ?? 0} label="Assessments" />
            <Kpi
              color="red"
              icon="file-signature"
              value={stats.applications ?? 0}
              label="Applications"
              badge={stats.pending_applications ?? 0}
              href="/dept-admin/applications"
            />
            <Kpi color="indigo" icon="certificate" value={clearanceTotal} label="Clearance Reqs" />
            <Kpi color="green" icon="industry" value={attachmentsKpi} label="Attachments" />
            <Kpi
              color="cyan"
              icon="bus"
              value={stats.trips_total ?? 0}
              label="Trip Reports"
              badge={stats.trips_pending ?? 0}
              href="/academic-trips"
            />
            <Kpi color="indigo" icon="award" value={stats.summative_nyc ?? 0} label="Summative NYC" href="/summative/" />
          </div>

          {/* ── Summative Assessment quick access ── */}
          <div className="section-label">
            <i className="fas fa-award" /> Summative Assessment (TVET CDACC)
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))',
              gap: 12,
              marginBottom: 24,
            }}
          >
            <SummativeTile
              href="/summative/"
              hoverBorder="#6366f1"
              hoverShadow="rgba(99,102,241,.25)"
              iconBg="#eef2ff"
              iconColor="#4f46e5"
              icon="th-large"
              title="Overview"
              sub="Hub & stats"
            />
            <SummativeTile
              href="/summative/entry"
              hoverBorder="#2563eb"
              hoverShadow="rgba(37,99,235,.25)"
              iconBg="#dbeafe"
              iconColor="#1d4ed8"
              icon="edit"
              title="Competence Entry"
              sub="M / P / C / NYC / CRNM"
            />
            <SummativeTile
              href="/summative/analysis"
              hoverBorder="#b45309"
              hoverShadow="rgba(180,83,9,.25)"
              iconBg="#fef3c7"
              iconColor="#b45309"
              icon="chart-bar"
              title="Unit Performance"
              sub="Pass rates per unit / trainer"
            />
            <SummativeTile
              href="/summative/reports"
              hoverBorder="#15803d"
              hoverShadow="rgba(21,128,61,.25)"
              iconBg="#dcfce7"
              iconColor="#15803d"
              icon="download"
              title="Reports & Downloads"
              sub="Per class, term, trainer"
            />
            <SummativeTile
              href="/summative/graduation-list"
              hoverBorder="#7c3aed"
              hoverShadow="rgba(124,58,237,.25)"
              iconBg="#ede9fe"
              iconColor="#6d28d9"
              icon="user-graduate"
              title="Graduation List"
              sub="Official PDF & Excel"
            />
          </div>

          {/* ── Row 1: Assessment + Applications + Clearance donuts ── */}
          <div className="section-label">
            <i className="fas fa-chart-pie" /> Status Breakdown
          </div>
          <div className="chart-row col3">
            {/* Assessment status donut */}
            <div className="chart-card">
              <div className="chart-card-head">
                <h3>
                  <i className="fas fa-file-alt" style={{ color: '#06b6d4' }} /> Assessments
                </h3>
                <span className="sub">{stats.assessments ?? 0} total</span>
              </div>
              <div className="chart-body">
                <div className="donut-wrap" style={{ height: 180 }}>
                  <Doughnut
                    data={{
                      labels: ['Pending', 'Approved', 'Rejected'],
                      datasets: [
                        {
                          data: [stats.pending ?? 0, stats.approved ?? 0, stats.rejected ?? 0],
                          backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
                          borderWidth: 3,
                          borderColor: '#fff',
                          hoverBorderWidth: 4,
                        },
                      ],
                    }}
                    options={donutOptions}
                  />
                  <div className="donut-center">
                    <strong>{stats.assessments ?? 0}</strong>
                    <span>Total</span>
                  </div>
                </div>
                <div className="legend-row">
                  <LegendPill color="#f59e0b" label="Pending" value={stats.pending ?? 0} />
                  <LegendPill color="#10b981" label="Approved" value={stats.approved ?? 0} />
                  <LegendPill color="#ef4444" label="Rejected" value={stats.rejected ?? 0} />
                </div>
              </div>
            </div>

            {/* Applications donut */}
            <div className="chart-card">
              <div className="chart-card-head">
                <h3>
                  <i className="fas fa-file-signature" style={{ color: '#ef4444' }} /> Applications
                </h3>
                <span className="sub">{stats.applications ?? 0} total</span>
              </div>
              <div className="chart-body">
                <div className="donut-wrap" style={{ height: 180 }}>
                  <Doughnut
                    data={{
                      labels: ['Pending', 'Approved', 'Rejected'],
                      datasets: [
                        {
                          data: [appStatus.pending ?? 0, appStatus.approved ?? 0, appStatus.rejected ?? 0],
                          backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
                          borderWidth: 3,
                          borderColor: '#fff',
                          hoverBorderWidth: 4,
                        },
                      ],
                    }}
                    options={donutOptions}
                  />
                  <div className="donut-center">
                    <strong>{stats.applications ?? 0}</strong>
                    <span>Total</span>
                  </div>
                </div>
                <div className="legend-row">
                  <LegendPill color="#f59e0b" label="Pending" value={appStatus.pending ?? 0} />
                  <LegendPill color="#10b981" label="Approved" value={appStatus.approved ?? 0} />
                  <LegendPill color="#ef4444" label="Rejected" value={appStatus.rejected ?? 0} />
                </div>
              </div>
            </div>

            {/* Clearance donut */}
            <div className="chart-card">
              <div className="chart-card-head">
                <h3>
                  <i className="fas fa-certificate" style={{ color: '#6366f1' }} /> Clearance
                </h3>
                <span className="sub">{clearanceTotal} total</span>
              </div>
              <div className="chart-body">
                <div className="donut-wrap" style={{ height: 180 }}>
                  <Doughnut
                    data={{
                      labels: ['Pending', 'Approved', 'Rejected'],
                      datasets: [
                        {
                          data: [clearance.pending ?? 0, clearance.approved ?? 0, clearance.rejected ?? 0],
                          backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
                          borderWidth: 3,
                          borderColor: '#fff',
                          hoverBorderWidth: 4,
                        },
                      ],
                    }}
                    options={donutOptions}
                  />
                  <div className="donut-center">
                    <strong>{clearanceTotal}</strong>
                    <span>Total</span>
                  </div>
                </div>
                <div className="legend-row">
                  <LegendPill color="#f59e0b" label="Pending" value={clearance.pending ?? 0} />
                  <LegendPill color="#10b981" label="Approved" value={clearance.approved ?? 0} />
                  <LegendPill color="#ef4444" label="Rejected" value={clearance.rejected ?? 0} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Row 2: 7-Day Trend + Industrial Attachments ── */}
          <div className="section-label">
            <i className="fas fa-chart-line" /> Attendance Trend &amp; Industrial Attachments
          </div>
          <div className="chart-row col21">
            {/* 7-day attendance trend */}
            <div className="chart-card">
              <div className="chart-card-head">
                <h3>
                  <i className="fas fa-calendar-check" style={{ color: '#10b981' }} /> 7-Day Attendance Trend
                </h3>
                <span className="sub">Last 7 days · all units</span>
              </div>
              <div className="chart-body">
                <Line
                  style={{ maxHeight: 200 }}
                  data={{
                    labels: data.trend_labels,
                    datasets: [
                      {
                        label: 'Present',
                        data: data.trend_present,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16,185,129,.10)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#10b981',
                        pointRadius: 4,
                        borderWidth: 2.5,
                      },
                      {
                        label: 'Absent',
                        data: data.trend_absent,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239,68,68,.07)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#ef4444',
                        pointRadius: 4,
                        borderWidth: 2.5,
                      },
                    ],
                  }}
                  options={trendOptions}
                />
              </div>
            </div>

            {/* Industrial attachment status */}
            <div className="chart-card">
              <div className="chart-card-head">
                <h3>
                  <i className="fas fa-industry" style={{ color: '#10b981' }} /> Industrial Attachments
                </h3>
                <span className="sub">Status distribution</span>
              </div>
              <div className="chart-body">
                <div className="donut-wrap" style={{ height: 160 }}>
                  <Doughnut
                    data={{
                      labels: ['Active', 'Completed', 'Pending', 'Approved', 'Rejected'],
                      datasets: [
                        {
                          data: [
                            attach.active ?? 0,
                            attach.completed ?? 0,
                            attach.pending ?? 0,
                            attach.approved ?? 0,
                            attach.rejected ?? 0,
                          ],
                          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#06b6d4', '#ef4444'],
                          borderWidth: 3,
                          borderColor: '#fff',
                          hoverBorderWidth: 4,
                        },
                      ],
                    }}
                    options={donutOptions}
                  />
                  <div className="donut-center">
                    <strong>{attachmentsTotal}</strong>
                    <span>Total</span>
                  </div>
                </div>
                <div className="mini-stats" style={{ marginTop: 14 }}>
                  <div className="mini-stat">
                    <strong style={{ color: '#3b82f6' }}>{attach.active ?? 0}</strong>
                    <span>Active</span>
                  </div>
                  <div className="mini-stat">
                    <strong style={{ color: '#10b981' }}>{attach.completed ?? 0}</strong>
                    <span>Done</span>
                  </div>
                  <div className="mini-stat">
                    <strong style={{ color: '#f59e0b' }}>{attach.pending ?? 0}</strong>
                    <span>Pending</span>
                  </div>
                  <div className="mini-stat">
                    <strong style={{ color: '#ef4444' }}>{attach.rejected ?? 0}</strong>
                    <span>Rejected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Row 3: Attendance per Unit + Assessment Types ── */}
          <div className="section-label">
            <i className="fas fa-chart-bar" /> Unit-Level Analysis
          </div>
          <div className="chart-row col2">
            {/* Attendance per unit */}
            <div className="chart-card">
              <div className="chart-card-head">
                <h3>
                  <i className="fas fa-users" style={{ color: '#3b82f6' }} /> Attendance by Unit
                </h3>
                <span className="sub">Present vs Absent</span>
              </div>
              <div className="chart-body">
                <Bar
                  style={{ maxHeight: 240 }}
                  data={{
                    labels: data.att_unit_labels,
                    datasets: [
                      {
                        label: 'Present',
                        data: data.att_unit_present,
                        backgroundColor: 'rgba(16,185,129,.80)',
                        borderRadius: 4,
                        borderSkipped: false,
                      },
                      {
                        label: 'Absent',
                        data: data.att_unit_absent,
                        backgroundColor: 'rgba(239,68,68,.65)',
                        borderRadius: 4,
                        borderSkipped: false,
                      },
                    ],
                  }}
                  options={attUnitOptions}
                />
              </div>
            </div>

            {/* Assessment types */}
            <div className="chart-card">
              <div className="chart-card-head">
                <h3>
                  <i className="fas fa-layer-group" style={{ color: '#8b5cf6' }} /> Assessment Types
                </h3>
                <span className="sub">Distribution</span>
              </div>
              <div className="chart-body">
                <PolarArea
                  style={{ maxHeight: 240 }}
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
                  options={atypeOptions}
                />
              </div>
            </div>
          </div>

          {/* ── Row 4: Class Enrolment Bar ── */}
          <div className="section-label">
            <i className="fas fa-door-open" /> Class Enrolment
          </div>
          <div className="chart-row col1">
            <div className="chart-card">
              <div className="chart-card-head">
                <h3>
                  <i className="fas fa-graduation-cap" style={{ color: '#f59e0b' }} /> Students per Class
                </h3>
                <span className="sub">Enrolment count</span>
              </div>
              <div className="chart-body">
                <Bar
                  style={{ maxHeight: 200 }}
                  data={{
                    labels: data.class_labels,
                    datasets: [
                      {
                        label: 'Students Enrolled',
                        data: data.class_counts,
                        backgroundColor: classPalette.slice(0, data.class_labels.length).map((c) => c + 'cc'),
                        borderColor: classPalette.slice(0, data.class_labels.length),
                        borderWidth: 1.5,
                        borderRadius: 6,
                        borderSkipped: false,
                      },
                    ],
                  }}
                  options={classesOptions}
                />
              </div>
            </div>
          </div>

          {/* ── Notifications ── */}
          {data.unread_notifications.length > 0 ? (
            <>
              <div className="section-label">
                <i className="fas fa-bell" /> Notifications
              </div>
              <div className="notif-card">
                <div className="notif-card-head">
                  <h3>
                    <i className="fas fa-bell" style={{ color: '#3b82f6', marginRight: 8 }} />
                    Unread Notifications
                    <span
                      style={{
                        background: '#ef4444',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 20,
                        marginLeft: 8,
                      }}
                    >
                      {data.unread_notifications.length}
                    </span>
                  </h3>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <a href="/notifications" style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textDecoration: 'none' }}>
                      View All <i className="fas fa-arrow-right" />
                    </a>
                    <form method="POST" action="/notifications/mark-all-read">
                      <button
                        type="submit"
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: 12,
                          color: '#64748b',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        Mark all read
                      </button>
                    </form>
                  </div>
                </div>
                {data.unread_notifications.map((n, index) => {
                  const meta = notifMeta(text(n.type))
                  return (
                    <div
                      key={text(n.id) || String(index)}
                      className="notif-row"
                      style={{ borderLeft: `4px solid ${meta.accent}` }}
                    >
                      <div className="notif-icon" style={{ background: meta.bg, color: meta.accent }}>
                        <i className={`fas fa-${meta.icon}`} />
                      </div>
                      <div className="notif-body" style={{ flex: 1 }}>
                        <p>{text(n.title)}</p>
                        <small>
                          {text(n.message)}&nbsp;·&nbsp;{text(n.created_at)}
                        </small>
                      </div>
                      {text(n.action_url) ? (
                        <a
                          href={text(n.action_url)}
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#3b82f6',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          View <i className="fas fa-arrow-right" />
                        </a>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </>
          ) : null}

          {/* ── Recent Assessments ── */}
          <div className="section-label">
            <i className="fas fa-clock" /> Recent Activity
          </div>
          <div className="table-card">
            <div className="table-card-head">
              <h3>
                <i className="fas fa-file-alt" style={{ color: '#06b6d4' }} /> Recent Assessments
              </h3>
              <a href="/dept-admin/assessments">
                View All <i className="fas fa-arrow-right" />
              </a>
            </div>
            {data.recent_assessments.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Unit</th>
                      <th>Class</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_assessments.map((a, index) => {
                      const profile = joined(a, 'user_profiles')
                      const unit = joined(a, 'units')
                      const cls = joined(a, 'classes')
                      const status = text(a.status, 'pending')
                      return (
                        <tr key={text(a.id) || String(index)}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{text(profile.full_name, '—')}</div>
                            <div style={{ fontSize: 11.5, color: '#64748b' }}>{text(profile.admission_no)}</div>
                          </td>
                          <td style={{ fontWeight: 500 }}>{text(unit.name, '—')}</td>
                          <td style={{ color: '#64748b' }}>{text(cls.name, '—')}</td>
                          <td>
                            <span className="badge type">{text(a.assessment_type, '—')}</span>
                          </td>
                          <td>
                            <span className={`badge ${status}`}>{titleCase(status)}</span>
                          </td>
                          <td style={{ color: '#64748b', fontSize: 12 }}>
                            {text(a.uploaded_at) ? text(a.uploaded_at).slice(0, 10) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                <i className="fas fa-file-alt" style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
                No assessments yet
              </div>
            )}
          </div>

          {/* ── Recent Attendance ── */}
          {data.recent_attendance.length > 0 ? (
            <div className="table-card">
              <div className="table-card-head">
                <h3>
                  <i className="fas fa-calendar-check" style={{ color: '#10b981' }} /> Recent Attendance
                </h3>
                <a href="/dept-admin/attendance">
                  View All <i className="fas fa-arrow-right" />
                </a>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Unit</th>
                      <th>Class</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_attendance.slice(0, 10).map((att, index) => {
                      const profile = joined(att, 'user_profiles')
                      const unit = joined(att, 'units')
                      const cls = joined(att, 'classes')
                      const status = text(att.status, 'absent')
                      return (
                        <tr key={text(att.id) || String(index)}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{text(profile.full_name, '—')}</div>
                            <div style={{ fontSize: 11.5, color: '#64748b' }}>{text(profile.admission_no)}</div>
                          </td>
                          <td style={{ fontWeight: 500 }}>{text(unit.name, '—')}</td>
                          <td style={{ color: '#64748b' }}>{text(cls.name, '—')}</td>
                          <td>
                            <span className={`badge ${status}`}>{titleCase(status)}</span>
                          </td>
                          <td style={{ color: '#64748b', fontSize: 12 }}>
                            {text(att.attendance_date) ? text(att.attendance_date).slice(0, 10) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <PrideFooter showLiveBadge={false} />
    </PortalShell>
  )
}

function Kpi({
  color,
  icon,
  value,
  label,
  badge,
  href,
}: {
  color: string
  icon: string
  value: number
  label: string
  badge?: number
  href?: string
}) {
  return (
    <div
      className={`kpi ${color}`}
      style={href ? { cursor: 'pointer' } : undefined}
      onClick={href ? () => (window.location.href = href) : undefined}
    >
      {badge && badge > 0 ? <span className="kpi-badge">{badge}</span> : null}
      <div className="kpi-top">
        <div className="kpi-icon">
          <i className={`fas fa-${icon}`} />
        </div>
        <div className="kpi-val">{value}</div>
      </div>
      <div className="kpi-label">{label}</div>
    </div>
  )
}

function LegendPill({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="legend-pill">
      <div className="legend-dot" style={{ background: color }} />
      {label} <strong style={{ color: '#0f172a', marginLeft: 4 }}>{value}</strong>
    </div>
  )
}

function SummativeTile({
  href,
  hoverBorder,
  hoverShadow,
  iconBg,
  iconColor,
  icon,
  title,
  sub,
}: {
  href: string
  hoverBorder: string
  hoverShadow: string
  iconBg: string
  iconColor: string
  icon: string
  title: string
  sub: string
}) {
  return (
    <a
      href={href}
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
        transition: 'border-color .15s,box-shadow .15s',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = hoverBorder
        e.currentTarget.style.boxShadow = `0 4px 14px -4px ${hoverShadow}`
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = '#e8eef6'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
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
        <i className={`fas fa-${icon}`} />
      </span>
      <span>
        <strong style={{ display: 'block', fontSize: 13 }}>{title}</strong>
        <small style={{ color: '#64748b', fontSize: 11 }}>{sub}</small>
      </span>
    </a>
  )
}
