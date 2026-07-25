import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, getApiErrorMessage } from '@/lib/apiClient'
import { postAction } from '@/api/mutations'
import { PortalShell } from '@/layouts/PortalShell'
import { ErrorState, PageSkeleton } from '@/components/ui/States'
import { ApiTablePage, StatusPill, cell } from '@/pages/shared/ApiTablePage'
import { InteractiveTablePage } from '@/pages/shared/InteractiveTablePage'
import type { Row } from '@/api/portals'

export function StudentAssessmentsPage() {
  return (
    <ApiTablePage
      title="My Assessments"
      endpoint="/student/assessments"
      rowsKey="items"
      columns={[
        { key: 'units.name', label: 'Unit', render: (r) => cell(r, 'units.name') },
        { key: 'assessment_type', label: 'Type' },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
        { key: 'uploaded_at', label: 'Uploaded' },
      ]}
    />
  )
}

export function StudentPortfolioPage() {
  return (
    <ApiTablePage
      title="Portfolio of Evidence"
      endpoint="/student/portfolio"
      rowsKey="items"
      columns={[
        { key: 'units.name', label: 'Unit', render: (r) => cell(r, 'units.name') },
        { key: 'assessment_type', label: 'Type' },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      ]}
    />
  )
}

export function StudentDocumentsPage() {
  return (
    <ApiTablePage
      title="My Documents"
      endpoint="/student/documents"
      rowsKey="items"
      columns={[
        { key: 'document_type', label: 'Type' },
        { key: 'file_name', label: 'File' },
        { key: 'created_at', label: 'Uploaded' },
      ]}
    />
  )
}

export function StudentExamBookingsPage() {
  return (
    <ApiTablePage
      title="My Exam Bookings"
      endpoint="/student/exam-bookings"
      rowsKey="items"
      columns={[
        { key: 'units.name', label: 'Unit', render: (r) => cell(r, 'units.name') },
        { key: 'exam_date', label: 'Exam Date' },
        { key: 'exam_session', label: 'Session' },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      ]}
    />
  )
}

export function StudentExamBookingFormPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    unit_id: '',
    exam_date: '',
    exam_session: 'morning',
    year: String(new Date().getFullYear()),
    term: '1',
  })
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const unitsQ = useQuery({
    queryKey: ['portal-table', '/student/exam-booking-form'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/student/exam-booking-form')
      return data.data as Record<string, unknown>
    },
  })

  const submit = useMutation({
    mutationFn: async () => {
      await postAction('/student/exam-bookings', {
        unit_id: form.unit_id,
        exam_date: form.exam_date,
        exam_session: form.exam_session,
        year: Number(form.year) || new Date().getFullYear(),
        term: Number(form.term) || 1,
      })
    },
    onSuccess: () => {
      setMsg('Exam booking submitted.')
      setErr(null)
      setForm((f) => ({ ...f, unit_id: '', exam_date: '' }))
      void qc.invalidateQueries({ queryKey: ['portal-table'] })
    },
    onError: (e) => {
      setErr(getApiErrorMessage(e))
      setMsg(null)
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.unit_id || !form.exam_date) {
      setErr('Unit and exam date are required.')
      return
    }
    submit.mutate()
  }

  if (unitsQ.isLoading) {
    return (
      <PortalShell title="Exam Booking Form">
        <PageSkeleton />
      </PortalShell>
    )
  }
  if (unitsQ.isError) {
    return (
      <PortalShell title="Exam Booking Form">
        <div className="p-6">
          <ErrorState message={getApiErrorMessage(unitsQ.error)} onRetry={() => void unitsQ.refetch()} />
        </div>
      </PortalShell>
    )
  }

  const units = ((unitsQ.data?.items as Row[]) || []) as Row[]
  const inputStyle: CSSProperties = {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    fontWeight: 500,
    color: '#0f172a',
  }

  return (
    <PortalShell title="Exam Booking Form">
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 18 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>Exam Booking Form</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
            Submit a Form 1A exam booking. Track status under{' '}
            <Link to="/student/exam-bookings" style={{ color: '#1d4ed8', fontWeight: 700 }}>
              My Exam Bookings
            </Link>
            .
          </p>
        </div>

        {msg ? (
          <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#dcfce7', color: '#166534', fontSize: 13 }}>
            {msg}
          </div>
        ) : null}
        {err ? (
          <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#fee2e2', color: '#991b1b', fontSize: 13 }}>
            {err}
          </div>
        ) : null}

        <form
          onSubmit={onSubmit}
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 16,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
            gap: 12,
            maxWidth: 880,
          }}
        >
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>
            Unit
            <select
              value={form.unit_id}
              required
              onChange={(e) => setForm((f) => ({ ...f, unit_id: e.target.value }))}
              style={inputStyle}
            >
              <option value="">Select…</option>
              {units.map((u) => (
                <option key={String(u.id)} value={String(u.id)}>
                  {String(u.code || '')} — {String(u.name || '')}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>
            Exam date
            <input
              type="date"
              value={form.exam_date}
              required
              onChange={(e) => setForm((f) => ({ ...f, exam_date: e.target.value }))}
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>
            Session
            <select
              value={form.exam_session}
              onChange={(e) => setForm((f) => ({ ...f, exam_session: e.target.value }))}
              style={inputStyle}
            >
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>
            Year
            <input
              type="number"
              value={form.year}
              required
              onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>
            Term
            <select
              value={form.term}
              onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))}
              style={inputStyle}
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </label>
          <div style={{ gridColumn: '1 / -1' }}>
            <button
              type="submit"
              disabled={submit.isPending}
              style={{
                border: 'none',
                background: '#0f172a',
                color: '#fff',
                borderRadius: 8,
                padding: '10px 16px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {submit.isPending ? 'Submitting…' : 'Submit booking'}
            </button>
          </div>
        </form>
      </div>
    </PortalShell>
  )
}

export function StudentIndustrialAttachmentPage() {
  return (
    <ApiTablePage
      title="Attachment Placement & Letter Review"
      endpoint="/student/industrial-attachment"
      rowsKey="items"
      columns={[
        { key: 'companies.name', label: 'Company', render: (r) => cell(r, 'companies.name') },
        { key: 'units.name', label: 'Unit', render: (r) => cell(r, 'units.name') },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      ]}
    />
  )
}

export function StudentLogbookPage() {
  return (
    <InteractiveTablePage
      title="Digital Logbook"
      endpoint="/student/logbook"
      rowsKey="items"
      columns={[
        { key: 'week_number', label: 'Week' },
        { key: 'activities', label: 'Activities' },
        { key: 'entry_date', label: 'Date' },
        {
          key: 'mentor_approval_status',
          label: 'Status',
          render: (r) => <StatusPill value={r.mentor_approval_status || r.status} />,
        },
      ]}
      createLabel="Add entry"
      createFields={[
        { name: 'activities', label: 'Activities', type: 'textarea', required: true },
        { name: 'week_number', label: 'Week number', type: 'number', required: true },
        { name: 'entry_date', label: 'Entry date', type: 'date', required: true },
      ]}
    />
  )
}

export function StudentAttachmentMarksPage() {
  return (
    <ApiTablePage
      title="My Attachment Marks"
      endpoint="/student/attachment-marks"
      rowsKey="items"
      columns={[
        { key: 'total_score', label: 'Score' },
        { key: 'grade', label: 'Grade' },
        { key: 'created_at', label: 'Recorded' },
      ]}
    />
  )
}

export function StudentMentoringToolPage() {
  return (
    <ApiTablePage
      title="Mentoring Tool / Logbook"
      endpoint="/student/mentoring-tool"
      rowsKey="items"
      columns={[
        { key: 'companies.name', label: 'Company', render: (r) => cell(r, 'companies.name') },
        { key: 'file_name', label: 'File' },
        { key: 'created_at', label: 'Uploaded' },
      ]}
    />
  )
}

export function StudentEmploymentStatusPage() {
  return (
    <InteractiveTablePage
      title="Employment Status"
      endpoint="/student/employment-status"
      rowsKey="items"
      columns={[
        { key: 'employer_name', label: 'Employer' },
        { key: 'position', label: 'Position' },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
        { key: 'start_date', label: 'Start' },
      ]}
      createLabel="Add status"
      createFields={[
        { name: 'employer_name', label: 'Employer', required: true },
        { name: 'position', label: 'Position', required: true },
        { name: 'status', label: 'Status', required: true },
        { name: 'start_date', label: 'Start date', type: 'date' },
      ]}
    />
  )
}

export function StudentSummativePage() {
  return (
    <ApiTablePage
      title="Summative Assessment"
      endpoint="/student/summative"
      rowsKey="items"
      columns={[
        { key: 'units.name', label: 'Unit', render: (r) => cell(r, 'units.name') },
        { key: 'competence', label: 'Competence' },
        { key: 'result', label: 'Result' },
      ]}
    />
  )
}

export function TrainerAttendanceHistoryPage() {
  return (
    <ApiTablePage
      title="View & Download Attendance"
      endpoint="/trainer/attendance-history"
      rowsKey="items"
      columns={[
        { key: 'user_profiles.full_name', label: 'Trainee', render: (r) => cell(r, 'user_profiles.full_name') },
        { key: 'units.code', label: 'Unit', render: (r) => cell(r, 'units.code') },
        { key: 'classes.name', label: 'Class', render: (r) => cell(r, 'classes.name') },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
        { key: 'attendance_date', label: 'Date' },
      ]}
    />
  )
}

export function TrainerPortfolioPage() {
  return (
    <ApiTablePage
      title="My Portfolio (POE)"
      endpoint="/trainer/portfolio"
      rowsKey="items"
      columns={[
        { key: 'document_type', label: 'Type' },
        { key: 'file_name', label: 'File' },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      ]}
    />
  )
}

export function TrainerMarksImportPage() {
  return (
    <PortalShell title="Import Marks">
      <div style={{ padding: 24 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>Import Marks</h1>
        <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 13 }}>
          Bulk marks import uses Excel templates. Use Marks Entry for interactive scoring, or upload via the import
          workflow when enabled.
        </p>
        <Link to="/trainer/marks-entry" style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 13 }}>
          Go to Marks Entry →
        </Link>
      </div>
    </PortalShell>
  )
}
