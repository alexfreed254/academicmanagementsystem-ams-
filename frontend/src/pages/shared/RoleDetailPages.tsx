import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, getApiErrorMessage } from '@/lib/apiClient'
import { postAction } from '@/api/mutations'
import {
  DetailCard,
  DetailShell,
  InfoGrid,
  PrimaryButton,
  StatusBadge,
  inputStyle,
} from '@/components/detail/DetailShell'
import { InteractiveTablePage, cell } from '@/pages/shared/InteractiveTablePage'
import type { Row } from '@/api/portals'

export function ExamOfficerBookingDetailPage() {
  const { id } = useParams()
  const q = useQuery({
    queryKey: ['exam-booking', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/examination-officer/exam-bookings/${id}`)
      return data.data as Record<string, unknown>
    },
    enabled: Boolean(id),
  })
  const booking = (q.data?.booking as Row) || {}

  return (
    <DetailShell
      title="Exam Booking Detail"
      backTo="/examination-officer/exam-bookings"
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
      notFound={!q.isLoading && !q.isError && !q.data?.booking}
    >
      <InfoGrid
        items={[
          { label: 'Trainee', value: cell(booking, 'user_profiles.full_name') },
          { label: 'Admission', value: cell(booking, 'user_profiles.admission_no') },
          { label: 'Unit', value: `${cell(booking, 'units.code')} — ${cell(booking, 'units.name')}` },
          { label: 'Exam date', value: cell(booking, 'exam_date') },
          { label: 'Session', value: cell(booking, 'exam_session') },
          { label: 'Status', value: <StatusBadge value={booking.status} /> },
          { label: 'Approved by', value: cell(booking, 'approver.full_name', '—') },
        ]}
      />
    </DetailShell>
  )
}

export function LiaisonPlacementDetailPage() {
  const { id } = useParams()
  const q = useQuery({
    queryKey: ['liaison-placement', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/liaison-officer/attachments/${id}`)
      return data.data as Record<string, unknown>
    },
    enabled: Boolean(id),
  })
  const att = (q.data?.attachment as Row) || {}

  return (
    <DetailShell
      title="Placement Detail"
      backTo="/liaison-officer/attachments"
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
      notFound={!q.isLoading && !q.isError && !q.data?.attachment}
      extraHeader={
        <Link to={`/liaison-officer/attachments/${id}/grade`} style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 12 }}>
          Grade attachment →
        </Link>
      }
    >
      <InfoGrid
        items={[
          { label: 'Trainee', value: cell(att, 'user_profiles.full_name') },
          { label: 'Company', value: cell(att, 'companies.name') },
          { label: 'Unit', value: cell(att, 'units.name', '—') },
          { label: 'Status', value: <StatusBadge value={att.status} /> },
          { label: 'Trainer', value: cell(att, 'trainer_name', '—') },
          { label: 'Start', value: cell(att, 'start_date', '—') },
        ]}
      />
    </DetailShell>
  )
}

export function LiaisonGradeAttachmentPage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [scores, setScores] = useState({
    score_gps_attendance: '',
    score_logbook: '',
    score_mentor_eval: '',
    score_trainer_assessment: '',
    score_final_report: '',
  })
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const q = useQuery({
    queryKey: ['liaison-grade', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/liaison-officer/attachments/${id}/grade-form`)
      return data.data as Record<string, unknown>
    },
    enabled: Boolean(id),
  })

  const att = (q.data?.attachment as Row) || {}
  const existing = (q.data?.grade as Row) || null

  const submit = useMutation({
    mutationFn: async () => {
      await postAction(`/liaison-officer/attachments/${id}/grade`, {
        score_gps_attendance: Number(scores.score_gps_attendance) || 0,
        score_logbook: Number(scores.score_logbook) || 0,
        score_mentor_eval: Number(scores.score_mentor_eval) || 0,
        score_trainer_assessment: Number(scores.score_trainer_assessment) || 0,
        score_final_report: Number(scores.score_final_report) || 0,
      })
    },
    onSuccess: () => {
      setMsg('Grade saved.')
      setErr(null)
      void qc.invalidateQueries({ queryKey: ['liaison-grade', id] })
    },
    onError: (e) => {
      setErr(getApiErrorMessage(e))
      setMsg(null)
    },
  })

  return (
    <DetailShell
      title="Grade Attachment"
      backTo={`/liaison-officer/attachments/${id}`}
      subtitle={cell(att, 'user_profiles.full_name')}
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
    >
      {msg ? <div style={{ marginBottom: 12, padding: 10, background: '#dcfce7', borderRadius: 8, fontSize: 13 }}>{msg}</div> : null}
      {err ? <div style={{ marginBottom: 12, padding: 10, background: '#fee2e2', borderRadius: 8, fontSize: 13 }}>{err}</div> : null}
      {existing ? (
        <DetailCard title="Existing grade">
          <p style={{ margin: 0, fontSize: 13 }}>Grade: {cell(existing, 'final_grade')} · Total: {cell(existing, 'weighted_total')}</p>
        </DetailCard>
      ) : null}
      <DetailCard title="Score entry">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit.mutate()
          }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}
        >
          {Object.keys(scores).map((key) => (
            <label key={key} style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600 }}>
              {key.replace(/score_|_/g, ' ')}
              <input
                type="number"
                min={0}
                max={100}
                value={scores[key as keyof typeof scores]}
                onChange={(e) => setScores((s) => ({ ...s, [key]: e.target.value }))}
                style={inputStyle}
              />
            </label>
          ))}
          <div style={{ gridColumn: '1 / -1' }}>
            <PrimaryButton type="submit" disabled={submit.isPending}>Save grade</PrimaryButton>
          </div>
        </form>
      </DetailCard>
    </DetailShell>
  )
}

export function CdaccTraineeDetailPage() {
  const { id } = useParams()
  const q = useQuery({
    queryKey: ['cdacc-trainee', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/cdacc-verifier/trainees/${id}`)
      return data.data as Record<string, unknown>
    },
    enabled: Boolean(id),
  })
  const student = (q.data?.student as Row) || {}
  const attGrades = ((q.data?.att_grades as Row[]) || []) as Row[]
  const logbook = ((q.data?.logbook as Row[]) || []) as Row[]

  return (
    <DetailShell
      title="Trainee Detail"
      backTo="/cdacc-verifier/trainees"
      subtitle={cell(student, 'admission_no')}
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
    >
      <InfoGrid
        items={[
          { label: 'Name', value: cell(student, 'full_name') },
          { label: 'Email', value: cell(student, 'email', '—') },
          { label: 'Department', value: cell(student, 'departments.name', '—') },
          { label: 'Class', value: cell(student, 'classes.name', '—') },
        ]}
      />
      <DetailCard title="Attachment grades">
        {attGrades.length === 0 ? (
          <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>No attachment grades.</p>
        ) : (
          attGrades.map((row, i) => (
            <div key={i} style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
              {cell(row.attachment as Row, 'companies.name')} — {cell(row.grade as Row, 'final_grade', '—')}
            </div>
          ))
        )}
      </DetailCard>
      <DetailCard title={`Logbook (${logbook.length})`}>
        {logbook.slice(0, 10).map((entry) => (
          <div key={String(entry.id)} style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
            {cell(entry, 'log_date')} · {cell(entry, 'tasks_performed', cell(entry, 'activities', ''))}
          </div>
        ))}
      </DetailCard>
    </DetailShell>
  )
}

export function InternalVerifierAttachmentDetailPage() {
  const { id } = useParams()
  const q = useQuery({
    queryKey: ['iv-attachment', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/internal-verifier/attachments/${id}`)
      return data.data as Record<string, unknown>
    },
    enabled: Boolean(id),
  })
  const att = (q.data?.attachment as Row) || {}
  const competencies = ((q.data?.competencies as Row[]) || []) as Row[]
  const logbooks = ((q.data?.logbooks as Row[]) || []) as Row[]

  return (
    <DetailShell
      title="Attachment Detail"
      backTo="/internal-verifier/attachments"
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
      notFound={!q.isLoading && !q.isError && !q.data?.attachment}
    >
      <InfoGrid
        items={[
          { label: 'Trainee', value: cell(att, 'user_profiles.full_name') },
          { label: 'Company', value: cell(att, 'companies.name') },
          { label: 'Unit', value: cell(att, 'units.name') },
          { label: 'Status', value: <StatusBadge value={att.status} /> },
        ]}
      />
      <DetailCard title="Competencies">
        {competencies.map((c) => (
          <div key={String(c.id)} style={{ fontSize: 13, padding: '6px 0' }}>
            {cell(c, 'competency_name', cell(c, 'units.name'))} — {cell(c, 'verification_status', '—')}
          </div>
        ))}
      </DetailCard>
      <DetailCard title="Logbook entries">
        {logbooks.slice(0, 15).map((l) => (
          <div key={String(l.id)} style={{ fontSize: 13, padding: '6px 0' }}>
            {cell(l, 'log_date', cell(l, 'entry_date'))} · {cell(l, 'activities', '—')}
          </div>
        ))}
      </DetailCard>
    </DetailShell>
  )
}

export function DeptApplicationsPage() {
  return (
    <InteractiveTablePage
      title="Course Applications"
      endpoint="/dept-admin/applications"
      rowsKey="items"
      columns={[
        { key: 'full_name', label: 'Applicant' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
        { key: 'created_at', label: 'Applied' },
      ]}
      actions={[
        {
          label: 'Approve',
          tone: 'primary',
          when: (r) => String(r.status || '') === 'pending',
          run: (row) => postAction(`/dept-admin/applications/${row.id}/review`, { action: 'approve' }),
        },
        {
          label: 'Reject',
          tone: 'danger',
          requireComment: true,
          when: (r) => String(r.status || '') === 'pending',
          run: (row, comment) => postAction(`/dept-admin/applications/${row.id}/review`, { action: 'reject', notes: comment }),
        },
      ]}
    />
  )
}

export function DeptTraineeDocumentDetailPage() {
  const { studentId } = useParams()
  const q = useQuery({
    queryKey: ['dept-trainee-docs', studentId],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/dept-admin/trainees-documents/${studentId}`)
      return data.data as Record<string, unknown>
    },
    enabled: Boolean(studentId),
  })
  const student = (q.data?.student as Row) || {}
  const documents = ((q.data?.documents as Row[]) || []) as Row[]

  return (
    <DetailShell
      title="Trainee Documents"
      backTo="/dept-admin/trainees-documents"
      subtitle={cell(student, 'full_name')}
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
    >
      <InfoGrid
        items={[
          { label: 'Admission', value: cell(student, 'admission_no') },
          { label: 'Email', value: cell(student, 'email', '—') },
          { label: 'Class', value: cell(q.data || {}, 'class_name', '—') },
        ]}
      />
      <DetailCard title="Documents">
        {documents.length === 0 ? (
          <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>No documents uploaded.</p>
        ) : (
          documents.map((d) => (
            <div key={String(d.id)} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
              <span>{cell(d, 'document_type')} · {cell(d, 'file_name')}</span>
              <StatusBadge value={d.status} />
            </div>
          ))
        )}
      </DetailCard>
    </DetailShell>
  )
}
