import { deleteAction, postAction } from '@/api/mutations'
import { ApiTablePage, StatusPill, cell } from '@/pages/shared/ApiTablePage'
import { InteractiveTablePage } from '@/pages/shared/InteractiveTablePage'
import type { Row } from '@/api/portals'

/** Thin wrappers for specialist-role sidebar destinations. */

export function ExamOfficerBookingsPage() {
  return (
    <InteractiveTablePage
      title="Approved Exam Bookings"
      subtitle="Confirm HOD-approved Form 1A bookings for the examination office."
      endpoint="/examination-officer/exam-bookings"
      rowsKey="bookings"
      columns={[
        {
          key: 'student',
          label: 'Trainee',
          render: (r) => (
            <div>
              <div style={{ fontWeight: 700 }}>{cell(r, 'user_profiles.full_name')}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{cell(r, 'user_profiles.admission_no', '')}</div>
            </div>
          ),
        },
        {
          key: 'unit',
          label: 'Unit',
          render: (r) => (
            <div>
              <div style={{ fontWeight: 600 }}>{cell(r, 'units.name')}</div>
              <div style={{ fontSize: 11, color: '#1d4ed8' }}>{cell(r, 'units.code', '')}</div>
            </div>
          ),
        },
        { key: 'exam_date', label: 'Exam Date' },
        { key: 'exam_session', label: 'Session' },
        {
          key: 'status',
          label: 'Status',
          render: (r) => <StatusPill value={r.status} />,
        },
      ]}
      actions={[
        {
          label: 'Confirm',
          tone: 'primary',
          when: (r) => String(r.status || '') === 'approved',
          run: (row) => postAction(`/examination-officer/exam-bookings/${row.id}/confirm`),
        },
      ]}
    />
  )
}

export function ExamOfficerMarksPage() {
  return (
    <ApiTablePage
      title="Marks Report"
      subtitle="Read-only formative marks across classes and units."
      endpoint="/examination-officer/marks"
      rowsKey="marks"
      columns={[
        { key: 'user_profiles.full_name', label: 'Trainee', render: (r) => cell(r, 'user_profiles.full_name') },
        { key: 'user_profiles.admission_no', label: 'Admission', render: (r) => cell(r, 'user_profiles.admission_no') },
        { key: 'units.code', label: 'Unit', render: (r) => cell(r, 'units.code') },
        { key: 'classes.name', label: 'Class', render: (r) => cell(r, 'classes.name') },
        { key: 'score', label: 'Score' },
        { key: 'grade', label: 'Grade' },
        { key: 'term', label: 'Term' },
        { key: 'year', label: 'Year' },
      ]}
    />
  )
}

export function WorkshopInventoryPage() {
  return (
    <InteractiveTablePage
      title="Workshop Inventory"
      subtitle="Tools and equipment registered for your department workshop."
      endpoint="/workshop-technician/inventory"
      rowsKey="items"
      columns={[
        { key: 'item_name', label: 'Item' },
        { key: 'category', label: 'Category' },
        { key: 'quantity', label: 'Qty' },
        { key: 'condition', label: 'Condition', render: (r) => <StatusPill value={r.condition} /> },
        { key: 'location', label: 'Location' },
      ]}
      createLabel="Add item"
      createFields={[
        { name: 'item_name', label: 'Item name', required: true },
        { name: 'category', label: 'Category' },
        { name: 'quantity', label: 'Quantity', type: 'number', required: true },
        {
          name: 'condition',
          label: 'Condition',
          type: 'select',
          required: true,
          options: [
            { value: 'good', label: 'Good' },
            { value: 'fair', label: 'Fair' },
            { value: 'poor', label: 'Poor' },
            { value: 'damaged', label: 'Damaged' },
          ],
        },
        { name: 'location', label: 'Location' },
      ]}
      actions={[
        {
          label: 'Delete',
          tone: 'danger',
          run: (row) => deleteAction(`/workshop-technician/inventory/${row.id}`),
        },
      ]}
    />
  )
}

function personCol(key = 'user_profiles') {
  return {
    key,
    label: 'Trainee',
    render: (r: Row) => (
      <div>
        <div style={{ fontWeight: 700 }}>{cell(r, `${key}.full_name`)}</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{cell(r, `${key}.admission_no`, '')}</div>
      </div>
    ),
  }
}

export function IndustryMentorTraineesPage() {
  return (
    <ApiTablePage
      title="Assigned Trainees"
      endpoint="/industry-mentor/trainees"
      rowsKey="trainees"
      columns={[
        personCol(),
        { key: 'companies.name', label: 'Company', render: (r) => cell(r, 'companies.name') },
        { key: 'units.name', label: 'Unit', render: (r) => cell(r, 'units.name') },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      ]}
    />
  )
}

export function IndustryMentorLogbookPage() {
  return (
    <InteractiveTablePage
      title="Logbook Review"
      endpoint="/industry-mentor/logbook"
      rowsKey="entries"
      columns={[
        personCol(),
        { key: 'week_number', label: 'Week' },
        { key: 'activities', label: 'Activities' },
        {
          key: 'mentor_approval_status',
          label: 'Status',
          render: (r) => <StatusPill value={r.mentor_approval_status || r.status} />,
        },
      ]}
      actions={[
        {
          label: 'Approve',
          tone: 'primary',
          when: (r) => String(r.mentor_approval_status || r.status || '') === 'pending',
          run: (row) => postAction(`/industry-mentor/logbook/${row.id}/approve`),
        },
        {
          label: 'Reject',
          tone: 'danger',
          requireComment: true,
          when: (r) => String(r.mentor_approval_status || r.status || '') === 'pending',
          run: (row, comment) =>
            postAction(`/industry-mentor/logbook/${row.id}/reject`, { comments: comment }),
        },
      ]}
    />
  )
}

export function IndustryMentorCompetencyPage() {
  return (
    <InteractiveTablePage
      title="Competency Assessment"
      endpoint="/industry-mentor/competency"
      rowsKey="competencies"
      columns={[
        personCol(),
        { key: 'units.name', label: 'Unit', render: (r) => cell(r, 'units.name') },
        { key: 'competency_name', label: 'Competency' },
        {
          key: 'verification_status',
          label: 'Status',
          render: (r) => <StatusPill value={r.verification_status} />,
        },
      ]}
      actions={[
        {
          label: 'Verify',
          tone: 'primary',
          when: (r) => String(r.verification_status || '') !== 'verified',
          run: (row) => postAction(`/industry-mentor/competency/${row.id}/verify`),
        },
      ]}
    />
  )
}

export function IndustryMentorWeeklyAttendancePage() {
  return (
    <ApiTablePage
      title="Weekly Attendance"
      endpoint="/industry-mentor/weekly-attendance"
      rowsKey="records"
      columns={[
        { key: 'attachment_id', label: 'Attachment' },
        { key: 'week_ending', label: 'Week Ending' },
        { key: 'days_present', label: 'Present' },
        { key: 'days_absent', label: 'Absent' },
      ]}
    />
  )
}

export function IndustryMentorLocationPage() {
  return (
    <ApiTablePage
      title="Location Tracking"
      endpoint="/industry-mentor/location"
      rowsKey="placements"
      columns={[
        personCol(),
        { key: 'companies.name', label: 'Company', render: (r) => cell(r, 'companies.name') },
        { key: 'companies.address', label: 'Address', render: (r) => cell(r, 'companies.address') },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      ]}
    />
  )
}

export function InternalVerifierCompetencyPage() {
  return (
    <ApiTablePage
      title="Competency Verification"
      endpoint="/internal-verifier/competency"
      rowsKey="competencies"
      columns={[
        personCol(),
        { key: 'units.name', label: 'Unit', render: (r) => cell(r, 'units.name') },
        { key: 'competency_name', label: 'Competency' },
        {
          key: 'verification_status',
          label: 'Status',
          render: (r) => <StatusPill value={r.verification_status} />,
        },
      ]}
    />
  )
}

export function InternalVerifierAttachmentsPage() {
  return (
    <ApiTablePage
      title="Attachment Records"
      endpoint="/internal-verifier/attachments"
      rowsKey="attachments"
      columns={[
        personCol(),
        { key: 'companies.name', label: 'Company', render: (r) => cell(r, 'companies.name') },
        { key: 'units.name', label: 'Unit', render: (r) => cell(r, 'units.name') },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      ]}
    />
  )
}

export function LiaisonPeriodsPage() {
  return (
    <ApiTablePage
      title="Attachment Periods"
      endpoint="/liaison-officer/periods"
      rowsKey="periods"
      columns={[
        { key: 'name', label: 'Period' },
        { key: 'start_date', label: 'Start' },
        { key: 'end_date', label: 'End' },
        {
          key: 'is_open',
          label: 'Open',
          render: (r) => <StatusPill value={r.is_open ? 'active' : 'pending'} />,
        },
      ]}
    />
  )
}

export function LiaisonAttachmentsPage() {
  return (
    <InteractiveTablePage
      title="Placement Reviews"
      endpoint="/liaison-officer/attachments"
      rowsKey="attachments"
      columns={[
        personCol(),
        { key: 'companies.name', label: 'Company', render: (r) => cell(r, 'companies.name') },
        { key: 'units.name', label: 'Unit', render: (r) => cell(r, 'units.name') },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      ]}
      actions={[
        {
          label: 'Approve',
          tone: 'primary',
          when: (r) => ['pending', 'submitted'].includes(String(r.status || '')),
          run: (row) => postAction(`/liaison-officer/attachments/${row.id}/approve`),
        },
        {
          label: 'Reject',
          tone: 'danger',
          requireComment: true,
          when: (r) => ['pending', 'submitted'].includes(String(r.status || '')),
          run: (row, comment) =>
            postAction(`/liaison-officer/attachments/${row.id}/reject`, { comments: comment }),
        },
      ]}
    />
  )
}

export function LiaisonLogbooksPage() {
  return (
    <ApiTablePage
      title="Digital Logbooks"
      endpoint="/liaison-officer/logbooks"
      rowsKey="entries"
      columns={[
        personCol(),
        { key: 'week_number', label: 'Week' },
        { key: 'activities', label: 'Activities' },
        {
          key: 'mentor_approval_status',
          label: 'Status',
          render: (r) => <StatusPill value={r.mentor_approval_status || r.status} />,
        },
      ]}
    />
  )
}

export function LiaisonAttachmentMarksPage() {
  return (
    <ApiTablePage
      title="Attachment Marks"
      endpoint="/liaison-officer/attachment-marks"
      rowsKey="marks"
      columns={[
        personCol(),
        { key: 'companies.name', label: 'Company', render: (r) => cell(r, 'companies.name') },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      ]}
    />
  )
}

export function LiaisonMentoringToolsPage() {
  return (
    <ApiTablePage
      title="Mentoring Tool / Logbooks"
      endpoint="/liaison-officer/mentoring-tools"
      rowsKey="tools"
      columns={[
        { key: 'companies.name', label: 'Company', render: (r) => cell(r, 'companies.name') },
        { key: 'file_name', label: 'File' },
        { key: 'uploaded_at', label: 'Uploaded' },
        { key: 'created_at', label: 'Created' },
      ]}
    />
  )
}

export function LiaisonCompaniesPage() {
  return (
    <ApiTablePage
      title="Industry Partners"
      endpoint="/liaison-officer/companies"
      rowsKey="companies"
      columns={[
        { key: 'name', label: 'Company' },
        { key: 'address', label: 'Address' },
        { key: 'contact_person', label: 'Contact' },
        { key: 'phone', label: 'Phone' },
      ]}
    />
  )
}

export function CdaccTrainerDocumentsPage() {
  return (
    <ApiTablePage
      title="Trainer Documents"
      endpoint="/cdacc-verifier/trainer-documents"
      rowsKey="documents"
      columns={[
        {
          key: 'trainer',
          label: 'Trainer',
          render: (r) => cell(r, 'user_profiles.full_name'),
        },
        { key: 'document_type', label: 'Type' },
        { key: 'file_name', label: 'File' },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      ]}
    />
  )
}

export function CdaccMarksPage() {
  return (
    <ApiTablePage
      title="Formative Marks List"
      endpoint="/cdacc-verifier/marks"
      rowsKey="marks"
      columns={[
        { key: 'user_profiles.full_name', label: 'Trainee', render: (r) => cell(r, 'user_profiles.full_name') },
        { key: 'units.code', label: 'Unit', render: (r) => cell(r, 'units.code') },
        { key: 'classes.name', label: 'Class', render: (r) => cell(r, 'classes.name') },
        { key: 'score', label: 'Score' },
        { key: 'grade', label: 'Grade' },
      ]}
    />
  )
}

export function CdaccTraineesPage() {
  return (
    <ApiTablePage
      title="Trainee Profiles"
      endpoint="/cdacc-verifier/trainees"
      rowsKey="trainees"
      columns={[
        { key: 'full_name', label: 'Name' },
        { key: 'admission_no', label: 'Admission' },
        { key: 'email', label: 'Email' },
        { key: 'departments.name', label: 'Department', render: (r) => cell(r, 'departments.name') },
      ]}
    />
  )
}

export function CdaccTraineePoePage() {
  return (
    <ApiTablePage
      title="Trainee Assessment POE"
      endpoint="/cdacc-verifier/trainee-poe"
      rowsKey="assessments"
      columns={[
        personCol(),
        { key: 'units.name', label: 'Unit', render: (r) => cell(r, 'units.name') },
        { key: 'assessment_type', label: 'Type' },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      ]}
    />
  )
}

export function CdaccAttachmentMarksPage() {
  return (
    <ApiTablePage
      title="Attachment Marks"
      endpoint="/cdacc-verifier/attachment-marks"
      rowsKey="marks"
      columns={[
        {
          key: 'trainee',
          label: 'Trainee',
          render: (r) => cell(r, 'industrial_attachments.user_profiles.full_name'),
        },
        {
          key: 'company',
          label: 'Company',
          render: (r) => cell(r, 'industrial_attachments.companies.name'),
        },
        { key: 'total_score', label: 'Score' },
        { key: 'grade', label: 'Grade' },
      ]}
    />
  )
}

export function CdaccMentoringToolsPage() {
  return (
    <ApiTablePage
      title="Mentoring Tool / Logbooks"
      endpoint="/cdacc-verifier/mentoring-tools"
      rowsKey="tools"
      columns={[
        { key: 'companies.name', label: 'Company', render: (r) => cell(r, 'companies.name') },
        { key: 'file_name', label: 'File' },
        { key: 'created_at', label: 'Uploaded' },
      ]}
    />
  )
}

export function CdaccDigitalLogbookPage() {
  return (
    <ApiTablePage
      title="Digital Logbook"
      endpoint="/cdacc-verifier/digital-logbook"
      rowsKey="entries"
      columns={[
        personCol(),
        { key: 'week_number', label: 'Week' },
        { key: 'activities', label: 'Activities' },
        {
          key: 'mentor_approval_status',
          label: 'Status',
          render: (r) => <StatusPill value={r.mentor_approval_status || r.status} />,
        },
      ]}
    />
  )
}

export function OversightClearancesPage({ endpoint, title }: { endpoint: string; title: string }) {
  return (
    <ApiTablePage
      title={title}
      endpoint={endpoint}
      rowsKey="pending_clearances"
      columns={[
        {
          key: 'student',
          label: 'Student',
          render: (r) => cell(r, 'user_profiles.full_name'),
        },
        { key: 'departments.name', label: 'Department', render: (r) => cell(r, 'departments.name') },
        { key: 'courses.name', label: 'Course', render: (r) => cell(r, 'courses.name') },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      ]}
    />
  )
}

export function OversightAdmissionsPage() {
  return (
    <ApiTablePage
      title="Admission Requests"
      endpoint="/admin-oversight/registrar/admissions"
      rowsKey="pending_admissions"
      columns={[
        { key: 'full_name', label: 'Applicant' },
        { key: 'email', label: 'Email' },
        { key: 'departments.name', label: 'Department', render: (r) => cell(r, 'departments.name') },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      ]}
    />
  )
}

export function OversightAcademicPage() {
  return (
    <ApiTablePage
      title="Academic Overview"
      endpoint="/admin-oversight/deputy-principal/academic"
      rowsKey="departments"
      columns={[
        { key: 'name', label: 'Department' },
        { key: 'code', label: 'Code' },
      ]}
    />
  )
}

export function QaReportsPage() {
  return (
    <ApiTablePage
      title="Performance Reports"
      endpoint="/admin-oversight/quality-assurance/reports"
      rowsKey="departments"
      columns={[
        { key: 'name', label: 'Department' },
        { key: 'code', label: 'Code' },
      ]}
    />
  )
}

export function QaApprovalsPage() {
  return (
    <ApiTablePage
      title="Assessment Approvals"
      endpoint="/admin-oversight/quality-assurance/approvals"
      rowsKey="assessments"
      columns={[
        personCol(),
        { key: 'units.name', label: 'Unit', render: (r) => cell(r, 'units.name') },
        { key: 'assessment_type', label: 'Type' },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      ]}
    />
  )
}
