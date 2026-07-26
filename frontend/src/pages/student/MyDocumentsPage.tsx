/**
 * My Documents — React port of templates/student/my_documents.html
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, getApiErrorMessage } from '@/lib/apiClient'
import { postAction } from '@/api/mutations'
import { fileToBase64 } from '@/components/detail/DetailShell'
import { PortalShell } from '@/layouts/PortalShell'
import { ErrorState, PageSkeleton } from '@/components/ui/States'
import type { Row } from '@/api/portals'
import './my-documents.css'

const DOC_DEFS: { key: string; label: string; req: boolean; accept: string }[] = [
  { key: 'passport_photo', label: 'Passport Photos', req: true, accept: 'image/*' },
  { key: 'admission_letter', label: 'Admission Letter', req: true, accept: '.pdf,.jpg,.jpeg,.png' },
  { key: 'medical_form', label: 'Medical Examination Form', req: true, accept: '.pdf,.jpg,.jpeg,.png' },
  { key: 'personal_data_form', label: 'Personal Data Form', req: true, accept: '.pdf,.jpg,.jpeg,.png' },
  { key: 'declaration_form', label: 'Declaration Form', req: true, accept: '.pdf,.jpg,.jpeg,.png' },
  { key: 'kcse_result_slip', label: 'KCSE Result Slip', req: true, accept: '.pdf,.jpg,.jpeg,.png' },
  { key: 'kcse_certificate', label: 'KCSE Certificate', req: true, accept: '.pdf,.jpg,.jpeg,.png' },
  { key: 'kcpe_result_slip', label: 'KCPE Result Slip', req: true, accept: '.pdf,.jpg,.jpeg,.png' },
  { key: 'birth_certificate', label: 'Birth Certificate', req: true, accept: '.pdf,.jpg,.jpeg,.png' },
  { key: 'national_id', label: 'National ID', req: true, accept: '.pdf,.jpg,.jpeg,.png' },
  { key: 'guardian_id', label: 'Guardian ID Copies', req: false, accept: '.pdf,.jpg,.jpeg,.png' },
  { key: 'consent_form', label: 'Consent Form', req: true, accept: '.pdf,.jpg,.jpeg,.png' },
]

type DocsPayload = {
  student: Row
  course_name: string
  department_name: string
  documents: Record<string, Row>
  documents_list: Row[]
  total_doc_types: number
}

export default function MyDocumentsPage() {
  const qc = useQueryClient()
  const prefilled = useRef(false)

  const docsQ = useQuery({
    queryKey: ['student-my-documents'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/student/documents')
      return data.data as DocsPayload
    },
  })

  const [gender, setGender] = useState('')
  const [mobile, setMobile] = useState('')
  const [dob, setDob] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [county, setCounty] = useState('')
  const [subCounty, setSubCounty] = useState('')
  const [village, setVillage] = useState('')
  const [picks, setPicks] = useState<Record<string, File | null>>({})
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!docsQ.data || prefilled.current) return
    prefilled.current = true
    const s = docsQ.data.student || {}
    setGender(String(s.gender || ''))
    setMobile(String(s.mobile_number || ''))
    setDob(String(s.date_of_birth || '').slice(0, 10))
    setNationalId(String(s.national_id_no || ''))
    setCounty(String(s.county || ''))
    setSubCounty(String(s.sub_county || ''))
    setVillage(String(s.village || ''))
  }, [docsQ.data])

  const uploadedN = useMemo(() => Object.keys(docsQ.data?.documents || {}).length, [docsQ.data])
  const total = docsQ.data?.total_doc_types || DOC_DEFS.length + 1
  const pct = total ? Math.round((uploadedN / total) * 100) : 0

  const saveProfile = useMutation({
    mutationFn: () =>
      postAction('/student/documents/profile', {
        gender,
        mobile_number: mobile,
        date_of_birth: dob,
        national_id_no: nationalId,
        county,
        sub_county: subCounty,
        village,
      }),
    onSuccess: () => {
      setMsg('Personal information updated successfully.')
      setErr(null)
      void qc.invalidateQueries({ queryKey: ['student-my-documents'] })
      void qc.invalidateQueries({ queryKey: ['exam-booking-form-1a'] })
    },
    onError: (e) => {
      setErr(getApiErrorMessage(e))
      setMsg(null)
    },
  })

  const saveDocs = useMutation({
    mutationFn: async () => {
      const files: Row[] = []
      for (const [document_type, file] of Object.entries(picks)) {
        if (!file) continue
        files.push({
          document_type,
          file_name: file.name,
          file_base64: await fileToBase64(file),
          content_type: file.type || 'application/octet-stream',
        })
      }
      if (!files.length) throw new Error('No files were selected.')
      return postAction('/student/documents/upload', { files })
    },
    onSuccess: (res) => {
      const uploaded = (res as { data?: { uploaded?: number } })?.data?.uploaded ?? 0
      setMsg(`${uploaded} document(s) uploaded successfully.`)
      setErr(null)
      setPicks({})
      void qc.invalidateQueries({ queryKey: ['student-my-documents'] })
      void qc.invalidateQueries({ queryKey: ['exam-booking-form-1a'] })
    },
    onError: (e) => {
      setErr(getApiErrorMessage(e))
      setMsg(null)
    },
  })

  function onProfileSubmit(e: FormEvent) {
    e.preventDefault()
    saveProfile.mutate()
  }

  function onDocsSubmit(e: FormEvent) {
    e.preventDefault()
    saveDocs.mutate()
  }

  if (docsQ.isLoading) {
    return (
      <PortalShell title="My Documents">
        <PageSkeleton />
      </PortalShell>
    )
  }
  if (docsQ.isError || !docsQ.data) {
    return (
      <PortalShell title="My Documents">
        <div className="p-6">
          <ErrorState message={getApiErrorMessage(docsQ.error)} onRetry={() => void docsQ.refetch()} />
        </div>
      </PortalShell>
    )
  }

  const data = docsQ.data
  const student = data.student || {}
  const docs = data.documents || {}
  const rslip = docs.most_recent_result_slip
  const gallery = data.documents_list || []
  const pickCount = Object.values(picks).filter(Boolean).length

  return (
    <PortalShell title="My Documents">
      <div className="md-wrap">
        {msg ? <div className="md-alert ok">{msg}</div> : null}
        {err ? <div className="md-alert bad">{err}</div> : null}

        <div className="md-card" style={{ marginBottom: 20 }}>
          <div className="md-body" style={{ padding: '18px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>Document Upload Progress</div>
                <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
                  <b style={{ color: uploadedN === total ? '#16a34a' : '#0f2c54' }}>{uploadedN}</b> of <b>{total}</b>{' '}
                  documents uploaded
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 160, maxWidth: 360 }}>
                <div className="prog-bar-wrap">
                  <div className="prog-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right', marginTop: 2 }}>{pct}% complete</div>
              </div>
              {uploadedN === total ? (
                <span className="md-pill ok">All Documents Submitted</span>
              ) : (
                <Link to="/student/exam-booking-form" className="md-pill link">
                  Go to Exam Booking →
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="md-card">
          <div className="md-head">
            Personal Information
            <span className="hright">
              Fields marked <span style={{ color: '#fbbf24' }}>*</span> are editable
            </span>
          </div>
          <div className="md-body">
            <form onSubmit={onProfileSubmit}>
              <div className="pf-grid">
                <div className="pf-field">
                  <label className="pf-label">Full Name</label>
                  <input className="pf-input ro" readOnly value={String(student.full_name || '')} />
                  <span className="pf-hint">Contact admin to change</span>
                </div>
                <div className="pf-field">
                  <label className="pf-label">Admission Number</label>
                  <input className="pf-input ro" readOnly value={String(student.admission_no || '')} />
                  <span className="pf-hint">System-assigned</span>
                </div>
                <div className="pf-field">
                  <label className="pf-label">
                    Gender <span className="req">*</span>
                  </label>
                  <select className="pf-select" value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="">-- Select --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="pf-field">
                  <label className="pf-label">
                    Phone Number <span className="req">*</span>
                  </label>
                  <input className="pf-input" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="e.g. 0712345678" />
                </div>
                <div className="pf-field">
                  <label className="pf-label">
                    Date of Birth <span className="req">*</span>
                  </label>
                  <input className="pf-input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                </div>
                <div className="pf-field">
                  <label className="pf-label">
                    National ID / Birth Cert No. <span className="req">*</span>
                  </label>
                  <input className="pf-input" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
                </div>
                <div className="pf-field">
                  <label className="pf-label">County</label>
                  <input className="pf-input" value={county} onChange={(e) => setCounty(e.target.value)} />
                </div>
                <div className="pf-field">
                  <label className="pf-label">Sub County</label>
                  <input className="pf-input" value={subCounty} onChange={(e) => setSubCounty(e.target.value)} />
                </div>
                <div className="pf-field">
                  <label className="pf-label">Village / Address</label>
                  <input className="pf-input" value={village} onChange={(e) => setVillage(e.target.value)} />
                </div>
                <div className="pf-field">
                  <label className="pf-label">Course</label>
                  <div className="pf-static">{data.course_name || '—'}</div>
                </div>
                <div className="pf-field">
                  <label className="pf-label">Department</label>
                  <div className="pf-static">{data.department_name || '—'}</div>
                </div>
              </div>
              <div style={{ marginTop: 22 }}>
                <button type="submit" className="btn-profile" disabled={saveProfile.isPending}>
                  {saveProfile.isPending ? 'Saving…' : 'Save Personal Information'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="md-card">
          <div className="md-head">
            Upload Documents
            <span className="hright">Select files then click Save — all changes upload together</span>
          </div>
          <div className="md-body">
            <form onSubmit={onDocsSubmit}>
              <div className="doc-grid">
                {DOC_DEFS.map((dd) => {
                  const doc = docs[dd.key]
                  const pick = picks[dd.key]
                  return (
                    <div key={dd.key} className={`doc-card ${doc ? 'has-file' : 'missing'} ${pick ? 'selecting' : ''}`}>
                      <div className="doc-card-label">
                        {dd.label}
                        {dd.req ? <span className="req">*</span> : null}
                      </div>
                      {doc ? (
                        <>
                          <div className="doc-card-status ok">Uploaded</div>
                          <div className="doc-existing">
                            <div style={{ minWidth: 0 }}>
                              <div className="doc-fn">{String(doc.file_name || '')}</div>
                              <div className="doc-fs">{doc.file_size ? `${(Number(doc.file_size) / 1024).toFixed(1)} KB` : ''}</div>
                            </div>
                            {doc.file_url ? (
                              <a href={String(doc.file_url)} target="_blank" rel="noreferrer">
                                View
                              </a>
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <div className="doc-card-status missing">Not uploaded</div>
                      )}
                      <div>
                        <label className="pf-label" style={{ marginBottom: 5 }}>
                          {doc ? 'Replace file' : 'Upload file'}
                        </label>
                        <input
                          type="file"
                          className="doc-file-input"
                          accept={dd.accept}
                          onChange={(e) => setPicks((p) => ({ ...p, [dd.key]: e.target.files?.[0] || null }))}
                        />
                        {pick ? <div className="pick-hint">Selected: {pick.name}</div> : null}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="rslip-wrap">
                <div className="rslip-head">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Most Recent Academic Result Slip</div>
                  </div>
                  {rslip ? <span className="md-pill ok">Uploaded</span> : <span className="md-pill warn">Not Uploaded</span>}
                </div>
                <div className="rslip-body">
                  {rslip?.file_url ? (
                    <a href={String(rslip.file_url)} target="_blank" rel="noreferrer" className="btn-view">
                      View current file
                    </a>
                  ) : null}
                  <input
                    type="file"
                    className="doc-file-input"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setPicks((p) => ({ ...p, most_recent_result_slip: e.target.files?.[0] || null }))}
                  />
                  {picks.most_recent_result_slip ? (
                    <div className="pick-hint">Selected: {picks.most_recent_result_slip.name}</div>
                  ) : null}
                </div>
              </div>

              <div style={{ marginTop: 22, textAlign: 'center' }}>
                <button type="submit" className="btn-save-docs" disabled={!pickCount || saveDocs.isPending}>
                  {saveDocs.isPending ? 'Uploading…' : `Save Documents${pickCount ? ` (${pickCount})` : ''}`}
                </button>
              </div>
            </form>
          </div>
        </div>

        {gallery.length ? (
          <div className="md-card">
            <div className="md-head">
              Uploaded Gallery
              <span className="hright">{gallery.length} file(s)</span>
            </div>
            <div className="md-body">
              <div className="gallery-grid">
                {gallery.map((doc) => {
                  const url = String(doc.file_url || '')
                  const name = String(doc.file_name || '')
                  const isImg = /\.(jpg|jpeg|png|webp)$/i.test(name)
                  return (
                    <div key={String(doc.id)} className="gallery-tile">
                      <div className="gallery-thumb">
                        {isImg && url ? <img src={url} alt="" /> : <div className="thumb-icon">DOC</div>}
                      </div>
                      <div className="gallery-info">
                        <div className="gallery-doc-name">{String(doc.document_name || doc.document_type || '')}</div>
                        <div className="gallery-file-name">{name}</div>
                        <div className="gallery-size">
                          {doc.file_size ? `${(Number(doc.file_size) / 1024).toFixed(1)} KB` : ''}
                        </div>
                      </div>
                      <div className="gallery-footer">
                        <span className={`status-pill ${String(doc.status || 'pending')}`}>{String(doc.status || 'pending')}</span>
                        {url ? (
                          <a className="btn-view" href={url} target="_blank" rel="noreferrer">
                            View
                          </a>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PortalShell>
  )
}
