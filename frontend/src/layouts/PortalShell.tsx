import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { getPortalNav, getRoleTheme } from '@/config/navigation'
import { fetchRecentNotifications } from '@/api/trainer'
import type { NavItem } from '@/types'
import '@/styles/portal-shell.css'

const legacyBase = (import.meta.env.VITE_LEGACY_ORIGIN as string | undefined) || ''
const ZOOM_MIN = 0
const ZOOM_MAX = 200
const ZOOM_KEY = 'ttti_zoom'

function readZoomPct() {
  const raw = parseFloat(localStorage.getItem(ZOOM_KEY) || '100')
  if (Number.isNaN(raw)) return 100
  // Migrate legacy multiplier values (e.g. 1.1) to percentages.
  if (raw > 0 && raw <= 3) return Math.round(raw * 100)
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(raw)))
}

function applyPageZoom(pct: number) {
  const target = document.querySelector('.main-content') as HTMLElement | null
  if (!target) return
  ;(target.style as CSSStyleDeclaration & { zoom?: string }).zoom = String(pct / 100)
  localStorage.setItem(ZOOM_KEY, String(pct))
}

function resolveHref(item: NavItem) {
  if (!item.external) return item.to
  return legacyBase ? `${legacyBase.replace(/\/$/, '')}${item.to}` : item.to
}

/** Africa/Nairobi clock, matching partials/digital_clock.html. */
function DigitalClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const tz = 'Africa/Nairobi'
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now)
  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(now)

  return (
    <div
      className="ttti-digital-clock"
      role="timer"
      aria-live="off"
      aria-label={`Current time ${time}, ${date} East Africa Time`}
      title="East Africa Time (Nairobi)"
    >
      <span className="ttti-clock-time">{time}</span>
      <span className="ttti-clock-date">{date}</span>
      <span className="ttti-clock-tz">EAT</span>
    </div>
  )
}

function relativeTime(value: unknown): string {
  if (!value) return ''
  const then = new Date(String(value)).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Math.max(0, Date.now() - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function PortalShell({ title, children }: { title?: string; children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [zoomPct, setZoomPct] = useState(() => (typeof window === 'undefined' ? 100 : readZoomPct()))
  const notifRef = useRef<HTMLDivElement>(null)

  const role = user?.role || 'trainer'
  const nav = getPortalNav(role)
  const theme = getRoleTheme(role)

  // The fixed official header only exists on portal routes.
  useEffect(() => {
    document.body.classList.add('portal-active')
    return () => document.body.classList.remove('portal-active')
  }, [])

  useEffect(() => {
    applyPageZoom(zoomPct)
  }, [zoomPct, location.pathname])

  useEffect(() => {
    if (!notifOpen) return
    function onDocClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [notifOpen])

  const notifs = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () => fetchRecentNotifications(8),
    enabled: Boolean(user),
    refetchInterval: 30_000,
  })

  const unread = notifs.data?.unread_count || 0
  const items = notifs.data?.notifications || []

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  function closeOnMobile() {
    if (window.innerWidth <= 768) setSidebarOpen(false)
  }

  return (
    <div
      style={
        {
          '--portal-accent': theme.accent,
          '--portal-topbar-border': theme.topbarBorder,
        } as React.CSSProperties
      }
    >
      {/* partials/official_header.html */}
      <header className="official-header" id="official-header" role="banner">
        <img src="/KENYACOATOFARMS.png" alt="Government of Kenya" className="off-logo" />
        <div className="off-center">
          <div className="off-name">THIKA TECHNICAL TRAINING INSTITUTE</div>
          <div className="off-sub">Academic Management System</div>
        </div>
        <img src="/THIKATTILOGO.jpg" alt="TTTI Logo" className="off-logo" />
      </header>

      <button
        className="sidebar-toggle"
        id="sidebarToggle"
        type="button"
        aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
        onClick={() => setSidebarOpen((v) => !v)}
      >
        <i className={sidebarOpen ? 'fas fa-times' : 'fas fa-bars'} />
      </button>
      <div
        className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
        id="sidebarOverlay"
        onClick={() => setSidebarOpen(false)}
      />

      <div className="dashboard-container">
        <aside
          className={`sidebar${sidebarOpen ? ' open' : ''}`}
          id="sidebar"
          style={{ background: theme.sidebar }}
        >
          <div className="sidebar-header">
            <img src="/THIKATTILOGO.jpg" alt="TTTI Logo" />
            <h2>
              THIKA TECHNICAL
              <br />
              TRAINING INSTITUTE
            </h2>
            <div className="role-badge">
              <i className={`fas fa-${theme.badgeIcon}`} aria-hidden /> {theme.badge}
            </div>
          </div>

          <div className="sidebar-menu">
            {nav.map((section, si) => (
              <div key={si}>
                {section.title ? <div className="menu-section">{section.title}</div> : null}
                {section.items.map((item) =>
                  item.external ? (
                    <a key={item.to} href={resolveHref(item)} onClick={closeOnMobile}>
                      <i className={`fas fa-${item.icon} fa-fw`} aria-hidden />
                      <span className="nav-label">{item.label}</span>
                    </a>
                  ) : (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to.endsWith('/dashboard')}
                      onClick={closeOnMobile}
                      className={({ isActive }) => (isActive ? 'active' : undefined)}
                    >
                      <i className={`fas fa-${item.icon} fa-fw`} aria-hidden />
                      <span className="nav-label">{item.label}</span>
                    </NavLink>
                  ),
                )}
              </div>
            ))}
          </div>

          <div className="sidebar-footer">
            {/* partials/sidebar_zoom.html */}
            <div className="sidebar-zoom" role="group" aria-label="Page zoom">
              <div className="sidebar-zoom-head">
                <span className="sidebar-zoom-title">
                  <i className="fas fa-search-plus" aria-hidden /> Zoom
                </span>
                <span className="sidebar-zoom-value">{zoomPct}%</span>
              </div>
              <input
                className="sidebar-zoom-slider"
                type="range"
                min={ZOOM_MIN}
                max={ZOOM_MAX}
                step={5}
                value={zoomPct}
                aria-label="Zoom from 0 to 200 percent"
                onChange={(e) => setZoomPct(Number(e.target.value))}
              />
              <div className="sidebar-zoom-scale">
                <span>0%</span>
                <span>100%</span>
                <span>Max</span>
              </div>
            </div>
          </div>
        </aside>

        <div className="main-content">
          <header className="topbar">
            <div className="topbar-title">{title || 'Dashboard'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <DigitalClock />

              <div className="notif-wrapper" ref={notifRef}>
                <button
                  type="button"
                  className="notification-bell"
                  aria-label="Notifications"
                  onClick={() => setNotifOpen((v) => !v)}
                >
                  <i className="fas fa-bell" />
                  {unread > 0 ? (
                    <span className="notification-badge">{unread > 99 ? '99+' : unread}</span>
                  ) : null}
                </button>

                {notifOpen ? (
                  <div className="notif-panel">
                    <div className="notif-panel-hdr">
                      <span className="notif-panel-ttl">Notifications</span>
                      <button
                        type="button"
                        className="notif-mark-all-btn"
                        onClick={() => void notifs.refetch()}
                      >
                        Refresh
                      </button>
                    </div>
                    <div className="notif-list">
                      {notifs.isLoading ? (
                        <div className="notif-loading">Loading…</div>
                      ) : items.length === 0 ? (
                        <div className="notif-empty">No notifications</div>
                      ) : (
                        items.map((n) => {
                          const row = n as Record<string, unknown>
                          const kind = String(row.type || row.notification_type || 'info')
                          const isUnread = row.is_read === false
                          return (
                            <div
                              key={String(row.id)}
                              className={`notif-item${isUnread ? ' unread' : ''}`}
                            >
                              <span className={`notif-icon ${kind}`}>
                                <i className="fas fa-bell" aria-hidden />
                              </span>
                              <span className="notif-body">
                                <span className="notif-title">{String(row.title || '')}</span>
                                <span className="notif-msg">{String(row.message || '')}</span>
                                <span className="notif-time">{relativeTime(row.created_at)}</span>
                              </span>
                              {isUnread ? <span className="notif-dot" /> : null}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <a
                className="topbar-logout"
                href="/login"
                onClick={(e) => {
                  e.preventDefault()
                  void onLogout()
                }}
              >
                <i className="fas fa-sign-out-alt" /> Sign Out
              </a>

              <div className="topbar-user">
                <i className="fas fa-user-circle" />
                {user?.full_name}
              </div>
            </div>
          </header>

          <main>{children}</main>
        </div>
      </div>
    </div>
  )
}
