import { Link } from 'react-router-dom'
import { PortalShell } from '@/layouts/PortalShell'
import { ApiTablePage, StatusPill, cell } from '@/pages/shared/ApiTablePage'
import { InteractiveTablePage } from '@/pages/shared/InteractiveTablePage'

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

export { default as StudentDocumentsPage } from '@/pages/student/MyDocumentsPage'
export { default as StudentExamBookingsPage } from '@/pages/student/ExamBookingsPage'
export { default as StudentExamBookingFormPage } from '@/pages/student/ExamBookingNewPage'
export { default as StudentIndustrialAttachmentPage } from '@/pages/student/IndustrialAttachmentPage'
export { default as StudentLogbookPage } from '@/pages/student/LogbookPage'

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
