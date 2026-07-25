import { ApiTablePage, StatusPill, cell } from '@/pages/shared/ApiTablePage'

function person(key = 'user_profiles') {
  return {
    key,
    label: 'Name',
    render: (r: Record<string, unknown>) => (
      <div>
        <div style={{ fontWeight: 700 }}>{cell(r, `${key}.full_name`)}</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          {cell(r, `${key}.admission_no`, '') || cell(r, `${key}.staff_no`, '')}
        </div>
      </div>
    ),
  }
}

function list(title: string, endpoint: string, columns: Parameters<typeof ApiTablePage>[0]['columns'], rowsKey = 'items') {
  return function AdminListPage() {
    return <ApiTablePage title={title} endpoint={endpoint} rowsKey={rowsKey} columns={columns} />
  }
}

export const SuperAdminUsersPage = list('All Users', '/super-admin/users', [
  { key: 'full_name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role', render: (r) => <StatusPill value={r.role} /> },
  { key: 'admission_no', label: 'Admission' },
  { key: 'staff_no', label: 'Staff No' },
  { key: 'departments.name', label: 'Department', render: (r) => cell(r, 'departments.name') },
  {
    key: 'is_active',
    label: 'Active',
    render: (r) => <StatusPill value={r.is_active ? 'active' : 'rejected'} />,
  },
], 'users')

export const SuperAdminDepartmentsPage = list('Departments', '/super-admin/departments', [
  { key: 'name', label: 'Name' },
  { key: 'code', label: 'Code' },
])

export const SuperAdminCoursesPage = list('Courses', '/super-admin/courses', [
  { key: 'name', label: 'Course' },
  { key: 'code', label: 'Code' },
  { key: 'departments.name', label: 'Department', render: (r) => cell(r, 'departments.name') },
])

export const SuperAdminClassesPage = list('Classes', '/super-admin/classes', [
  { key: 'name', label: 'Class' },
  { key: 'departments.name', label: 'Department', render: (r) => cell(r, 'departments.name') },
  { key: 'courses.name', label: 'Course', render: (r) => cell(r, 'courses.name') },
])

export const SuperAdminUnitsPage = list('Units', '/super-admin/units', [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'departments.name', label: 'Department', render: (r) => cell(r, 'departments.name') },
])

export const SuperAdminAssessmentsPage = list('Trainees POE', '/super-admin/assessments', [
  person(),
  { key: 'units.name', label: 'Unit', render: (r) => cell(r, 'units.name') },
  { key: 'assessment_type', label: 'Type' },
  { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
])

export const SuperAdminAttendancePage = list('Attendance Records', '/super-admin/attendance', [
  person(),
  { key: 'units.code', label: 'Unit', render: (r) => cell(r, 'units.code') },
  { key: 'classes.name', label: 'Class', render: (r) => cell(r, 'classes.name') },
  { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
  { key: 'attendance_date', label: 'Date' },
])

export const SuperAdminClearancesPage = list('All Clearance Requests', '/super-admin/clearances', [
  person(),
  { key: 'departments.name', label: 'Department', render: (r) => cell(r, 'departments.name') },
  { key: 'courses.name', label: 'Course', render: (r) => cell(r, 'courses.name') },
  { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
])

export const SuperAdminExamBookingsPage = list('Exam Booking Approvals', '/super-admin/exam-bookings', [
  person('user_profiles'),
  { key: 'units.name', label: 'Unit', render: (r) => cell(r, 'units.name') },
  { key: 'exam_date', label: 'Exam Date' },
  { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
])

export const SuperAdminMarksPage = list('Marks Report', '/super-admin/marks', [
  person('user_profiles'),
  { key: 'units.code', label: 'Unit', render: (r) => cell(r, 'units.code') },
  { key: 'score', label: 'Score' },
  { key: 'grade', label: 'Grade' },
  { key: 'term', label: 'Term' },
])

export const SuperAdminAttachmentsPage = list('Attachment Approval Records', '/super-admin/attachments', [
  person(),
  { key: 'companies.name', label: 'Company', render: (r) => cell(r, 'companies.name') },
  { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
])

export const SuperAdminCompaniesPage = list('Industry Partners', '/super-admin/companies', [
  { key: 'name', label: 'Company' },
  { key: 'address', label: 'Address' },
  { key: 'contact_person', label: 'Contact' },
  { key: 'phone', label: 'Phone' },
])

export const SuperAdminLogsPage = list('Audit Logs', '/super-admin/logs', [
  { key: 'user_profiles.full_name', label: 'User', render: (r) => cell(r, 'user_profiles.full_name', 'System') },
  { key: 'actor_role', label: 'Role' },
  { key: 'action', label: 'Action' },
  { key: 'target', label: 'Target' },
  { key: 'created_at', label: 'Time' },
])

export const SuperAdminLogbooksPage = list('Digital Logbooks', '/super-admin/logbooks', [
  person(),
  { key: 'week_number', label: 'Week' },
  { key: 'activities', label: 'Activities' },
  { key: 'mentor_approval_status', label: 'Status', render: (r) => <StatusPill value={r.mentor_approval_status} /> },
])

export const SuperAdminNoticesPage = list('Send Notice / Memo', '/super-admin/notices', [
  { key: 'title', label: 'Title' },
  { key: 'audience', label: 'Audience' },
  { key: 'created_at', label: 'Sent' },
])

export const SuperAdminBiometricPage = list('Scanner Registration', '/super-admin/biometric-scanners', [
  { key: 'name', label: 'Scanner' },
  { key: 'serial_number', label: 'Serial' },
  { key: 'location', label: 'Location' },
  { key: 'is_active', label: 'Active', render: (r) => <StatusPill value={r.is_active ? 'active' : 'rejected'} /> },
])

export const SuperAdminCredentialsPage = list('Manage Credentials', '/super-admin/credentials', [
  { key: 'full_name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role', render: (r) => <StatusPill value={r.role} /> },
  {
    key: 'must_change_password',
    label: 'Must Change Pwd',
    render: (r) => <StatusPill value={r.must_change_password ? 'pending' : 'approved'} />,
  },
])

export const SuperAdminTraineesDocsPage = list('All Trainees Documents', '/super-admin/trainees-documents', [
  person(),
  { key: 'document_type', label: 'Type' },
  { key: 'file_name', label: 'File' },
  { key: 'created_at', label: 'Uploaded' },
])

export const SuperAdminClassListPage = list('Class List', '/super-admin/class-list', [
  { key: 'name', label: 'Class' },
  { key: 'departments.name', label: 'Department', render: (r) => cell(r, 'departments.name') },
  { key: 'courses.name', label: 'Course', render: (r) => cell(r, 'courses.name') },
])

export const SuperAdminTraineeSearchPage = list('Attendance Search', '/super-admin/trainee-search', [
  { key: 'full_name', label: 'Name' },
  { key: 'admission_no', label: 'Admission' },
  { key: 'email', label: 'Email' },
  { key: 'departments.name', label: 'Department', render: (r) => cell(r, 'departments.name') },
])

export const SuperAdminAssessmentSheetPage = list('Assessment Sheets', '/super-admin/assessment-sheet', [
  person(),
  { key: 'units.code', label: 'Unit', render: (r) => cell(r, 'units.code') },
  { key: 'classes.name', label: 'Class', render: (r) => cell(r, 'classes.name') },
  { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
])

export const SuperAdminTrainerPoePage = list('Trainer POE', '/super-admin/trainer-poe', [
  person(),
  { key: 'document_type', label: 'Type' },
  { key: 'file_name', label: 'File' },
  { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
])

export const SuperAdminAttachmentMarksPage = list('Attachment Marks', '/super-admin/attachment-marks', [
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
])

export const SuperAdminMentoringToolsPage = list('Mentoring Tool / Logbooks', '/super-admin/mentoring-tools', [
  { key: 'companies.name', label: 'Company', render: (r) => cell(r, 'companies.name') },
  { key: 'file_name', label: 'File' },
  { key: 'created_at', label: 'Uploaded' },
])

export const SuperAdminGisPage = list('GIS Placements & Logbook', '/super-admin/gis-tracking', [
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
  { key: 'latitude', label: 'Lat' },
  { key: 'longitude', label: 'Lng' },
  { key: 'created_at', label: 'Logged' },
])

export const SuperAdminServiceClearancePage = list('Service Clearance', '/super-admin/service-clearance', [
  {
    key: 'student',
    label: 'Student',
    render: (r) => cell(r, 'clearance_requests.user_profiles.full_name'),
  },
  { key: 'approver_category', label: 'Category' },
  { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
])

export const SuperAdminImportPage = list('Import Data', '/super-admin/import', [
  { key: 'name', label: 'Template' },
])

/* ── Dept admin ──────────────────────────────────────────────────────────── */

export const DeptCoursesPage = list('Courses', '/dept-admin/courses', [
  { key: 'name', label: 'Course' },
  { key: 'code', label: 'Code' },
])
export const DeptClassesPage = list('Classes', '/dept-admin/classes', [
  { key: 'name', label: 'Class' },
  { key: 'courses.name', label: 'Course', render: (r) => cell(r, 'courses.name') },
])
export const DeptTrainersPage = list('Trainers', '/dept-admin/trainers', [
  { key: 'full_name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'staff_no', label: 'Staff No' },
])
export const DeptStudentsPage = list('Students', '/dept-admin/students', [
  { key: 'full_name', label: 'Name' },
  { key: 'admission_no', label: 'Admission' },
  { key: 'email', label: 'Email' },
])
export const DeptUnitsPage = list('Units', '/dept-admin/units', [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
])
export const DeptAttendancePage = list('Unit Attendance', '/dept-admin/attendance', [
  person(),
  { key: 'units.code', label: 'Unit', render: (r) => cell(r, 'units.code') },
  { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
  { key: 'attendance_date', label: 'Date' },
])
export const DeptExamBookingsPage = list('Exam Booking Approvals', '/dept-admin/exam-bookings', [
  person('user_profiles'),
  { key: 'units.name', label: 'Unit', render: (r) => cell(r, 'units.name') },
  { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
])
export const DeptMarksPage = list('Marks Reports', '/dept-admin/marks', [
  person('user_profiles'),
  { key: 'units.code', label: 'Unit', render: (r) => cell(r, 'units.code') },
  { key: 'score', label: 'Score' },
  { key: 'grade', label: 'Grade' },
])
export const DeptAttachmentsPage = list('Attachment Approvals', '/dept-admin/attachments', [
  person(),
  { key: 'companies.name', label: 'Company', render: (r) => cell(r, 'companies.name') },
  { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
])
export const DeptCompaniesPage = list('Industry Partners', '/dept-admin/companies', [
  { key: 'name', label: 'Company' },
  { key: 'address', label: 'Address' },
  { key: 'phone', label: 'Phone' },
])
export const DeptLogbooksPage = list('Digital Logbooks', '/dept-admin/logbooks', [
  person(),
  { key: 'week_number', label: 'Week' },
  { key: 'mentor_approval_status', label: 'Status', render: (r) => <StatusPill value={r.mentor_approval_status} /> },
])
export const DeptTraineesDocsPage = list('Trainee Documents', '/dept-admin/trainees-documents', [
  person(),
  { key: 'document_type', label: 'Type' },
  { key: 'file_name', label: 'File' },
])
export const DeptCredentialsPage = list('Manage Credentials', '/dept-admin/credentials', [
  { key: 'full_name', label: 'Name' },
  { key: 'role', label: 'Role', render: (r) => <StatusPill value={r.role} /> },
  { key: 'email', label: 'Email' },
])
export const DeptAssignUnitsPage = list('Assign Units', '/dept-admin/assign-units', [
  { key: 'units.code', label: 'Unit', render: (r) => cell(r, 'units.code') },
  { key: 'user_profiles.full_name', label: 'Trainer', render: (r) => cell(r, 'user_profiles.full_name') },
  { key: 'classes.name', label: 'Class', render: (r) => cell(r, 'classes.name') },
])
export const DeptClassListPage = list('Class List', '/dept-admin/class-list', [
  { key: 'name', label: 'Class' },
  { key: 'courses.name', label: 'Course', render: (r) => cell(r, 'courses.name') },
])
export const DeptTraineeSearchPage = list('Attendance Search', '/dept-admin/trainee-search', [
  { key: 'full_name', label: 'Name' },
  { key: 'admission_no', label: 'Admission' },
  { key: 'email', label: 'Email' },
])
export const DeptAssessmentSheetPage = list('Assessment Sheets', '/dept-admin/assessment-sheet', [
  person(),
  { key: 'units.code', label: 'Unit', render: (r) => cell(r, 'units.code') },
  { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
])
export const DeptTrainerDocsPage = list('Trainer POE', '/dept-admin/trainer-documents', [
  person(),
  { key: 'document_type', label: 'Type' },
  { key: 'file_name', label: 'File' },
])
export const DeptTraineePoePage = list('Trainee POE', '/dept-admin/trainee-poe', [
  person(),
  { key: 'units.name', label: 'Unit', render: (r) => cell(r, 'units.name') },
  { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
])
export const DeptAttachmentMarksPage = list('Attachment Marks', '/dept-admin/attachment-marks', [
  {
    key: 'trainee',
    label: 'Trainee',
    render: (r) => cell(r, 'industrial_attachments.user_profiles.full_name'),
  },
  { key: 'total_score', label: 'Score' },
  { key: 'grade', label: 'Grade' },
])
export const DeptMentoringToolsPage = list('Mentoring Tool / Logbooks', '/dept-admin/mentoring-tools', [
  { key: 'companies.name', label: 'Company', render: (r) => cell(r, 'companies.name') },
  { key: 'file_name', label: 'File' },
])
export const DeptGisPage = list('GIS & Tracking', '/dept-admin/gis-tracking', [
  {
    key: 'trainee',
    label: 'Trainee',
    render: (r) => cell(r, 'industrial_attachments.user_profiles.full_name'),
  },
  { key: 'latitude', label: 'Lat' },
  { key: 'longitude', label: 'Lng' },
])
export const DeptFingerprintPage = list('Fingerprint Registration', '/dept-admin/fingerprint-registration', [
  { key: 'full_name', label: 'Name' },
  { key: 'admission_no', label: 'Admission' },
  {
    key: 'fingerprint_registered',
    label: 'Registered',
    render: (r) => <StatusPill value={r.fingerprint_registered ? 'approved' : 'pending'} />,
  },
])
export const DeptNoticesPage = list('Send Notice / Memo', '/dept-admin/notices', [
  { key: 'title', label: 'Title' },
  { key: 'created_at', label: 'Sent' },
])
export const DeptImportPage = list('Import Data', '/dept-admin/import', [{ key: 'name', label: 'Template' }])
