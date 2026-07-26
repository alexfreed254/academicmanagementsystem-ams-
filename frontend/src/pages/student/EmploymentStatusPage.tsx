/**
 * Employment Status — port of templates/student/employment_status.html
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, getApiErrorMessage } from '@/lib/apiClient'
import { postAction } from '@/api/mutations'
import { PortalShell } from '@/layouts/PortalShell'
import { ErrorState, PageSkeleton } from '@/components/ui/States'
import type { Row } from '@/api/portals'
import './employment-status.css'

const OPTIONS = [
  { value: 'employed', label: 'Employed' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'unemployed', label: 'Seeking Employment' },
  { value: 'continuing_education', label: 'Continuing Education' },
  { value: 'other', label: 'Other' },
]

const LABELS: Record<string, string> = Object.fromEntries(OPTIONS.map((o) => [o.value, o.label]))

type Payload = { current_status: Row | null; projects: Row[] }

export default function EmploymentStatusPage() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['student-employment-status'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/student/employment-status')
      return data.data as Payload
    },
  })

  const [status, setStatus] = useState('unemployed')
  const [company, setCompany] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const cur = q.data?.current_status
    if (!cur) return
    setStatus(String(cur.employment_status || cur.status || 'unemployed'))
    setCompany(String(cur.company_name || cur.employer_name || ''))
    setJobTitle(String(cur.job_title || cur.position || ''))
    setStartDate(String(cur.start_date || '').slice(0, 10))
    setAddress(String(cur.location_address || ''))
    if (cur.latitude != null) setLat(String(cur.latitude))
    if (cur.longitude != null) setLng(String(cur.longitude))
  }, [q.data])

  const save = useMutation({
    mutationFn: () =>
      postAction('/student/employment-status', {
        employment_status: status,
        company_name: company,
        job_title: jobTitle,
        start_date: startDate,
        location_address: address,
        latitude: lat || null,
        longitude: lng || null,
      }),
    onSuccess: () => {
      setMsg('Employment status updated successfully.')
      setErr(null)
      void qc.invalidateQueries({ queryKey: ['student-employment-status'] })
    },
    onError: (e) => {
      setErr(getApiErrorMessage(e))
      setMsg(null)
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    save.mutate()
  }

  function autoDetect() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude.toFixed(6))
      setLng(pos.coords.longitude.toFixed(6))
    })
  }

  if (q.isLoading) {
    return (
      <PortalShell title="Employment Status">
        <PageSkeleton />
      </PortalShell>
    )
  }
  if (q.isError || !q.data) {
    return (
      <PortalShell title="Employment Status">
        <div className="p-6">
          <ErrorState message={getApiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
        </div>
      </PortalShell>
    )
  }

  const current = q.data.current_status
  const projects = q.data.projects || []
  const st = String(current?.employment_status || current?.status || '')
  const needsEmployer = status === 'employed' || status === 'self_employed'

  return (
    <PortalShell title="Employment Status">
      <div className="es-wrap">
        {msg ? <div className="es-alert ok">{msg}</div> : null}
        {err ? <div className="es-alert bad">{err}</div> : null}

        {current ? (
          <div className={`status-banner ${st || 'other'}`}>
            <div>
              <div className="sb-label">{LABELS[st] || st || 'Status set'}</div>
              {current.company_name || current.employer_name ? (
                <div className="sb-meta">
                  {String(current.company_name || current.employer_name)}
                  {current.job_title || current.position
                    ? ` · ${String(current.job_title || current.position)}`
                    : ''}
                </div>
              ) : null}
              {current.start_date ? <div className="sb-meta">Since {String(current.start_date).slice(0, 10)}</div> : null}
              {current.location_address ? <div className="sb-meta">{String(current.location_address)}</div> : null}
            </div>
          </div>
        ) : null}

        <div className="es-card">
          <div className="es-head">Update Employment Status</div>
          <div style={{ padding: 22 }}>
            <form onSubmit={onSubmit}>
              <div className="status-grid">
                {OPTIONS.map((o) => (
                  <label key={o.value} className="status-opt">
                    <input
                      type="radio"
                      name="employment_status"
                      checked={status === o.value}
                      onChange={() => setStatus(o.value)}
                    />
                    <div className="status-opt-label">
                      <span className="status-opt-text">{o.label}</span>
                    </div>
                  </label>
                ))}
              </div>

              {needsEmployer ? (
                <div className="f-grid">
                  <div className="f-field">
                    <label className="f-label">Company / Business Name *</label>
                    <input className="f-input" required value={company} onChange={(e) => setCompany(e.target.value)} />
                  </div>
                  <div className="f-field">
                    <label className="f-label">Job / Role Title</label>
                    <input className="f-input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                  </div>
                  <div className="f-field">
                    <label className="f-label">Start Date</label>
                    <input className="f-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                </div>
              ) : null}

              <div className="f-field">
                <label className="f-label">Location / Address</label>
                <input className="f-input" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="f-grid">
                <div className="f-field">
                  <label className="f-label">Latitude</label>
                  <input className="f-input" value={lat} onChange={(e) => setLat(e.target.value)} />
                </div>
                <div className="f-field">
                  <label className="f-label">Longitude</label>
                  <input className="f-input" value={lng} onChange={(e) => setLng(e.target.value)} />
                </div>
              </div>
              <button type="button" className="btn-gps" onClick={autoDetect} style={{ marginBottom: 16 }}>
                Auto-Detect GPS
              </button>
              <div>
                <button type="submit" className="btn-save" disabled={save.isPending}>
                  {save.isPending ? 'Saving…' : 'Save Employment Status'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="es-card">
          <div className="es-head">
            Employment Projects
            <Link to="/student/employment-projects" style={{ marginLeft: 'auto', color: '#93c5fd', fontSize: 12, fontWeight: 600 }}>
              Manage projects →
            </Link>
          </div>
          <div style={{ padding: 22 }}>
            {!projects.length ? (
              <div className="empty">No employment projects recorded yet.</div>
            ) : (
              <div className="info-grid">
                {projects.map((p) => (
                  <div key={String(p.id)} className="info-item">
                    <div className="info-label">{String(p.title || p.project_name || 'Project')}</div>
                    <div className="info-value">{String(p.status || '—')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PortalShell>
  )
}
