import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, getApiErrorMessage } from '@/lib/apiClient'
import { postAction } from '@/api/mutations'
import {
  DetailCard,
  DetailShell,
  InfoGrid,
  PrimaryButton,
  StatusBadge,
  fileToBase64,
  fmtBytes,
  inputStyle,
} from '@/components/detail/DetailShell'
import { PrintPdfLink } from '@/pages/shared/PrintReportPages'
import { InteractiveTablePage, cell } from '@/pages/shared/InteractiveTablePage'
import type { Row } from '@/api/portals'

function Flash({ msg, err }: { msg: string | null; err: string | null }) {
  if (msg) {
    return (
      <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#dcfce7', color: '#166534', fontSize: 13 }}>
        {msg}
      </div>
    )
  }
  if (err) {
    return (
      <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#fee2e2', color: '#991b1b', fontSize: 13 }}>
        {err}
      </div>
    )
  }
  return null
}

export function StudentUploadAssessmentPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    unit_id: '',
    assessment_type: '',
    assessment_no: '1',
    term: '1',
    cycle: '1',
    year: String(new Date().getFullYear()),
  })
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const formQ = useQuery({
    queryKey: ['student-upload-form'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/student/upload-assessment-form')
      return data.data as Record<string, unknown>
    },
  })

  const submit = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Select a PDF file.')
      const file_base64 = await fileToBase64(file)
      await postAction('/student/assessments/upload', {
        ...form,
        assessment_no: Number(form.assessment_no),
        term: Number(form.term),
        cycle: Number(form.cycle),
        year: Number(form.year),
        file_name: file.name,
        file_base64,
        content_type: 'application/pdf',
      })
    },
    onSuccess: () => {
      setMsg('Assessment uploaded. Add evidence from My Files or Portfolio.')
      setErr(null)
      setFile(null)
      void qc.invalidateQueries({ queryKey: ['portal-table'] })
    },
    onError: (e) => {
      setErr(getApiErrorMessage(e))
      setMsg(null)
    },
  })

  const units = ((formQ.data?.class_units as Row[]) || []) as Row[]

  return (
    <DetailShell
      title="Upload Assessment"
      backTo="/student/assessments"
      subtitle="Submit formative assessment scripts (PDF)."
      loading={formQ.isLoading}
      error={formQ.isError ? getApiErrorMessage(formQ.error) : null}
      onRetry={() => void formQ.refetch()}
    >
      <Flash msg={msg} err={err} />
      <DetailCard>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit.mutate()
          }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}
        >
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>
            Unit
            <select value={form.unit_id} required onChange={(e) => setForm((f) => ({ ...f, unit_id: e.target.value }))} style={inputStyle}>
              <option value="">Select…</option>
              {units.map((cu) => (
                <option key={String(cu.unit_id)} value={String(cu.unit_id)}>
                  {String((cu.units as Row)?.code || '')} — {String((cu.units as Row)?.name || '')}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>
            Type
            <select value={form.assessment_type} required onChange={(e) => setForm((f) => ({ ...f, assessment_type: e.target.value }))} style={inputStyle}>
              <option value="">Select…</option>
              <option value="practical">Practical</option>
              <option value="theory">Theory</option>
              <option value="oral">Oral</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>
            Assessment No.
            <input type="number" min={1} value={form.assessment_no} onChange={(e) => setForm((f) => ({ ...f, assessment_no: e.target.value }))} style={inputStyle} required />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>
            Term
            <select value={form.term} onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))} style={inputStyle}>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>
            Cycle
            <select value={form.cycle} onChange={(e) => setForm((f) => ({ ...f, cycle: e.target.value }))} style={inputStyle}>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>
            Year
            <input type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} style={inputStyle} required />
          </label>
          <label style={{ gridColumn: '1 / -1', display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>
            PDF script
            <input type="file" accept=".pdf,application/pdf" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <div style={{ gridColumn: '1 / -1' }}>
            <PrimaryButton type="submit" disabled={submit.isPending}>{submit.isPending ? 'Uploading…' : 'Upload assessment'}</PrimaryButton>
          </div>
        </form>
      </DetailCard>
    </DetailShell>
  )
}

export function StudentUploadPoePage() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ unit_id: '', assessment_type: 'theory', assessment_no: '1', term: '1', cycle: '1', year: String(new Date().getFullYear()) })
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const formQ = useQuery({
    queryKey: ['student-poe-form'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/student/upload-poe-form')
      return data.data as Record<string, unknown>
    },
  })

  const classId = String(((formQ.data?.classes as Row[]) || [])[0]?.id ?? '')
  const units = ((formQ.data?.units as Row[]) || []) as Row[]

  const submit = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Select a file.')
      await postAction('/student/upload-poe', {
        ...form,
        class_id: classId,
        assessment_no: Number(form.assessment_no),
        term: Number(form.term),
        cycle: Number(form.cycle),
        year: Number(form.year),
        file_name: file.name,
        file_base64: await fileToBase64(file),
        content_type: file.type || 'application/pdf',
      })
    },
    onSuccess: () => {
      setMsg('POE uploaded successfully.')
      setErr(null)
      void qc.invalidateQueries({ queryKey: ['portal-table'] })
    },
    onError: (e) => {
      setErr(getApiErrorMessage(e))
      setMsg(null)
    },
  })

  return (
    <DetailShell title="Upload POE" backTo="/student/portfolio" loading={formQ.isLoading} error={formQ.isError ? getApiErrorMessage(formQ.error) : null}>
      <Flash msg={msg} err={err} />
      <DetailCard>
        <form onSubmit={(e) => { e.preventDefault(); submit.mutate() }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600 }}>
            Unit
            <select value={form.unit_id} required onChange={(e) => setForm((f) => ({ ...f, unit_id: e.target.value }))} style={inputStyle}>
              <option value="">Select…</option>
              {units.map((cu) => (
                <option key={String(cu.unit_id)} value={String(cu.unit_id)}>
                  {String((cu.units as Row)?.code || '')} — {String((cu.units as Row)?.name || '')}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600 }}>
            Type
            <select value={form.assessment_type} onChange={(e) => setForm((f) => ({ ...f, assessment_type: e.target.value }))} style={inputStyle}>
              <option value="theory">Theory</option>
              <option value="practical">Practical</option>
              <option value="oral">Oral</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600 }}>
            File
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <div style={{ gridColumn: '1 / -1' }}>
            <PrimaryButton type="submit" disabled={submit.isPending || !classId}>Upload POE</PrimaryButton>
          </div>
        </form>
      </DetailCard>
    </DetailShell>
  )
}

export function StudentAddEvidencePage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const q = useQuery({
    queryKey: ['student-assessment', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/student/assessments/${id}`)
      return data.data as Record<string, unknown>
    },
    enabled: Boolean(id),
  })

  const submit = useMutation({
    mutationFn: async () => {
      if (!file || !id) throw new Error('File required.')
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      const fileType = ['mp4', 'mov', 'avi', 'webm'].includes(ext) ? 'video' : ['mp3', 'wav', 'ogg'].includes(ext) ? 'audio' : 'photo'
      await postAction(`/student/assessments/${id}/evidence`, {
        caption,
        file_name: file.name,
        file_base64: await fileToBase64(file),
        content_type: file.type,
        file_type: fileType,
      })
    },
    onSuccess: () => {
      setMsg('Evidence added.')
      setErr(null)
      setFile(null)
      setCaption('')
      void qc.invalidateQueries({ queryKey: ['student-assessment', id] })
    },
    onError: (e) => {
      setErr(getApiErrorMessage(e))
      setMsg(null)
    },
  })

  const assessment = (q.data?.assessment as Row) || {}
  const evidence = ((q.data?.evidence as Row[]) || []) as Row[]

  return (
    <DetailShell
      title="Add Evidence"
      backTo="/student/my-files"
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
      notFound={!q.isLoading && !q.isError && !q.data?.assessment}
    >
      <InfoGrid
        items={[
          { label: 'Unit', value: cell(assessment, 'units.name') },
          { label: 'Type', value: cell(assessment, 'assessment_type') },
          { label: 'Status', value: <StatusBadge value={assessment.status} /> },
        ]}
      />
      <Flash msg={msg} err={err} />
      <DetailCard title="Upload evidence">
        <form onSubmit={(e) => { e.preventDefault(); submit.mutate() }} style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
          <input type="file" accept="image/*,video/*,audio/*" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <input placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} style={inputStyle} />
          <PrimaryButton type="submit" disabled={submit.isPending}>Add evidence</PrimaryButton>
        </form>
      </DetailCard>
      <DetailCard title={`Evidence (${evidence.length})`}>
        {evidence.length === 0 ? <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>No evidence yet.</p> : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {evidence.map((ev) => (
              <li key={String(ev.id)}>
                {String(ev.file_name || ev.id)} — {fmtBytes(ev.file_size)} {ev.caption ? `· ${String(ev.caption)}` : ''}
              </li>
            ))}
          </ul>
        )}
      </DetailCard>
    </DetailShell>
  )
}

export function StudentUnitDetailPage() {
  const { unitId } = useParams()
  const q = useQuery({
    queryKey: ['student-unit', unitId],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/student/units/${unitId}`)
      return data.data as Record<string, unknown>
    },
    enabled: Boolean(unitId),
  })
  const unit = (q.data?.unit as Row) || {}
  const records = ((q.data?.records as Row[]) || []) as Row[]

  return (
    <DetailShell
      title={String(unit.name || 'Unit Detail')}
      backTo="/student/units"
      subtitle={String(unit.code || '')}
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
    >
      <InfoGrid
        items={[
          { label: 'Present', value: String(q.data?.present ?? 0) },
          { label: 'Absent', value: String(q.data?.absent ?? 0) },
          { label: 'Attendance %', value: `${q.data?.pct ?? 0}%` },
        ]}
      />
      {unitId ? (
        <div style={{ marginBottom: 16 }}>
          <PrintPdfLink to="/student/unit-report/print" params={new URLSearchParams({ unit_id: unitId })} />
        </div>
      ) : null}
      <DetailCard title="Attendance records">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Date', 'Week', 'Lesson', 'Status'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, color: '#64748b' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={String(r.id)} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>{cell(r, 'attendance_date')}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>{cell(r, 'week')}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>{cell(r, 'lesson')}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}><StatusBadge value={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DetailCard>
    </DetailShell>
  )
}

export function StudentPortfolioViewPage() {
  const q = useQuery({
    queryKey: ['student-portfolio-view'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/student/portfolio-view')
      return data.data as Record<string, unknown>
    },
  })
  const items = ((q.data?.items as Row[]) || []) as Row[]
  const stats = (q.data?.stats as Row) || {}

  return (
    <DetailShell title="Portfolio View" backTo="/student/portfolio" loading={q.isLoading} error={q.isError ? getApiErrorMessage(q.error) : null}>
      <InfoGrid
        items={[
          { label: 'Total', value: String(stats.total ?? 0) },
          { label: 'Pending', value: String(stats.pending ?? 0) },
          { label: 'Approved', value: String(stats.approved ?? 0) },
          { label: 'Rejected', value: String(stats.rejected ?? 0) },
        ]}
      />
      <DetailCard>
        {items.map((item) => (
          <div key={String(item.id)} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
            <span>{cell(item, 'units.name')} · {cell(item, 'assessment_type')} #{cell(item, 'assessment_no', '')}</span>
            <StatusBadge value={item.status} />
          </div>
        ))}
      </DetailCard>
    </DetailShell>
  )
}

export function StudentMyFilesPage() {
  return (
    <InteractiveTablePage
      title="My Files"
      subtitle="Assessment scripts and evidence counts."
      endpoint="/student/my-files"
      rowsKey="items"
      columns={[
        { key: 'units.name', label: 'Unit', render: (r) => cell(r, 'units.name') },
        { key: 'assessment_type', label: 'Type' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
        { key: 'evidence_count', label: 'Evidence' },
        { key: 'script_file_name', label: 'Script' },
        {
          key: 'actions',
          label: '',
          render: (r) => (
            <Link to={`/student/assessments/${r.id}/evidence`} style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 12 }}>
              Add evidence →
            </Link>
          ),
        },
      ]}
      extraHeader={
        <Link to="/student/assessments/upload" style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 12 }}>
          Upload assessment
        </Link>
      }
    />
  )
}

export function StudentEmploymentProjectsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', employer_name: '', status: 'active', start_date: '' })
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const submit = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { ...form }
      if (file) {
        payload.file_name = file.name
        payload.file_base64 = await fileToBase64(file)
        payload.content_type = file.type || 'application/pdf'
      }
      await postAction('/student/employment-projects', payload)
    },
    onSuccess: () => {
      setMsg('Project saved.')
      setErr(null)
      setShowForm(false)
      void qc.invalidateQueries({ queryKey: ['portal-table', '/student/employment-projects'] })
    },
    onError: (e) => {
      setErr(getApiErrorMessage(e))
      setMsg(null)
    },
  })

  return (
    <>
      <Flash msg={msg} err={err} />
      <InteractiveTablePage
        title="Employment Projects"
        endpoint="/student/employment-projects"
        rowsKey="items"
        columns={[
          { key: 'title', label: 'Project' },
          { key: 'employer_name', label: 'Employer' },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
          { key: 'start_date', label: 'Start' },
        ]}
        extraHeader={
          <button type="button" onClick={() => setShowForm((v) => !v)} style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
            {showForm ? 'Cancel' : '+ Add project'}
          </button>
        }
      />
      {showForm ? (
        <div style={{ padding: '0 24px 24px' }}>
          <DetailCard title="New project">
            <form onSubmit={(e: FormEvent) => { e.preventDefault(); submit.mutate() }} style={{ display: 'grid', gap: 10, maxWidth: 480 }}>
              <input placeholder="Title" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} style={inputStyle} />
              <textarea placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, minHeight: 80 }} />
              <input placeholder="Employer" value={form.employer_name} onChange={(e) => setForm((f) => ({ ...f, employer_name: e.target.value }))} style={inputStyle} />
              <input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} style={inputStyle} />
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <PrimaryButton type="submit" disabled={submit.isPending}>Save project</PrimaryButton>
            </form>
          </DetailCard>
        </div>
      ) : null}
    </>
  )
}
