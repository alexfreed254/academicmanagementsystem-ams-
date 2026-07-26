import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchWorkshopDashboard } from '@/api/portals'
import { PortalShell } from '@/layouts/PortalShell'
import { PrideFooter } from '@/components/PrideFooter'
import { ErrorState, PageSkeleton } from '@/components/ui/States'
import { getApiErrorMessage } from '@/lib/apiClient'
import './DashboardPage.css'

const TITLE = 'Workshop Technician Dashboard'

function text(value: unknown, fallback = ''): string {
  return value === null || value === undefined || value === '' ? fallback : String(value)
}

function titleCase(value: string): string {
  return value.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

function todayLabel(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date())
}

export default function WorkshopTechnicianDashboardPage() {
  const q = useQuery({
    queryKey: ['workshop-technician', 'dashboard'],
    queryFn: fetchWorkshopDashboard,
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
  const recentItems = data.recent_items || []
  const pendingClearances = data.pending_clearances || 0

  return (
    <PortalShell title={TITLE}>
      <div className="wt-dashboard">
        <div className="wt-wrap">
          {/* Banner */}
          <div className="wt-banner">
            <div>
              <h1>
                <i className="fas fa-tools" style={{ color: '#f97316', marginRight: 8 }}></i>
                Workshop Technician Portal
                {data.dept_name ? (
                  <span style={{ fontSize: 14, fontWeight: 500, opacity: 0.7, marginLeft: 8 }}>
                    — {data.dept_name}
                  </span>
                ) : null}
              </h1>
              <p>Manage workshop equipment inventory and approve trainee clearances for your department.</p>
            </div>
            <div
              style={{
                background: 'rgba(249,115,22,.2)',
                color: '#f97316',
                border: '1px solid rgba(249,115,22,.3)',
                padding: '7px 18px',
                borderRadius: 99,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <i className="fas fa-calendar-day" style={{ marginRight: 5 }}></i>
              {todayLabel()}
            </div>
          </div>

          {/* Stat cards */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#fff7ed' }}>
                <i className="fas fa-boxes" style={{ color: '#f97316' }}></i>
              </div>
              <div>
                <div className="stat-num">{data.inv_total}</div>
                <div className="stat-lbl">Total Items</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#fef3c7' }}>
                <i className="fas fa-exclamation-triangle" style={{ color: '#b45309' }}></i>
              </div>
              <div>
                <div className="stat-num">{data.inv_low}</div>
                <div className="stat-lbl">Low Stock (qty &lt; 3)</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#fee2e2' }}>
                <i className="fas fa-times-circle" style={{ color: '#b91c1c' }}></i>
              </div>
              <div>
                <div className="stat-num">{data.inv_damaged}</div>
                <div className="stat-lbl">Poor / Damaged</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#dcfce7' }}>
                <i className="fas fa-clipboard-check" style={{ color: '#15803d' }}></i>
              </div>
              <div>
                <div className="stat-num">{pendingClearances}</div>
                <div className="stat-lbl">Pending Clearances</div>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="quick-links">
            <Link to="/workshop-technician/inventory" className="quick-link">
              <div className="quick-link-icon" style={{ background: '#fff7ed' }}>
                <i className="fas fa-boxes" style={{ color: '#f97316' }}></i>
              </div>
              <span>Manage Inventory</span>
            </Link>
            <Link to="/workshop-technician/inventory?condition=damaged" className="quick-link">
              <div className="quick-link-icon" style={{ background: '#fee2e2' }}>
                <i className="fas fa-wrench" style={{ color: '#b91c1c' }}></i>
              </div>
              <span>Damaged Items</span>
            </Link>
            <Link to="/clearance/approver" className="quick-link">
              <div className="quick-link-icon" style={{ background: '#dcfce7' }}>
                <i className="fas fa-clipboard-check" style={{ color: '#15803d' }}></i>
              </div>
              <span>Clearance Approvals</span>
              {pendingClearances ? (
                <span
                  style={{
                    marginLeft: 4,
                    background: '#f97316',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: 9999,
                  }}
                >
                  {pendingClearances}
                </span>
              ) : null}
            </Link>
            <a href="/auth/profile" className="quick-link">
              <div className="quick-link-icon" style={{ background: '#f0f9ff' }}>
                <i className="fas fa-user-circle" style={{ color: '#0369a1' }}></i>
              </div>
              <span>My Profile</span>
            </a>
          </div>

          {/* Recent inventory */}
          <div className="card">
            <div className="card-hdr">
              <h2>
                <i className="fas fa-history" style={{ color: '#f97316', marginRight: 6 }}></i>
                Recently Added Items
              </h2>
              <Link to="/workshop-technician/inventory">
                View all <i className="fas fa-arrow-right" style={{ fontSize: 10 }}></i>
              </Link>
            </div>

            {recentItems.length > 0 ? (
              <div className="item-list">
                {recentItems.map((item, index) => {
                  const condition = text(item.condition, 'good')
                  return (
                    <div key={text(item.id) || index} className="item-row">
                      <div className="item-icon">
                        <i className="fas fa-tools"></i>
                      </div>
                      <div>
                        <div className="item-name">{text(item.item_name)}</div>
                        <div className="item-cat">
                          {text(item.category, 'Uncategorised')}
                          {item.serial_number ? ` • S/N: ${text(item.serial_number)}` : ''}
                        </div>
                      </div>
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className={`cond-badge cond-${condition}`}>{titleCase(condition)}</span>
                        <span className="item-qty">Qty: {text(item.quantity)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-box">
                <i className="fas fa-boxes"></i>
                <p>
                  No inventory items yet.{' '}
                  <Link to="/workshop-technician/inventory" style={{ color: '#f97316', fontWeight: 600 }}>
                    Add the first item
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
        <PrideFooter />
      </div>
    </PortalShell>
  )
}
