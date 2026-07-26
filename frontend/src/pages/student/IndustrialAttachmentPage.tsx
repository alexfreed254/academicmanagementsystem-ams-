/**
 * Industrial Attachment — React port of templates/student/industrial_attachment.html
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, getApiErrorMessage } from '@/lib/apiClient'
import { postAction } from '@/api/mutations'
import { fileToBase64 } from '@/components/detail/DetailShell'
import { PortalShell } from '@/layouts/PortalShell'
import { ErrorState, PageSkeleton } from '@/components/ui/States'
import type { Row } from '@/api/portals'
import './industrial-attachment.css'

const INDUSTRIES = [
  'Electrical Engineering',
  'Mechanical Engineering',
  'Information Technology',
  'Civil Engineering',
  'Automotive Engineering',
  'Hospitality',
  'Business Management',
  'Health Sciences',
  'Agriculture',
  'Construction',
  'Manufacturing',
  'Other',
]

type Payload = {
  current_attachment: Row | null
  all_attachments: Row[]
  course_name: string
  profile: Row
  today_logs: Row[]
  open_period: Row | null
  can_submit_placement: boolean
  submit_block_msg: string
}

type FilePayload = { file_name: string; file_base64: string; content_type: string } | null

async function toFilePayload(file: File | null): Promise<FilePayload> {
  if (!file) return null
  return {
    file_name: file.name,
    file_base64: await fileToBase64(file),
    content_type: file.type || 'application/octet-stream',
  }
}

export default function IndustrialAttachmentPage() {
  const qc = useQueryClient()
  const year = new Date().getFullYear()
  const q = useQuery({
    queryKey: ['student-industrial-attachment'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/student/industrial-attachment')
      return data.data as Payload
    },
  })

  const profile = q.data?.profile || {}
  const [termFilter, setTermFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [form, setForm] = useState({
    attachment_term: '',
    attachment_year: String(year),
    mobile_number: '',
    company_name: '',
    industry: '',
    company_department: '',
    company_address: '',
    county: '',
    town: '',
    company_email: '',
    company_phone: '',
    website: '',
    supervisor_name: '',
    supervisor_position: '',
    supervisor_contact: '',
    supervisor_email: '',
    start_date: '',
    end_date: '',
    expected_working_hours: '',
    latitude: '',
    longitude: '',
  })
  const [acceptance, setAcceptance] = useState<File | null>(null)
  const [offer, setOffer] = useState<File | null>(null)
  const [intro, setIntro] = useState<File | null>(null)
  const [stamp, setStamp] = useState<File | null>(null)
  const [signed, setSigned] = useState<File | null>(null)

  const [gpsLat, setGpsLat] = useState('')
  const [gpsLng, setGpsLng] = useState('')
  const [gpsStatus, setGpsStatus] = useState('')

  useEffect(() => {
    if (q.data?.profile?.mobile_number) {
      setForm((f) => (f.mobile_number ? f : { ...f, mobile_number: String(q.data!.profile.mobile_number) }))
    }
  }, [q.data])

  const years = useMemo(() => {
    const set = new Set<string>()
    for (const a of q.data?.all_attachments || []) {
      if (a.attachment_year != null) set.add(String(a.attachment_year))
    }
    return [...set]
  }, [q.data])

  const filtered = useMemo(() => {
    return (q.data?.all_attachments || []).filter((a) => {
      if (termFilter && String(a.attachment_term || '') !== termFilter) return false
      if (yearFilter && String(a.attachment_year || '') !== yearFilter) return false
      return true
    })
  }, [q.data, termFilter, yearFilter])

  const submit = useMutation({
    mutationFn: async () => {
      const acceptance_letter = await toFilePayload(acceptance)
      return postAction('/student/industrial-attachment/request', {
        ...form,
        attachment_year: Number(form.attachment_year) || year,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
        acceptance_letter,
        offer_letter: await toFilePayload(offer),
        introduction_letter: await toFilePayload(intro),
        company_stamp: await toFilePayload(stamp),
        signed_acceptance_form: await toFilePayload(signed),
      })
    },
    onSuccess: () => {
      setMsg('Placement submitted successfully. The liaison officer will verify your documents.')
      setErr(null)
      setAcceptance(null)
      void qc.invalidateQueries({ queryKey: ['student-industrial-attachment'] })
    },
    onError: (e) => {
      setErr(getApiErrorMessage(e))
      setMsg(null)
    },
  })

  const del = useMutation({
    mutationFn: (id: string) => postAction(`/student/industrial-attachment/${id}/delete`, {}),
    onSuccess: () => {
      setMsg('Attachment registration deleted.')
      setErr(null)
      void qc.invalidateQueries({ queryKey: ['student-industrial-attachment'] })
    },
    onError: (e) => {
      setErr(getApiErrorMessage(e))
      setMsg(null)
    },
  })

  const checkIn = useMutation({
    mutationFn: () =>
      postAction('/student/check-in', {
        attachment_id: q.data?.current_attachment?.id,
        latitude: Number(gpsLat),
        longitude: Number(gpsLng),
      }),
    onSuccess: (res) => {
      const d = (res as { data?: { is_within_geofence?: boolean; distance_meters?: number } })?.data
      setMsg(
        d?.is_within_geofence
          ? 'Check-in successful. You are within the company geofence.'
          : `Check-in recorded but you are outside the geofence (${d?.distance_meters ?? '?'}m from company).`,
      )
      setErr(null)
      void qc.invalidateQueries({ queryKey: ['student-industrial-attachment'] })
    },
    onError: (e) => {
      setErr(getApiErrorMessage(e))
      setMsg(null)
    },
  })

  const checkOut = useMutation({
    mutationFn: () => postAction('/student/check-out', { attachment_id: q.data?.current_attachment?.id }),
    onSuccess: () => {
      setMsg('Checked out successfully.')
      setErr(null)
      void qc.invalidateQueries({ queryKey: ['student-industrial-attachment'] })
    },
    onError: (e) => {
      setErr(getApiErrorMessage(e))
      setMsg(null)
    },
  })

  function autoDetect(target: 'form' | 'gps' = 'gps') {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation is not supported on this device.')
      return
    }
    setGpsStatus('Detecting location…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6)
        const lng = pos.coords.longitude.toFixed(6)
        if (target === 'gps') {
          setGpsLat(lat)
          setGpsLng(lng)
        } else {
          setForm((f) => ({ ...f, latitude: lat, longitude: lng }))
        }
        setGpsStatus(`Location captured (±${Math.round(pos.coords.accuracy)}m)`)
      },
      () => setGpsStatus('Could not detect GPS. Enter coordinates manually.'),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!acceptance) {
      setErr('Upload the company acceptance letter before submitting.')
      return
    }
    submit.mutate()
  }

  if (q.isLoading) {
    return (
      <PortalShell title="Industrial Attachment">
        <PageSkeleton />
      </PortalShell>
    )
  }
  if (q.isError || !q.data) {
    return (
      <PortalShell title="Industrial Attachment">
        <div className="p-6">
          <ErrorState message={getApiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
        </div>
      </PortalShell>
    )
  }

  const data = q.data
  const current = data.current_attachment
  const co = (current?.companies as Row) || {}
  const st = String(current?.status || 'pending')
  const letterStatus = String(current?.acceptance_letter_status || 'pending')

  return (
    <PortalShell title="Industrial Attachment">
      <div className="ia-wrap">
        {msg ? <div className="ia-alert ok">{msg}</div> : null}
        {err ? <div className="ia-alert bad">{err}</div> : null}

        {current ? (
          <div className="ia-card">
            <div className="ia-card-head">Attachment Approval Tracker</div>
            <div style={{ padding: 24 }}>
              <div className="flow-note">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                      {String(co.name || 'Current attachment')}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, maxWidth: 760 }}>
                      Your placement is verified by the <strong>Industrial Liaison Officer</strong> after you secure a
                      company externally and upload acceptance documents.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span className={`pill pill-${st}`}>{st.replace(/_/g, ' ')}</span>
                    <span className={`letter-pill ${letterStatus}`}>Letter {letterStatus}</span>
                  </div>
                </div>
                <div className="flow-steps">
                  {[
                    ['Get Company Letter', 'Receive the official acceptance letter from the host company.'],
                    ['Find Placement Externally', 'Visit companies or use referrals — not through this portal.'],
                    ['Company Accepts You', 'Obtain acceptance letter, supervisor details, and reporting date.'],
                    ['Submit Placement Here', 'Upload company details and documents for liaison verification.'],
                    ['Liaison Activates', 'After approval, GPS attendance and digital logbook are enabled.'],
                  ].map(([t, s], i) => (
                    <div key={t} className="flow-step">
                      <div className="flow-step-num">{i + 1}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 5 }}>{t}</div>
                      <div style={{ fontSize: 12.5, color: '#64748b' }}>{s}</div>
                    </div>
                  ))}
                </div>
              </div>
              {current.acceptance_letter_url ? (
                <a className="doc-link" href={String(current.acceptance_letter_url)} target="_blank" rel="noreferrer">
                  View Uploaded Acceptance Letter
                </a>
              ) : null}
              {st === 'active' ? (
                <div style={{ marginTop: 16 }}>
                  <Link to="/student/logbook" className="btn-logbook">
                    Open Digital Logbook →
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {current && st === 'active' ? (
          <div className="ia-card">
            <div className="ia-card-head">GPS Attendance — Today</div>
            <div style={{ padding: 24 }}>
              <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20, lineHeight: 1.5 }}>
                Record your daily attendance by checking in from your attachment site. GPS coordinates are captured
                automatically.
              </p>
              <div className="coords-row" style={{ marginBottom: 20 }}>
                <div className="f-field">
                  <label className="f-label">Latitude</label>
                  <input className="f-input" value={gpsLat} onChange={(e) => setGpsLat(e.target.value)} />
                </div>
                <div className="f-field">
                  <label className="f-label">Longitude</label>
                  <input className="f-input" value={gpsLng} onChange={(e) => setGpsLng(e.target.value)} />
                </div>
                <button type="button" className="btn-gps" onClick={() => autoDetect('gps')}>
                  Auto-Detect GPS
                </button>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>{gpsStatus}</div>
              <div className="checkin-btns">
                <button type="button" className="btn-checkin" disabled={checkIn.isPending} onClick={() => checkIn.mutate()}>
                  Check In
                </button>
                <button type="button" className="btn-checkout" disabled={checkOut.isPending} onClick={() => checkOut.mutate()}>
                  Check Out
                </button>
              </div>
              {data.today_logs?.length ? (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>
                    Today&apos;s Activity
                  </div>
                  {data.today_logs.map((log) => (
                    <div key={String(log.id)} className="log-row">
                      <span className="log-time">{String(log.check_in_time || '').slice(0, 16).replace('T', ' ')}</span>
                      <span>
                        {log.check_out_time ? (
                          <span className="log-status-ok">
                            Checked out {String(log.check_out_time).slice(0, 16).replace('T', ' ')}
                          </span>
                        ) : (
                          <span className="log-status-out">Active check-in</span>
                        )}
                      </span>
                      <span style={{ fontSize: 13, color: log.is_within_geofence ? '#16a34a' : '#d97706' }}>
                        {log.is_within_geofence ? 'On site' : 'Outside geofence'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="ia-card">
          <div className="ia-card-head" style={{ justifyContent: 'space-between' }}>
            <span>Attachment History</span>
            <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.85 }}>{data.all_attachments.length} record(s)</span>
          </div>
          {data.all_attachments.length ? (
            <>
              <div className="hist-filter-bar">
                <div>
                  <label>Filter by Term</label>
                  <select value={termFilter} onChange={(e) => setTermFilter(e.target.value)}>
                    <option value="">All Terms</option>
                    <option value="Jan-Apr">Jan – Apr</option>
                    <option value="May-Aug">May – Aug</option>
                    <option value="Sept-Dec">Sept – Dec</option>
                  </select>
                </div>
                <div>
                  <label>Filter by Year</label>
                  <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                    <option value="">All Years</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="button" className="hist-reset-btn" onClick={() => { setTermFilter(''); setYearFilter('') }}>
                  Reset
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="hist-table">
                  <thead>
                    <tr>
                      <th>Term</th>
                      <th>Year</th>
                      <th>Course</th>
                      <th>Company</th>
                      <th>Supervisor</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Status</th>
                      <th>Letter</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((att) => {
                      const ac = (att.companies as Row) || {}
                      const _st = String(att.status || 'pending')
                      return (
                        <tr key={String(att.id)}>
                          <td>{att.attachment_term ? <span className="term-badge">{String(att.attachment_term)}</span> : '—'}</td>
                          <td style={{ fontWeight: 600 }}>{String(att.attachment_year || '—')}</td>
                          <td style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8' }}>{data.course_name || '—'}</td>
                          <td>
                            <strong>{String(ac.name || '—')}</strong>
                          </td>
                          <td style={{ fontSize: 13 }}>
                            {String(ac.contact_person || '—')}{' '}
                            <span style={{ color: '#94a3b8', fontSize: 12 }}>{String(ac.contact_phone || '')}</span>
                          </td>
                          <td style={{ fontSize: 13 }}>{String(att.start_date || '—')}</td>
                          <td style={{ fontSize: 13 }}>{String(att.end_date || '—')}</td>
                          <td>
                            <span className={`pill pill-${_st}`}>{_st === 'pending' ? 'Submitted' : _st}</span>
                          </td>
                          <td>
                            {att.acceptance_letter_url ? (
                              <a href={String(att.acceptance_letter_url)} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>
                                Open letter
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            {_st === 'pending' ? (
                              <button
                                type="button"
                                className="btn-del"
                                title="Delete"
                                onClick={() => {
                                  if (confirm('Delete this pending registration?')) del.mutate(String(att.id))
                                }}
                              >
                                ×
                              </button>
                            ) : (
                              <button type="button" className="btn-del" disabled>
                                ×
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8' }}>
              No attachment history yet. Submit your first registration below.
            </div>
          )}
        </div>

        <div className="ia-card">
          <div className="ia-card-head">Submit Attachment Placement</div>
          <div style={{ padding: 28 }}>
            {data.open_period ? (
              <div className="ia-banner ok">
                <strong>{String(data.open_period.name || 'Period')}</strong> is open until{' '}
                {String(data.open_period.application_closes || '—')}.
                {data.open_period.introduction_letter_url ? (
                  <>
                    {' '}
                    <a href={String(data.open_period.introduction_letter_url)} target="_blank" rel="noreferrer">
                      Download introduction letter
                    </a>
                  </>
                ) : null}
              </div>
            ) : null}
            {!data.can_submit_placement ? (
              <div className="ia-banner bad">{data.submit_block_msg || 'Placement submission is not available right now.'}</div>
            ) : (
              <>
                <div className="ia-banner info">
                  You find your own placement outside the institute. After the company accepts you, submit their details
                  and upload your acceptance letter here.
                </div>
                <form onSubmit={onSubmit}>
                  <div className="form-section-hdr">Scope / Period</div>
                  <div className="form-grid" style={{ marginBottom: 24 }}>
                    <div className="f-field">
                      <label className="f-label">Attachment Term *</label>
                      <select
                        className="f-select"
                        required
                        value={form.attachment_term}
                        onChange={(e) => setForm((f) => ({ ...f, attachment_term: e.target.value }))}
                      >
                        <option value="">— Select Term —</option>
                        <option value="Jan-Apr">January – April</option>
                        <option value="May-Aug">May – August</option>
                        <option value="Sept-Dec">September – December</option>
                      </select>
                    </div>
                    <div className="f-field">
                      <label className="f-label">Attachment Year *</label>
                      <input
                        className="f-input"
                        type="number"
                        required
                        value={form.attachment_year}
                        onChange={(e) => setForm((f) => ({ ...f, attachment_year: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-section-hdr">Personal Details</div>
                  <div className="form-grid three" style={{ marginBottom: 24 }}>
                    <div className="f-field">
                      <label className="f-label">Full Name</label>
                      <input className="f-input" readOnly value={String(profile.full_name || '')} />
                    </div>
                    <div className="f-field">
                      <label className="f-label">Admission No.</label>
                      <input className="f-input" readOnly value={String(profile.admission_no || '')} />
                    </div>
                    <div className="f-field">
                      <label className="f-label">Mobile Number *</label>
                      <input
                        className="f-input"
                        required
                        value={form.mobile_number}
                        onChange={(e) => setForm((f) => ({ ...f, mobile_number: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-section-hdr">Company / Workplace Details</div>
                  <div className="form-grid three" style={{ marginBottom: 24 }}>
                    <div className="f-field">
                      <label className="f-label">Company Name *</label>
                      <input className="f-input" required value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} />
                    </div>
                    <div className="f-field">
                      <label className="f-label">Industry *</label>
                      <select className="f-select" required value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}>
                        <option value="">— Select —</option>
                        {INDUSTRIES.map((i) => (
                          <option key={i} value={i}>
                            {i}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="f-field">
                      <label className="f-label">Company Department</label>
                      <input className="f-input" value={form.company_department} onChange={(e) => setForm((f) => ({ ...f, company_department: e.target.value }))} />
                    </div>
                    <div className="f-field" style={{ gridColumn: '1 / -1' }}>
                      <label className="f-label">Company Address *</label>
                      <input className="f-input" required value={form.company_address} onChange={(e) => setForm((f) => ({ ...f, company_address: e.target.value }))} />
                    </div>
                    <div className="f-field">
                      <label className="f-label">County *</label>
                      <input className="f-input" required value={form.county} onChange={(e) => setForm((f) => ({ ...f, county: e.target.value }))} />
                    </div>
                    <div className="f-field">
                      <label className="f-label">Town *</label>
                      <input className="f-input" required value={form.town} onChange={(e) => setForm((f) => ({ ...f, town: e.target.value }))} />
                    </div>
                    <div className="f-field">
                      <label className="f-label">Company Phone</label>
                      <input className="f-input" value={form.company_phone} onChange={(e) => setForm((f) => ({ ...f, company_phone: e.target.value }))} />
                    </div>
                    <div className="f-field">
                      <label className="f-label">Company Email</label>
                      <input className="f-input" type="email" value={form.company_email} onChange={(e) => setForm((f) => ({ ...f, company_email: e.target.value }))} />
                    </div>
                    <div className="f-field">
                      <label className="f-label">Website</label>
                      <input className="f-input" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
                    </div>
                  </div>

                  <div className="form-section-hdr">Supervisor Details</div>
                  <div className="form-grid" style={{ marginBottom: 24 }}>
                    <div className="f-field">
                      <label className="f-label">Supervisor Name *</label>
                      <input className="f-input" required value={form.supervisor_name} onChange={(e) => setForm((f) => ({ ...f, supervisor_name: e.target.value }))} />
                    </div>
                    <div className="f-field">
                      <label className="f-label">Position *</label>
                      <input className="f-input" required value={form.supervisor_position} onChange={(e) => setForm((f) => ({ ...f, supervisor_position: e.target.value }))} />
                    </div>
                    <div className="f-field">
                      <label className="f-label">Contact *</label>
                      <input className="f-input" required value={form.supervisor_contact} onChange={(e) => setForm((f) => ({ ...f, supervisor_contact: e.target.value }))} />
                    </div>
                    <div className="f-field">
                      <label className="f-label">Email</label>
                      <input className="f-input" type="email" value={form.supervisor_email} onChange={(e) => setForm((f) => ({ ...f, supervisor_email: e.target.value }))} />
                    </div>
                  </div>

                  <div className="form-section-hdr">Dates & Hours</div>
                  <div className="form-grid three" style={{ marginBottom: 24 }}>
                    <div className="f-field">
                      <label className="f-label">Start Date *</label>
                      <input className="f-input" type="date" required value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
                    </div>
                    <div className="f-field">
                      <label className="f-label">End Date *</label>
                      <input className="f-input" type="date" required value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
                    </div>
                    <div className="f-field">
                      <label className="f-label">Expected Working Hours</label>
                      <input className="f-input" value={form.expected_working_hours} onChange={(e) => setForm((f) => ({ ...f, expected_working_hours: e.target.value }))} placeholder="e.g. 8:00–17:00" />
                    </div>
                  </div>

                  <div className="form-section-hdr">Company GPS Location</div>
                  <div className="coords-row" style={{ marginBottom: 24 }}>
                    <div className="f-field">
                      <label className="f-label">Latitude</label>
                      <input className="f-input" value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} />
                    </div>
                    <div className="f-field">
                      <label className="f-label">Longitude</label>
                      <input className="f-input" value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} />
                    </div>
                    <button type="button" className="btn-gps" onClick={() => autoDetect('form')}>
                      Auto-Detect GPS
                    </button>
                  </div>

                  <div className="form-section-hdr">Documents</div>
                  <div className="form-grid" style={{ marginBottom: 24 }}>
                    <div className="f-field">
                      <label className="f-label">Acceptance Letter *</label>
                      <input className="f-input" type="file" accept=".pdf,.jpg,.jpeg,.png" required onChange={(e) => setAcceptance(e.target.files?.[0] || null)} />
                    </div>
                    <div className="f-field">
                      <label className="f-label">Offer Letter</label>
                      <input className="f-input" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setOffer(e.target.files?.[0] || null)} />
                    </div>
                    <div className="f-field">
                      <label className="f-label">Introduction Letter</label>
                      <input className="f-input" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setIntro(e.target.files?.[0] || null)} />
                    </div>
                    <div className="f-field">
                      <label className="f-label">Company Stamp</label>
                      <input className="f-input" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setStamp(e.target.files?.[0] || null)} />
                    </div>
                    <div className="f-field">
                      <label className="f-label">Signed Acceptance Form</label>
                      <input className="f-input" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setSigned(e.target.files?.[0] || null)} />
                    </div>
                  </div>

                  <button type="submit" className="btn-primary" disabled={submit.isPending}>
                    {submit.isPending ? 'Submitting…' : 'Submit Placement'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </PortalShell>
  )
}
