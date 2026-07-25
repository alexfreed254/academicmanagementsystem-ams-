import { useState, type CSSProperties, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchServiceDeptDashboard, type Row } from '@/api/portals'
import { PortalShell } from '@/layouts/PortalShell'
import { PrideFooter } from '@/components/PrideFooter'
import { ErrorState, PageSkeleton } from '@/components/ui/States'
import { getApiErrorMessage } from '@/lib/apiClient'
import './DashboardPage.css'

const ACTION_TITLE = 'Action not yet available in this portal'

/** Mirrors ROLE_POSITION in routes/service_dept.py. */
const ROLE_POSITION: Record<string, string> = {
  library_hod: 'Library HOD',
  sports_hod: 'Games & Sports HOD',
  service_clearance_officer: 'Service Clearance Officer',
  finance_officer: 'Finance Officer',
  registrar: 'Academic Registrar',
  deputy_principal: 'Deputy Principal (Academics)',
  dean_students: 'Dean of Students',
  environment_hod: 'Environment HOD',
  dept_admin: 'Head of Department',
  trainer: 'Lecturer / Trainer',
  workshop_technician: 'Workshop Technician',
  quality_assurance_officer: 'Quality Assurance Officer',
  super_admin: 'System Administrator',
}

function text(value: unknown, fallback = ''): string {
  return value === null || value === undefined || value === '' ? fallback : String(value)
}

/** Joined Supabase relation (e.g. `row._student`) as a plain row. */
function joined(row: Row, key: string): Row {
  const value = row[key]
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {}
}

/** Annotated array relation (e.g. `row._lost_items`). */
function list(row: Row, key: string): Row[] {
  const value = row[key]
  if (!Array.isArray(value)) return []
  return value.filter((item): item is Row => item !== null && typeof item === 'object')
}

/** Jinja's `{{ (row.get('x','') or '')[:10] or '—' }}`. */
function datePrefix(value: unknown): string {
  return text(value).slice(0, 10) || '—'
}

function roleLabel(role: unknown): string {
  const key = text(role)
  return ROLE_POSITION[key] ?? key
}

function noSubmit(e: FormEvent<HTMLFormElement>): void {
  e.preventDefault()
}

function PendingCard({ row, deptLabel }: { row: Row; deptLabel: string }) {
  const [rejOpen, setRejOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const student = joined(row, '_student')
  const course = joined(row, '_course')
  const dept = joined(row, '_dept')
  const approver = joined(row, '_approver')
  const lostItems = list(row, '_lost_items')
  const catLabel = text(row._cat_label)
  const id = text(row.id)

  return (
    <div className="tr-card pending">
      <div className="tr-hdr">
        <div>
          <div className="tr-name">
            {text(student.full_name, '—')}
            {catLabel ? <span className="cat-tag">{catLabel}</span> : null}
          </div>
          <div className="tr-adm">
            Adm No: <strong>{text(student.admission_no, '—')}</strong>
            {student.mobile_number ? <>&nbsp;&bull;&nbsp;{text(student.mobile_number)}</> : null}
          </div>
        </div>
        <span className="tr-badge badge-pending">
          <i className="fas fa-clock"></i> Awaiting Clearance
        </span>
      </div>

      <div className="tr-body">
        <div>
          <span className="lbl">Course</span>
          <span className="val">
            {text(course.name, '—')}
            {course.code ? (
              <small style={{ color: '#9ca3af', fontWeight: 400 }}> ({text(course.code)})</small>
            ) : null}
          </span>
        </div>
        <div>
          <span className="lbl">Department</span>
          <span className="val">{text(dept.name, '—')}</span>
        </div>
        <div>
          <span className="lbl">Applied On</span>
          <span className="val">{datePrefix(row.created_at)}</span>
        </div>
        {Object.keys(approver).length > 0 ? (
          <div>
            <span className="lbl">Assigned To</span>
            <span className="val" style={{ fontSize: 13 }}>
              {text(approver.full_name, '—')}
              <small style={{ color: '#9ca3af', fontWeight: 400, display: 'block' }}>
                {roleLabel(approver.role)}
              </small>
            </span>
          </div>
        ) : null}
      </div>

      <div className="tr-actions">
        <form onSubmit={noSubmit} style={{ display: 'inline' }}>
          <button
            type="submit"
            className="btn-clear"
            disabled
            title={ACTION_TITLE}
            data-name={text(student.full_name, 'this trainee')}
            data-dept={deptLabel}
          >
            <i className="fas fa-check"></i> Clear Trainee
          </button>
        </form>
        <button type="button" className="btn-reject" onClick={() => setRejOpen((open) => !open)}>
          <i className="fas fa-times"></i> Reject
        </button>
      </div>

      <div className={`rej-form${rejOpen ? ' open' : ''}`} id={`rej-${id}`}>
        <form onSubmit={noSubmit}>
          <input
            type="text"
            name="comments"
            className="rej-input"
            placeholder="Reason for rejection (required — trainee will see this)…"
            disabled
          />
          <button type="submit" className="btn-rej-confirm" disabled title={ACTION_TITLE}>
            <i className="fas fa-times-circle"></i> Confirm Rejection
          </button>
        </form>
      </div>

      {/* Lost / Missing Items panel */}
      <div className="lost-panel">
        <div className="lost-panel-hdr">
          <i className="fas fa-exclamation-triangle"></i>
          Lost / Missing Items
          {lostItems.length > 0 ? (
            <span
              style={{
                background: '#fef3c7',
                color: '#b45309',
                padding: '1px 8px',
                borderRadius: 99,
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {lostItems.length}
            </span>
          ) : null}
          &nbsp;
          <button type="button" className="toggle-add-link" onClick={() => setAddOpen((open) => !open)}>
            + Add Item
          </button>
        </div>

        {lostItems.length > 0 ? (
          <div style={{ marginBottom: 10 }}>
            {lostItems.map((li, index) => (
              <div key={text(li.id) || index} className="lost-item-row">
                <span className="lost-item-name">{text(li.item_name)}</span>
                <span className="lost-item-qty">Qty: {text(li.quantity)}</span>
                {li.notes ? <span className="lost-item-note">{text(li.notes)}</span> : null}
                <form onSubmit={noSubmit} style={{ display: 'inline' }}>
                  <button type="button" className="btn-rm-item" disabled title={ACTION_TITLE}>
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>No items recorded yet.</div>
        )}

        <div className="add-item-form" id={`add-item-${id}`} style={{ display: addOpen ? 'block' : 'none' }}>
          <form onSubmit={noSubmit}>
            <div className="add-item-row">
              <input
                type="text"
                name="item_name"
                className="add-item-inp name"
                placeholder="Item name (e.g. Library book, Lab coat)…"
                disabled
              />
              <input
                type="number"
                name="quantity"
                className="add-item-inp qty"
                defaultValue={1}
                min={1}
                placeholder="Qty"
                disabled
              />
              <input
                type="text"
                name="notes"
                className="add-item-inp note"
                placeholder="Notes / description (optional)…"
                disabled
              />
              <button type="submit" className="btn-add-item" disabled title={ACTION_TITLE}>
                <i className="fas fa-plus"></i> Record Item
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function ClearedCard({ row }: { row: Row }) {
  const student = joined(row, '_student')
  const approver = joined(row, '_approver')
  const lostItems = list(row, '_lost_items')

  return (
    <div className="tr-card cleared">
      <div className="tr-hdr">
        <div>
          <div className="tr-name">{text(student.full_name, '—')}</div>
          <div className="tr-adm">Adm: {text(student.admission_no, '—')}</div>
        </div>
        <span className="tr-badge badge-cleared">
          <i className="fas fa-check-circle"></i> Cleared
        </span>
      </div>
      <div
        className="tr-note"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px', alignItems: 'center' }}
      >
        <span>
          <i className="fas fa-calendar-check" style={{ color: '#15803d', marginRight: 5 }}></i>
          Cleared on <strong>{datePrefix(row.approved_at)}</strong>
        </span>
        {Object.keys(approver).length > 0 ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#dcfce7',
              color: '#15803d',
              padding: '3px 12px',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <i className="fas fa-user-check"></i>
            {text(approver.full_name, '—')}
            &mdash;
            <em style={{ fontWeight: 400 }}>{roleLabel(approver.role)}</em>
          </span>
        ) : null}
        {row.comments ? (
          <span style={{ color: '#6b7280' }}>
            <i className="fas fa-comment-alt" style={{ marginRight: 4 }}></i>
            {text(row.comments)}
          </span>
        ) : null}
      </div>
      {lostItems.length > 0 ? (
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid #fde68a',
            background: '#fffbeb',
            fontSize: 12,
          }}
        >
          <strong style={{ color: '#b45309' }}>
            <i className="fas fa-exclamation-triangle"></i> Recorded Lost Items:
          </strong>
          {lostItems.map((li, index) => (
            <span
              key={text(li.id) || index}
              style={{
                marginLeft: 8,
                background: '#fef3c7',
                color: '#78350f',
                padding: '2px 8px',
                borderRadius: 6,
              }}
            >
              {text(li.item_name)} ({text(li.quantity)})
              {li.notes ? ` — ${text(li.notes)}` : ''}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function RejectedCard({ row }: { row: Row }) {
  const student = joined(row, '_student')
  const approver = joined(row, '_approver')

  return (
    <div className="tr-card rejected">
      <div className="tr-hdr">
        <div>
          <div className="tr-name">{text(student.full_name, '—')}</div>
          <div className="tr-adm">Adm: {text(student.admission_no, '—')}</div>
        </div>
        <span className="tr-badge badge-rejected">
          <i className="fas fa-times-circle"></i> Rejected
        </span>
      </div>
      <div
        className="tr-note"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px', alignItems: 'center' }}
      >
        <span>
          <i className="fas fa-calendar-times" style={{ color: '#b91c1c', marginRight: 5 }}></i>
          Rejected on <strong>{datePrefix(row.approved_at)}</strong>
        </span>
        {Object.keys(approver).length > 0 ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#fee2e2',
              color: '#b91c1c',
              padding: '3px 12px',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <i className="fas fa-user-times"></i>
            {text(approver.full_name, '—')}
            &mdash;
            <em style={{ fontWeight: 400 }}>{roleLabel(approver.role)}</em>
          </span>
        ) : null}
        {row.comments ? (
          <span style={{ color: '#6b7280' }}>
            <i className="fas fa-comment-alt" style={{ marginRight: 4 }}></i>
            <em>{text(row.comments)}</em>
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default function ServiceDeptDashboardPage() {
  const q = useQuery({
    queryKey: ['service-dept', 'dashboard'],
    queryFn: fetchServiceDeptDashboard,
    refetchInterval: 20_000,
  })

  const fallbackTitle = 'Service Clearance Dashboard'

  if (q.isLoading) {
    return (
      <PortalShell title={fallbackTitle}>
        <PageSkeleton />
      </PortalShell>
    )
  }

  if (q.isError) {
    return (
      <PortalShell title={fallbackTitle}>
        <div className="p-6">
          <ErrorState message={getApiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
        </div>
      </PortalShell>
    )
  }

  const data = q.data!
  const config = data.config
  const pending = data.pending || []
  const cleared = data.cleared || []
  const rejected = data.rejected || []
  const themeStyle = {
    '--sd-gradient': config.gradient,
    '--sd-accent': config.accent,
  } as CSSProperties

  return (
    <PortalShell title={`${config.label} Clearance Dashboard`}>
      <div className="sd-dashboard" style={themeStyle}>
        <div className="sd-wrap">
          {/* Hero banner */}
          <div className="sd-hero">
            <div className="sd-hero-left">
              <div className="sd-hero-icon">
                <i className={`fas ${config.icon}`}></i>
              </div>
              <div>
                <h1>{config.label}</h1>
                <p>
                  Review and clear trainees assigned to your department.
                  <br />
                  Approved clearances automatically update trainee progress.
                </p>
              </div>
            </div>
            <div className="sd-hero-stat">
              <div className="big">{pending.length}</div>
              <div className="lbl">Awaiting Clearance</div>
            </div>
          </div>

          {/* Stats chips */}
          <div className="sd-chips">
            <div className="sd-chip">
              <div className="sd-chip-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
                <i className="fas fa-hourglass-half"></i>
              </div>
              <div>
                <div className="sd-chip-num">{pending.length}</div>
                <div className="sd-chip-lbl">Pending</div>
              </div>
            </div>
            <div className="sd-chip">
              <div className="sd-chip-icon" style={{ background: '#dcfce7', color: '#15803d' }}>
                <i className="fas fa-check-circle"></i>
              </div>
              <div>
                <div className="sd-chip-num">{cleared.length}</div>
                <div className="sd-chip-lbl">Cleared</div>
              </div>
            </div>
            <div className="sd-chip">
              <div className="sd-chip-icon" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                <i className="fas fa-times-circle"></i>
              </div>
              <div>
                <div className="sd-chip-num">{rejected.length}</div>
                <div className="sd-chip-lbl">Rejected</div>
              </div>
            </div>
            <div className="sd-chip">
              <div className="sd-chip-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
                <i className="fas fa-users"></i>
              </div>
              <div>
                <div className="sd-chip-num">{pending.length + cleared.length + rejected.length}</div>
                <div className="sd-chip-lbl">Total Trainees</div>
              </div>
            </div>
          </div>

          {/* ═══ PENDING ═══ */}
          <div className="sec-hdg" style={{ color: '#b45309' }}>
            <i className="fas fa-hourglass-half"></i>
            Awaiting Clearance
            <span className="sec-pill" style={{ background: '#fef3c7', color: '#b45309' }}>
              {pending.length}
            </span>
          </div>

          {pending.length > 0 ? (
            pending.map((row, index) => (
              <PendingCard key={text(row.id) || index} row={row} deptLabel={config.label} />
            ))
          ) : (
            <div className="sd-empty">
              <span className="icon" style={{ color: '#16a34a' }}>
                <i className="fas fa-check-circle"></i>
              </span>
              <h3>All Clear!</h3>
              <p>No trainees are waiting for clearance from {config.label}.</p>
            </div>
          )}

          {/* ═══ CLEARED HISTORY ═══ */}
          {cleared.length > 0 ? (
            <>
              <div className="sec-hdg" style={{ color: '#15803d', marginTop: 32 }}>
                <i className="fas fa-check-circle"></i>
                Cleared
                <span className="sec-pill" style={{ background: '#dcfce7', color: '#15803d' }}>
                  {cleared.length}
                </span>
              </div>
              {cleared.map((row, index) => (
                <ClearedCard key={text(row.id) || index} row={row} />
              ))}
            </>
          ) : null}

          {/* ═══ REJECTED HISTORY ═══ */}
          {rejected.length > 0 ? (
            <>
              <div className="sec-hdg" style={{ color: '#b91c1c', marginTop: 32 }}>
                <i className="fas fa-times-circle"></i>
                Rejected
                <span className="sec-pill" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                  {rejected.length}
                </span>
              </div>
              {rejected.map((row, index) => (
                <RejectedCard key={text(row.id) || index} row={row} />
              ))}
            </>
          ) : null}
        </div>
        <PrideFooter />
      </div>
    </PortalShell>
  )
}
