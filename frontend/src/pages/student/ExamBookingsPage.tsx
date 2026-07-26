/**
 * My Exam Bookings — React port of templates/student/exam_bookings.html
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, getApiErrorMessage } from '@/lib/apiClient'
import { PortalShell } from '@/layouts/PortalShell'
import { ErrorState, PageSkeleton } from '@/components/ui/States'
import type { Row } from '@/api/portals'
import './exam-bookings.css'

type BookingGroup = {
  serial_number: string
  created_at: string
  exam_session: string
  status: string
  approved_at: string
  rejection_reason: string
  reviewer: string
  bookings: Row[]
}

type Payload = {
  items: Row[]
  booking_groups: BookingGroup[]
}

function attemptLabel(at: string) {
  if (at === 'retake') return { cls: 'at-retake', text: 'Retake' }
  if (at === 'missing_unit') return { cls: 'at-missing', text: 'Missed Unit' }
  return { cls: 'at-first', text: 'First Attempt' }
}

export default function ExamBookingsPage() {
  const q = useQuery({
    queryKey: ['student-exam-bookings'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/student/exam-bookings')
      return data.data as Payload
    },
  })

  const groups = useMemo(() => q.data?.booking_groups || [], [q.data])

  if (q.isLoading) {
    return (
      <PortalShell title="Exam Booking Forms">
        <PageSkeleton />
      </PortalShell>
    )
  }
  if (q.isError) {
    return (
      <PortalShell title="Exam Booking Forms">
        <div className="p-6">
          <ErrorState message={getApiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
        </div>
      </PortalShell>
    )
  }

  return (
    <PortalShell title="Exam Booking Forms">
      <div className="eb-wrap">
        <div className="eb-page-hdr">
          <div>
            <div className="eb-page-title">My Exam Bookings</div>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b', maxWidth: 560, lineHeight: 1.45 }}>
              Submit Form 1A → print for HOD signature → HOD approves online → Examination Office confirms.
            </p>
          </div>
          <Link to="/student/exam-booking-form" className="btn-new-booking">
            New Booking
          </Link>
        </div>

        {!groups.length ? (
          <div className="empty-wrap">
            <h3>No exam bookings yet</h3>
            <p>Register for your exams by creating your first booking form.</p>
            <Link to="/student/exam-booking-form" className="btn-new-booking">
              Create Booking Form
            </Link>
          </div>
        ) : (
          groups.map((grp) => {
            const st = grp.status || 'pending'
            return (
              <div key={grp.serial_number} className="eb-group">
                <div className={`eb-group-head st-${st}`}>
                  <div className="eb-serial">{grp.serial_number}</div>
                  <div className="eb-meta">Submitted {String(grp.created_at || '').slice(0, 10) || '—'}</div>
                  {grp.exam_session ? <div className="eb-meta">{grp.exam_session}</div> : null}
                  <div style={{ marginLeft: 'auto' }}>
                    <span className={`status-pill sp-${st}`}>{st}</span>
                  </div>
                </div>

                {st === 'pending' ? (
                  <div className="hod-banner pending" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                    <div className="hod-banner-text">
                      <div className="hod-banner-title">Action Required — Print & Take to HOD</div>
                      <div className="hod-banner-sub">
                        Print this form, then take it to the Head of Department for signature and stamp. The HOD will
                        then approve the booking in the system.
                      </div>
                      <div className="steps-list" style={{ marginTop: 8 }}>
                        <span className="step-item">
                          <span className="step-num">1</span> Download & Print
                        </span>
                        <span className="step-arrow">→</span>
                        <span className="step-item">
                          <span className="step-num">2</span> HOD Signs & Stamps
                        </span>
                        <span className="step-arrow">→</span>
                        <span className="step-item">
                          <span className="step-num">3</span> HOD Approves Online
                        </span>
                        <span className="step-arrow">→</span>
                        <span className="step-item">
                          <span className="step-num">4</span> Exam Office Confirms
                        </span>
                      </div>
                    </div>
                    <button type="button" className="btn-print" onClick={() => window.print()}>
                      Print Form
                    </button>
                  </div>
                ) : null}

                {st === 'approved' ? (
                  <div className="hod-banner approved" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                    <div className="hod-banner-text">
                      <div className="hod-banner-title">HOD Approved — Awaiting Exam Office</div>
                      <div className="hod-banner-sub">
                        Approved{grp.reviewer ? ` by ${grp.reviewer}` : ''}
                        {grp.approved_at ? ` on ${String(grp.approved_at).slice(0, 10)}` : ''}. The Examination Officer
                        will confirm your booking for the exam sitting.
                      </div>
                    </div>
                    <button type="button" className="btn-dl-approved" onClick={() => window.print()}>
                      Print Approved Form
                    </button>
                  </div>
                ) : null}

                {st === 'completed' ? (
                  <div
                    className="hod-banner approved"
                    style={{
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 14,
                      background: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
                      borderColor: '#93c5fd',
                    }}
                  >
                    <div className="hod-banner-text">
                      <div className="hod-banner-title">Confirmed by Examination Office</div>
                      <div className="hod-banner-sub">
                        Your booking is fully processed. Keep a printed copy of your approved Form 1A for the exam day.
                      </div>
                    </div>
                    <button type="button" className="btn-dl-approved" onClick={() => window.print()}>
                      Print Form
                    </button>
                  </div>
                ) : null}

                {st === 'rejected' ? (
                  <div className="hod-banner rejected">
                    <div className="hod-banner-text">
                      <div className="hod-banner-title">Booking Rejected</div>
                      {grp.rejection_reason ? (
                        <div className="hod-banner-sub">
                          <strong>Reason:</strong> {grp.rejection_reason}
                        </div>
                      ) : null}
                      <div className="hod-banner-sub" style={{ marginTop: 6 }}>
                        Please contact your department office or{' '}
                        <Link to="/student/exam-booking-form" style={{ color: '#b91c1c', fontWeight: 700 }}>
                          submit a new booking
                        </Link>
                        .
                      </div>
                    </div>
                  </div>
                ) : null}

                <div style={{ overflowX: 'auto' }}>
                  <table className="units-tbl">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}>#</th>
                        <th>Unit of Competency</th>
                        <th>Attempt Type</th>
                        <th>Unit Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grp.bookings.map((b, idx) => {
                        const unit = (b.units as Row) || {}
                        const at = String(b.attempt_type || 'first_attempt')
                        const al = attemptLabel(at)
                        const purpose = String(b.purpose || '')
                        const unitType = purpose.split('—')[0]?.trim() || '—'
                        return (
                          <tr key={String(b.id)}>
                            <td style={{ color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>{idx + 1}</td>
                            <td>
                              <div className="unit-nm">{String(unit.name || '—')}</div>
                              {unit.code ? <span className="unit-cd">{String(unit.code)}</span> : null}
                            </td>
                            <td>
                              <span className={`at-badge ${al.cls}`}>{al.text}</span>
                            </td>
                            <td style={{ fontSize: 12.5, color: '#64748b' }}>{unitType}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })
        )}
      </div>
    </PortalShell>
  )
}
