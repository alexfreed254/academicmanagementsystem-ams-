/**
 * Trainee Exam Booking Form 1A — React port of templates/student/exam_booking_new.html
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, getApiErrorMessage } from '@/lib/apiClient'
import { postAction } from '@/api/mutations'
import { PortalShell } from '@/layouts/PortalShell'
import { ErrorState, PageSkeleton } from '@/components/ui/States'
import { StatusPill } from '@/pages/shared/ApiTablePage'
import type { Row } from '@/api/portals'
import './exam-booking-new.css'

type DocKey =
  | 'national_id'
  | 'birth_certificate'
  | 'kcse_certificate'
  | 'passport_photo'
  | 'most_recent_result_slip'
  | 'admission_letter'

const DOC_META: { key: DocKey; label: string; required: boolean }[] = [
  { key: 'national_id', label: 'National ID / Passport', required: true },
  { key: 'birth_certificate', label: 'Birth Certificate', required: true },
  { key: 'kcse_certificate', label: 'KCSE Certificate', required: true },
  { key: 'passport_photo', label: 'Passport Photo', required: true },
  { key: 'most_recent_result_slip', label: 'Recent Result Slip', required: false },
  { key: 'admission_letter', label: 'Admission Letter', required: false },
]

type FormPayload = {
  student: Row
  course_name: string
  department_name: string
  units: Row[]
  marks_by_unit: Record<string, Row>
  documents: Record<string, Row>
  missing_documents: boolean
  can_download: boolean
  existing_bookings: Row[]
}

function inferUnitType(code: string): string {
  const raw = String(code || '')
    .trim()
    .toUpperCase()
  if (!raw) return 'Core'
  const normalized = raw.replace(/[^A-Z0-9]+/g, '/').replace(/^\/+|\/+$/g, '')
  if (/(^|\/)CC(\/|$|\d)/.test(normalized)) return 'Common'
  if (/(^|\/)BC(\/|$|\d)/.test(normalized)) return 'Basic'
  if (/(^|\/)CR(\/|$|\d)/.test(normalized)) return 'Core'
  return 'Core'
}

export default function ExamBookingNewPage() {
  const qc = useQueryClient()
  const year = new Date().getFullYear()

  const formQ = useQuery({
    queryKey: ['exam-booking-form-1a'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/student/exam-booking-form')
      return data.data as FormPayload
    },
  })

  const student = formQ.data?.student || {}
  const [gender, setGender] = useState('')
  const [dob, setDob] = useState('')
  const [mobile, setMobile] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [pwdStatus, setPwdStatus] = useState('N/A')
  const [moduleLevel, setModuleLevel] = useState('')
  const [examYear, setExamYear] = useState(String(year))
  const [examSeries, setExamSeries] = useState('')
  const [term, setTerm] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [attempts, setAttempts] = useState<Record<string, string>>({})
  const [costs, setCosts] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const prefilled = useRef(false)

  useEffect(() => {
    if (!formQ.data || prefilled.current) return
    prefilled.current = true
    const s = formQ.data.student || {}
    if (s.gender) setGender(String(s.gender))
    if (s.date_of_birth) setDob(String(s.date_of_birth).slice(0, 10))
    if (s.mobile_number) setMobile(String(s.mobile_number))
    if (s.national_id_no) setNationalId(String(s.national_id_no))
    if (s.pwd_status) setPwdStatus(String(s.pwd_status))
    if (s.level) setModuleLevel(String(s.level))

    const nextAttempts: Record<string, string> = {}
    const nextCosts: Record<string, string> = {}
    for (const row of formQ.data.units || []) {
      const unit = (row.units as Row) || {}
      const id = String(unit.id || '')
      if (!id) continue
      const prev = formQ.data.marks_by_unit?.[id]
      nextAttempts[id] = prev && String(prev.grade) === 'NYC' ? 'retake' : 'first_attempt'
      if (unit.unit_cost != null) nextCosts[id] = String(unit.unit_cost)
    }
    setAttempts(nextAttempts)
    setCosts(nextCosts)
  }, [formQ.data])

  const selectedCount = Object.values(selected).filter(Boolean).length
  const missingDocs = Boolean(formQ.data?.missing_documents)
  const totalCost = useMemo(() => {
    let t = 0
    for (const [id, on] of Object.entries(selected)) {
      if (!on) continue
      t += Number(costs[id] || 0) || 0
    }
    return t
  }, [selected, costs])

  const submit = useMutation({
    mutationFn: async () => {
      const selectedUnits = Object.entries(selected)
        .filter(([, on]) => on)
        .map(([id]) => id)
      const unitTypes: Record<string, string> = {}
      for (const row of formQ.data?.units || []) {
        const unit = (row.units as Row) || {}
        const id = String(unit.id || '')
        if (!id) continue
        unitTypes[id] = String(unit.inferred_type || inferUnitType(String(unit.code || '')))
      }
      return postAction('/student/exam-bookings', {
        selected_units: selectedUnits,
        exam_year: examYear,
        exam_series: examSeries,
        term,
        module_level: moduleLevel,
        gender,
        date_of_birth: dob,
        mobile_number: mobile,
        national_id_no: nationalId,
        pwd_status: pwdStatus,
        attempt_types: attempts,
        unit_costs: costs,
        unit_types: unitTypes,
      })
    },
    onSuccess: (res) => {
      const payload = (res as { data?: { serial_number?: string } })?.data
      const serial = payload?.serial_number
      setMsg(serial ? `Exam booking submitted (${serial}). Awaiting HOD approval.` : 'Exam booking submitted.')
      setErr(null)
      setSelected({})
      void qc.invalidateQueries({ queryKey: ['exam-booking-form-1a'] })
      void qc.invalidateQueries({ queryKey: ['portal-table', '/student/exam-bookings'] })
    },
    onError: (e) => {
      setErr(getApiErrorMessage(e))
      setMsg(null)
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (missingDocs) {
      setErr('Upload missing required documents before submitting.')
      return
    }
    if (selectedCount === 0) {
      setErr('Please select at least one unit of competency.')
      return
    }
    if (!examSeries || !term || !moduleLevel || !gender || !dob || !mobile || !nationalId) {
      setErr('Please complete all required fields.')
      return
    }
    submit.mutate()
  }

  if (formQ.isLoading) {
    return (
      <PortalShell title="Exam Booking — Form 1A">
        <PageSkeleton />
      </PortalShell>
    )
  }
  if (formQ.isError || !formQ.data) {
    return (
      <PortalShell title="Exam Booking — Form 1A">
        <div className="p-6">
          <ErrorState message={getApiErrorMessage(formQ.error)} onRetry={() => void formQ.refetch()} />
        </div>
      </PortalShell>
    )
  }

  const data = formQ.data
  const units = data.units || []
  const docs = data.documents || {}
  const bookings = data.existing_bookings || []

  let bannerClass = 'warn'
  let bannerTitle = 'Select Units to Continue'
  let bannerMsg = 'Select at least one unit of competency from the table above.'
  let canSubmit = false
  if (missingDocs) {
    bannerClass = 'missing'
    bannerTitle = 'Missing Required Documents'
    bannerMsg = 'Upload missing documents from My Documents before submitting.'
  } else if (selectedCount > 0) {
    bannerClass = 'ready'
    bannerTitle = `Ready — ${selectedCount} unit(s) selected`
    bannerMsg = 'Complete the form fields and click Submit to create your Form 1A booking.'
    canSubmit = true
  }

  return (
    <PortalShell title="Exam Booking — TTTI/EXAMS/CDACC/REG/1A">
      <div className="ebf-wrap">
        <div className="stepper">
          <div className="step done">
            <div className="step-num">✓</div>
            <div className="step-label">
              Profile
              <br />
              Verified
            </div>
          </div>
          <div className={`step ${missingDocs ? 'active' : 'done'}`}>
            <div className="step-num">{missingDocs ? '2' : '✓'}</div>
            <div className="step-label">
              Documents
              <br />
              Check
            </div>
          </div>
          <div className="step active">
            <div className="step-num">3</div>
            <div className="step-label">
              Fill &amp;
              <br />
              Select Units
            </div>
          </div>
          <div className="step">
            <div className="step-num">4</div>
            <div className="step-label">
              Submit
              <br />
              Booking
            </div>
          </div>
        </div>

        <div className="form-header">
          <img src="/THIKATTILOGO.jpg" alt="TTTI Logo" />
          <div className="form-header-text">
            <h1>Thika Technical Training Institute</h1>
            <h2>Regular Candidate Assessment Registration Form 1A</h2>
            <div className="ref">Reference: TTTI/EXAMS/CDACC/REG/1A</div>
          </div>
        </div>

        <div className="instructions-box">
          <h3>Instructions</h3>
          <ul>
            <li>Ensure your profile is complete before filling this form.</li>
            <li>
              All fields marked <strong style={{ color: '#dc2626' }}>*</strong> are required.
            </li>
            <li>Select all units of competency you are registering for.</li>
            <li>Submit the form to your HOD for departmental clearance before the deadline.</li>
          </ul>
        </div>

        {msg ? <div className="ebf-alert ok">{msg}</div> : null}
        {err ? <div className="ebf-alert bad">{err}</div> : null}

        <form id="ebf" onSubmit={onSubmit}>
          <div className="form-section">
            <div className="form-section-head">Section 1: Candidate Details</div>
            <div className="form-section-body">
              <div className="field-grid" style={{ marginBottom: 16 }}>
                <div className="form-field">
                  <label className="form-label">Full Name (as per ID)*</label>
                  <input className="form-input prefilled" readOnly value={String(student.full_name || '')} />
                </div>
                <div className="form-field">
                  <label className="form-label">Admission Number*</label>
                  <input className="form-input prefilled" readOnly value={String(student.admission_no || '')} />
                </div>
                <div className="form-field">
                  <label className="form-label">Gender*</label>
                  <select className="form-select" required value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="">-- Select Gender --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Date of Birth*</label>
                  <input className="form-input" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} />
                </div>
                <div className="form-field">
                  <label className="form-label">Mobile Number*</label>
                  <input
                    className="form-input"
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. 0712345678"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Email Address*</label>
                  <input className="form-input prefilled" readOnly value={String(student.email || '')} />
                </div>
                <div className="form-field">
                  <label className="form-label">National ID / Birth Cert No.*</label>
                  <input
                    className="form-input"
                    required
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">PWD Status</label>
                  <select className="form-select" value={pwdStatus} onChange={(e) => setPwdStatus(e.target.value)}>
                    <option value="N/A">N/A — Not Applicable</option>
                    <option value="Visual Impairment">Visual Impairment</option>
                    <option value="Hearing Impairment">Hearing Impairment</option>
                    <option value="Physical Disability">Physical Disability</option>
                    <option value="Learning Difficulty">Learning Difficulty</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="field-grid three">
                <div className="form-field">
                  <label className="form-label">Course Name*</label>
                  <input className="form-input prefilled" readOnly value={data.course_name || ''} />
                </div>
                <div className="form-field">
                  <label className="form-label">Department</label>
                  <input className="form-input prefilled" readOnly value={data.department_name || ''} />
                </div>
                <div className="form-field">
                  <label className="form-label">Module / Level / TEP*</label>
                  <input
                    className="form-input"
                    required
                    value={moduleLevel}
                    onChange={(e) => setModuleLevel(e.target.value)}
                    placeholder="e.g. Module I, Level 3"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-head">Section 2: Examination Period</div>
            <div className="form-section-body">
              <div className="field-grid three">
                <div className="form-field">
                  <label className="form-label">Exam Year*</label>
                  <select className="form-select" required value={examYear} onChange={(e) => setExamYear(e.target.value)}>
                    <option value={String(year)}>{year}</option>
                    <option value={String(year + 1)}>{year + 1}</option>
                    <option value={String(year - 1)}>{year - 1}</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Exam Series*</label>
                  <select className="form-select" required value={examSeries} onChange={(e) => setExamSeries(e.target.value)}>
                    <option value="">-- Select Series --</option>
                    <option value="1">MARCH</option>
                    <option value="2">JULY</option>
                    <option value="3">NOVEMBER</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Term*</label>
                  <select className="form-select" required value={term} onChange={(e) => setTerm(e.target.value)}>
                    <option value="">-- Select Term --</option>
                    <option value="1">Term 1</option>
                    <option value="2">Term 2</option>
                    <option value="3">Term 3</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-head">Section 3: Required Attachments Verification</div>
            <div className="form-section-body">
              <div className="docs-grid">
                {DOC_META.map((d) => {
                  const doc = docs[d.key]
                  const has = Boolean(doc)
                  const cls = has ? 'ok' : d.required ? 'miss' : 'warn'
                  return (
                    <div key={d.key} className={`doc-card ${cls}`}>
                      <div className="doc-card-body">
                        <div className="doc-name">
                          {d.label}
                          {d.required ? <span style={{ color: '#dc2626' }}> *</span> : null}
                        </div>
                        <div className="doc-status">
                          {has ? 'Uploaded' : d.required ? 'Missing — required' : 'Not uploaded'}
                        </div>
                        {has && doc?.file_name ? <div className="doc-file-name">{String(doc.file_name)}</div> : null}
                        {has && doc?.file_url ? (
                          <a className="btn-doc-view" href={String(doc.file_url)} target="_blank" rel="noreferrer">
                            View Document
                          </a>
                        ) : (
                          <Link className="btn-doc-view" to="/student/documents">
                            Upload Now
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              {missingDocs ? (
                <div className="missing-warning" style={{ marginTop: 16 }}>
                  Some required documents are missing.{' '}
                  <Link to="/student/documents" style={{ color: '#dc2626', fontWeight: 700 }}>
                    Upload Missing Documents →
                  </Link>
                </div>
              ) : (
                <div style={{ marginTop: 14, color: '#15803d', fontWeight: 600, fontSize: 12.5 }}>
                  All required documents are on file.
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-head">
              Section 4: Units of Competency Registration
              <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.75, fontWeight: 500 }}>
                Select all units you are registering for
              </span>
            </div>
            <div className="form-section-body" style={{ padding: 0 }}>
              {units.length ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="units-table">
                    <thead>
                      <tr>
                        <th style={{ width: 44, textAlign: 'center' }}>Select</th>
                        <th style={{ width: 40, textAlign: 'center' }}>S/N</th>
                        <th>Unit of Competency</th>
                        <th style={{ width: 160 }}>Unit Type</th>
                        <th style={{ width: 110 }}>Unit Cost (Ksh)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {units.map((row, idx) => {
                        const unit = (row.units as Row) || {}
                        const id = String(unit.id || '')
                        const utype = String(unit.inferred_type || inferUnitType(String(unit.code || '')))
                        const prev = data.marks_by_unit?.[id]
                        const on = Boolean(selected[id])
                        return (
                          <tr key={id} style={{ background: on ? '#eff6ff' : undefined }}>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                className="unit-cb"
                                type="checkbox"
                                checked={on}
                                onChange={(e) => setSelected((s) => ({ ...s, [id]: e.target.checked }))}
                              />
                            </td>
                            <td style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>{idx + 1}</td>
                            <td>
                              <div className="unit-name">{String(unit.name || '')}</div>
                              <span className="unit-code-tag">{String(unit.code || '')}</span>
                              {prev ? (
                                <div className="prev-result">
                                  Last result: <strong>{String(prev.grade || '—')}</strong>{' '}
                                  {String(prev.marks_obtained ?? '—')}% · Term {String(prev.term)}/{String(prev.year)}
                                </div>
                              ) : null}
                              <div className="attempt-type-group">
                                {[
                                  ['first_attempt', 'First Attempt'],
                                  ['retake', 'Retake — NYC/Fail'],
                                  ['missing_unit', 'Missed Unit'],
                                ].map(([val, label]) => (
                                  <label key={val} className="at-label">
                                    <input
                                      type="radio"
                                      name={`attempt_${id}`}
                                      checked={(attempts[id] || 'first_attempt') === val}
                                      onChange={() => setAttempts((a) => ({ ...a, [id]: val }))}
                                    />
                                    <span className={`at-chip at-${val === 'first_attempt' ? 'first' : val === 'retake' ? 'retake' : 'missing'}`}>
                                      {label}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </td>
                            <td>
                              <div className="type-radio">
                                {['Core', 'Common', 'Basic'].map((t) => (
                                  <label key={t} className={utype === t ? 'is-active' : ''}>
                                    {t}
                                  </label>
                                ))}
                              </div>
                              <div className="unit-type-hint">Auto-filled from unit code</div>
                            </td>
                            <td>
                              <input
                                className="cost-input form-input"
                                type="number"
                                min={0}
                                step="0.01"
                                value={costs[id] ?? ''}
                                onChange={(e) => setCosts((c) => ({ ...c, [id]: e.target.value }))}
                                placeholder="0.00"
                              />
                            </td>
                          </tr>
                        )
                      })}
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan={4} style={{ textAlign: 'right', padding: '12px 14px', fontWeight: 700 }}>
                          Total Cost (Ksh):
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <input
                            className="cost-input form-input"
                            readOnly
                            value={totalCost > 0 ? totalCost.toFixed(2) : ''}
                            placeholder="—"
                            style={{ fontWeight: 700, background: '#f0f9ff', borderColor: '#bae6fd' }}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>No Units Available</div>
                  <div style={{ fontSize: 13 }}>
                    You are not enrolled in any class with assigned units. Contact your department administrator.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={`status-banner ${bannerClass}`}>
            <div>
              <div className="sb-title">{bannerTitle}</div>
              <div className="sb-msg">{bannerMsg}</div>
            </div>
          </div>

          <div className="form-actions">
            <Link to="/student/documents" className="btn-preview">
              My Documents
            </Link>
            <button type="submit" className="btn-submit" disabled={!canSubmit || submit.isPending || !units.length}>
              {submit.isPending ? 'Submitting…' : 'Submit Form 1A Booking'}
            </button>
          </div>
          <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 14 }}>
            After submitting, your booking is sent to your HOD for departmental clearance.
          </p>
        </form>

        <div className="form-section" style={{ marginTop: 32 }}>
          <div className="form-section-head">
            My Exam Bookings
            <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.75 }}>{bookings.length} booking(s) on record</span>
          </div>
          <div style={{ padding: 0 }}>
            {bookings.length ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="units-table">
                  <thead>
                    <tr>
                      <th>Unit</th>
                      <th>Session / Series</th>
                      <th>Serial No.</th>
                      <th>Submitted</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => {
                      const unit = (b.units as Row) || {}
                      return (
                        <tr key={String(b.id)}>
                          <td>
                            <div className="unit-name">{String(unit.name || '—')}</div>
                            <span className="unit-code-tag">{String(unit.code || '—')}</span>
                          </td>
                          <td>{String(b.exam_session || '—')}</td>
                          <td>
                            <code style={{ fontSize: 11.5, background: '#f1f5f9', color: '#1e5a9f', padding: '3px 8px', borderRadius: 6 }}>
                              {String(b.serial_number || '—')}
                            </code>
                          </td>
                          <td>{String(b.created_at || '').slice(0, 10)}</td>
                          <td>
                            <StatusPill value={b.status} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 24px', color: '#94a3b8' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>No Exam Bookings Yet</div>
                <div style={{ fontSize: 13 }}>Complete the form above and submit to create your first exam booking.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PortalShell>
  )
}
