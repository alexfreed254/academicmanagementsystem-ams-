/**
 * My Attachment Marks — port of templates/student/attachment_marks.html
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, getApiErrorMessage } from '@/lib/apiClient'
import { PortalShell } from '@/layouts/PortalShell'
import { ErrorState, PageSkeleton } from '@/components/ui/States'
import type { Row } from '@/api/portals'
import './attachment-marks.css'

type Payload = {
  attachments: Row[]
  config: Record<string, number>
}

function gradeFromTotal(total: number, explicit?: string) {
  if (explicit) return explicit
  if (total >= 80) return 'M'
  if (total >= 65) return 'P'
  if (total >= 50) return 'C'
  return 'NYC'
}

const COMPS: { label: string; hint: string; scoreKey: string; weightKey: string; bar: string }[] = [
  { label: 'GPS Attendance', hint: 'Geofenced daily check-in records', scoreKey: 'score_gps_attendance', weightKey: 'weight_gps_attendance', bar: 'bar-gps' },
  { label: 'Digital Logbook', hint: 'Quality & completeness of entries', scoreKey: 'score_logbook', weightKey: 'weight_logbook', bar: 'bar-log' },
  { label: 'Mentor Evaluation', hint: 'Score from industry supervisor', scoreKey: 'score_mentor_eval', weightKey: 'weight_mentor_eval', bar: 'bar-men' },
  { label: 'Trainer Assessment', hint: 'Institute trainer assessment', scoreKey: 'score_trainer_assessment', weightKey: 'weight_trainer_assessment', bar: 'bar-tra' },
  { label: 'Final Report', hint: 'Quality of your written report', scoreKey: 'score_final_report', weightKey: 'weight_final_report', bar: 'bar-rep' },
]

export default function AttachmentMarksPage() {
  const q = useQuery({
    queryKey: ['student-attachment-marks'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/student/attachment-marks')
      return data.data as Payload
    },
  })

  if (q.isLoading) {
    return (
      <PortalShell title="My Attachment Marks">
        <PageSkeleton />
      </PortalShell>
    )
  }
  if (q.isError || !q.data) {
    return (
      <PortalShell title="My Attachment Marks">
        <div className="p-6">
          <ErrorState message={getApiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
        </div>
      </PortalShell>
    )
  }

  const attachments = q.data.attachments || []
  const config = q.data.config || {}

  return (
    <PortalShell title="My Attachment Marks">
      <div className="mam-wrap">
        <div className="mam-hero">
          <h1>My Attachment Marks</h1>
          <p>View your industrial attachment performance grades as entered by your department.</p>
        </div>

        {!attachments.length ? (
          <div className="no-att">
            <h3>No Attachment Record Found</h3>
            <p>You have not yet registered an industrial attachment placement.</p>
            <Link to="/student/industrial-attachment" className="btn-go">
              Register Placement
            </Link>
          </div>
        ) : (
          attachments.map((a) => {
            const g = (a._grade as Row) || null
            const co = (a.companies as Row) || {}
            const attStatus = String(a.status || 'pending').toLowerCase()
            const total = g?.weighted_total != null ? Number(g.weighted_total) : null
            const grade = total != null ? gradeFromTotal(total, String(g?.final_grade || '')) : null

            return (
              <div key={String(a.id)} className="grade-card">
                <div className="grade-card-head">
                  <h2>{String(co.name || 'Company')}</h2>
                  <div className="att-meta">
                    {co.city ? <span>{String(co.city)}</span> : null}
                    {a.start_date ? (
                      <span>
                        {String(a.start_date)}
                        {a.end_date ? ` → ${String(a.end_date)}` : ''}
                      </span>
                    ) : null}
                    <span className={`status-pill sp-${attStatus === 'active' ? 'active' : attStatus === 'completed' ? 'completed' : 'pending'}`}>
                      {attStatus}
                    </span>
                  </div>
                </div>

                {g && total != null ? (
                  <>
                    <div className="result-band">
                      <div className="result-total">
                        <div className="result-total-num">
                          {total.toFixed(1)} / 100 ({total.toFixed(1)}%)
                        </div>
                        <div className="result-total-lbl">Overall Total Score</div>
                      </div>
                      <div className="result-grade">
                        <div className={`big-grade grade-${grade}`}>{grade}</div>
                        <div className="big-grade-lbl">Final Grade</div>
                      </div>
                      <div className="result-remark">
                        {grade === 'M' ? (
                          <>
                            <div className="remark-text" style={{ color: '#15803d' }}>Merit — Excellent</div>
                            <div className="remark-sub">Outstanding performance during your attachment.</div>
                          </>
                        ) : grade === 'P' ? (
                          <>
                            <div className="remark-text" style={{ color: '#1d4ed8' }}>Pass — Very Good</div>
                            <div className="remark-sub">Good performance. You demonstrated competence.</div>
                          </>
                        ) : grade === 'C' ? (
                          <>
                            <div className="remark-text" style={{ color: '#a16207' }}>Credit — Satisfactory</div>
                            <div className="remark-sub">You met the minimum competency requirements.</div>
                          </>
                        ) : (
                          <>
                            <div className="remark-text" style={{ color: '#dc2626' }}>NYC — Needs Improvement</div>
                            <div className="remark-sub">Speak to your trainer for guidance.</div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="components-body">
                      <div className="components-title">Score Breakdown by Component</div>
                      {COMPS.map((c) => {
                        const wt = Number(config[c.weightKey] ?? 10)
                        const score = g[c.scoreKey] != null ? Number(g[c.scoreKey]) : null
                        const pct = score != null && wt ? Math.min((score / wt) * 100, 100) : 0
                        return (
                          <div key={c.scoreKey} className="comp-row">
                            <div className="comp-label">
                              {c.label}
                              <small>{c.hint}</small>
                            </div>
                            <div className="comp-bar-wrap">
                              {score != null ? <div className={`comp-bar ${c.bar}`} style={{ width: `${pct}%` }} /> : null}
                            </div>
                            {score != null ? (
                              <div className="comp-score">
                                {score.toFixed(1)} / {wt}
                              </div>
                            ) : (
                              <div className="comp-nd">—</div>
                            )}
                            <div className="comp-wt">/{wt}</div>
                          </div>
                        )
                      })}
                      <div className="weight-info">
                        <span className="weight-info-title">Grade key:</span>
                        <span className="wt-tag">M ≥ 80%</span>
                        <span className="wt-tag">P ≥ 65%</span>
                        <span className="wt-tag">C ≥ 50%</span>
                        <span className="wt-tag">NYC &lt; 50%</span>
                        {g.graded_at ? (
                          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b' }}>
                            Graded {String(g.graded_at).slice(0, 10)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="pending-card">
                    <h3>Marks Not Yet Entered</h3>
                    <p>
                      Your department has not yet entered marks for this attachment.
                      <br />
                      Check back after your attachment period ends.
                    </p>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </PortalShell>
  )
}
