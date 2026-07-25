import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
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
import { cell } from '@/pages/shared/ApiTablePage'
import type { Row } from '@/api/portals'

export function TrainerReviewAssessmentPage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const q = useQuery({
    queryKey: ['trainer-assessment', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/trainer/assessments/${id}`)
      return data.data as Record<string, unknown>
    },
    enabled: Boolean(id),
  })

  const review = useMutation({
    mutationFn: async (action: 'approve' | 'reject') => {
      await postAction(`/trainer/assessments/${id}/review`, { action, review_note: note })
    },
    onSuccess: (_, action) => {
      setMsg(`Assessment ${action === 'approve' ? 'approved' : 'rejected'}.`)
      setErr(null)
      void qc.invalidateQueries({ queryKey: ['trainer-assessment', id] })
      void qc.invalidateQueries({ queryKey: ['portal-table'] })
    },
    onError: (e) => {
      setErr(getApiErrorMessage(e))
      setMsg(null)
    },
  })

  const assessment = (q.data?.assessment as Row) || {}
  const evidence = ((q.data?.evidence as Row[]) || []) as Row[]
  const pending = String(assessment.status || '') === 'pending'

  return (
    <DetailShell
      title="Review Assessment"
      backTo="/trainer/assessments"
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
      notFound={!q.isLoading && !q.isError && !q.data?.assessment}
    >
      {msg ? <div style={{ marginBottom: 12, padding: 10, background: '#dcfce7', borderRadius: 8, fontSize: 13 }}>{msg}</div> : null}
      {err ? <div style={{ marginBottom: 12, padding: 10, background: '#fee2e2', borderRadius: 8, fontSize: 13 }}>{err}</div> : null}
      <InfoGrid
        items={[
          { label: 'Trainee', value: cell(assessment, 'user_profiles.full_name') },
          { label: 'Admission', value: cell(assessment, 'user_profiles.admission_no') },
          { label: 'Unit', value: cell(assessment, 'units.name') },
          { label: 'Class', value: cell(assessment, 'classes.name') },
          { label: 'Type', value: cell(assessment, 'assessment_type') },
          { label: 'Status', value: <StatusBadge value={assessment.status} /> },
          { label: 'Marks', value: `${assessment.marks_obtained ?? '—'} / ${assessment.max_marks ?? 100}` },
        ]}
      />
      <DetailCard title="Script">
        <p style={{ margin: 0, fontSize: 13 }}>{cell(assessment, 'script_file_name', 'No script on file')}</p>
      </DetailCard>
      <DetailCard title={`Evidence (${evidence.length})`}>
        {evidence.length === 0 ? (
          <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>No evidence uploaded.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {evidence.map((ev) => (
              <li key={String(ev.id)}>{String(ev.file_name || ev.id)}</li>
            ))}
          </ul>
        )}
      </DetailCard>
      {pending ? (
        <DetailCard title="Review decision">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Review note (optional)" style={{ ...inputStyle, minHeight: 80, marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <PrimaryButton disabled={review.isPending} onClick={() => review.mutate('approve')}>Approve</PrimaryButton>
            <button
              type="button"
              disabled={review.isPending}
              onClick={() => review.mutate('reject')}
              style={{ border: 'none', background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              Reject
            </button>
          </div>
        </DetailCard>
      ) : null}
    </DetailShell>
  )
}

export function TrainerViewSessionPage() {
  const [params] = useSearchParams()
  const qs = params.toString()
  const q = useQuery({
    queryKey: ['trainer-view-session', qs],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/trainer/view-session?${qs}`)
      return data.data as Record<string, unknown>
    },
    enabled: Boolean(params.get('class_id') && params.get('unit_id') && params.get('week') && params.get('lesson')),
  })

  const records = ((q.data?.records as Row[]) || []) as Row[]

  if (!params.get('class_id')) {
    return (
      <DetailShell title="Session Detail" backTo="/trainer/attendance">
        <p style={{ fontSize: 13, color: '#64748b' }}>
          Open this page from attendance after selecting class, unit, week and lesson, or append query params.
        </p>
        <Link to="/trainer/attendance" style={{ color: '#1d4ed8', fontWeight: 700, fontSize: 13 }}>Go to attendance →</Link>
      </DetailShell>
    )
  }

  return (
    <DetailShell
      title="Attendance Session"
      backTo="/trainer/attendance"
      subtitle={`${cell(q.data || {}, 'class.name')} · ${cell(q.data || {}, 'unit.code')} · Week ${params.get('week')} · ${params.get('lesson')}`}
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
    >
      <DetailCard title={`Records (${records.length})`}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Trainee', 'Admission', 'Date', 'Status'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, color: '#64748b' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={String(r.id)} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>{cell(r, 'user_profiles.full_name')}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>{cell(r, 'user_profiles.admission_no')}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>{cell(r, 'attendance_date')}</td>
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
