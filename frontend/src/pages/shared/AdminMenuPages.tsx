import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/apiClient'
import { deleteAction, fetchMeta, postAction } from '@/api/mutations'
import { ApiTablePage, StatusPill, cell } from '@/pages/shared/ApiTablePage'
import { InteractiveTablePage } from '@/pages/shared/InteractiveTablePage'
import { PageSkeleton } from '@/components/ui/States'
import type { Row } from '@/api/portals'

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

function metaOptions(items: unknown[]): Array<{ value: string; label: string }> {
  return items.map((item) => {
    if (typeof item === 'string') return { value: item, label: item }
    const r = item as Record<string, unknown>
    const value = String(r.id ?? r.code ?? r.name ?? '')
    const label = String(r.name ?? r.code ?? r.full_name ?? value)
    return { value, label: r.code ? `${label} (${r.code})` : label }
  })
}

export function SuperAdminDepartmentsPage() {
  return (
    <InteractiveTablePage
      title="Departments"
      endpoint="/super-admin/departments"
      rowsKey="items"
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'code', label: 'Code' },
      ]}
      createLabel="Add department"
      createFields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'code', label: 'Code', required: true },
      ]}
      actions={[{ label: 'Delete', tone: 'danger', run: (row) => deleteAction(`/super-admin/departments/${row.id}`) }]}
    />
  )
}

export function SuperAdminCoursesPage() {
  const depts = useQuery({ queryKey: ['meta', 'departments'], queryFn: () => fetchMeta('departments') })
  if (depts.isLoading) return <PageSkeleton />
  return (
    <InteractiveTablePage
      title="Courses"
      endpoint="/super-admin/courses"
      rowsKey="items"
      columns={[
        { key: 'name', label: 'Course' },
        { key: 'code', label: 'Code' },
        { key: 'departments.name', label: 'Department', render: (r) => cell(r, 'departments.name') },
      ]}
      createLabel="Add course"
      createFields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'code', label: 'Code', required: true },
        {
          name: 'department_id',
          label: 'Department',
          type: 'select',
          required: true,
          options: metaOptions(depts.data || []),
        },
      ]}
      actions={[{ label: 'Delete', tone: 'danger', run: (row) => deleteAction(`/super-admin/courses/${row.id}`) }]}
    />
  )
}

export function SuperAdminClassesPage() {
  const depts = useQuery({ queryKey: ['meta', 'departments'], queryFn: () => fetchMeta('departments') })
  const courses = useQuery({ queryKey: ['meta', 'courses'], queryFn: () => fetchMeta('courses') })
  if (depts.isLoading || courses.isLoading) return <PageSkeleton />
  return (
    <InteractiveTablePage
      title="Classes"
      endpoint="/super-admin/classes"
      rowsKey="items"
      columns={[
        { key: 'name', label: 'Class' },
        { key: 'departments.name', label: 'Department', render: (r) => cell(r, 'departments.name') },
        { key: 'courses.name', label: 'Course', render: (r) => cell(r, 'courses.name') },
        { key: 'year', label: 'Year' },
      ]}
      createLabel="Add class"
      createFields={[
        { name: 'name', label: 'Name', required: true },
        {
          name: 'department_id',
          label: 'Department',
          type: 'select',
          required: true,
          options: metaOptions(depts.data || []),
        },
        {
          name: 'course_id',
          label: 'Course',
          type: 'select',
          required: true,
          options: metaOptions(courses.data || []),
        },
        { name: 'year', label: 'Year', type: 'number' },
      ]}
      actions={[{ label: 'Delete', tone: 'danger', run: (row) => deleteAction(`/super-admin/classes/${row.id}`) }]}
    />
  )
}

export function SuperAdminUnitsPage() {
  const depts = useQuery({ queryKey: ['meta', 'departments'], queryFn: () => fetchMeta('departments') })
  if (depts.isLoading) return <PageSkeleton />
  return (
    <InteractiveTablePage
      title="Units"
      endpoint="/super-admin/units"
      rowsKey="items"
      columns={[
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Name' },
        { key: 'departments.name', label: 'Department', render: (r) => cell(r, 'departments.name') },
      ]}
      createLabel="Add unit"
      createFields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'code', label: 'Code', required: true },
        {
          name: 'department_id',
          label: 'Department',
          type: 'select',
          required: true,
          options: metaOptions(depts.data || []),
        },
      ]}
      actions={[{ label: 'Delete', tone: 'danger', run: (row) => deleteAction(`/super-admin/units/${row.id}`) }]}
    />
  )
}

export function SuperAdminUsersPage() {
  const depts = useQuery({ queryKey: ['meta', 'departments'], queryFn: () => fetchMeta('departments') })
  const roles = useQuery({ queryKey: ['meta', 'roles'], queryFn: () => fetchMeta('roles') })
  if (depts.isLoading || roles.isLoading) return <PageSkeleton />
  return (
    <InteractiveTablePage
      title="All Users"
      endpoint="/super-admin/users"
      rowsKey="users"
      columns={[
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
      ]}
      createLabel="Add user"
      createFields={[
        { name: 'full_name', label: 'Full name', required: true },
        { name: 'email', label: 'Email', required: true },
        {
          name: 'role',
          label: 'Role',
          type: 'select',
          required: true,
          options: metaOptions(roles.data || []),
        },
        { name: 'password', label: 'Password', required: true },
        {
          name: 'department_id',
          label: 'Department',
          type: 'select',
          options: metaOptions(depts.data || []),
        },
        { name: 'admission_no', label: 'Admission no' },
        { name: 'staff_no', label: 'Staff no' },
      ]}
      actions={[
        {
          label: 'Reset Pwd',
          requireComment: true,
          run: (row, comment) =>
            postAction(`/super-admin/users/${row.id}/reset-password`, { password: comment }),
        },
        { label: 'Delete', tone: 'danger', run: (row) => deleteAction(`/super-admin/users/${row.id}`) },
      ]}
    />
  )
}

export function SuperAdminCompaniesPage() {
  return (
    <InteractiveTablePage
      title="Industry Partners"
      endpoint="/super-admin/companies"
      rowsKey="items"
      columns={[
        { key: 'name', label: 'Company' },
        { key: 'address', label: 'Address' },
        { key: 'contact_person', label: 'Contact' },
        { key: 'contact_phone', label: 'Phone' },
      ]}
      createLabel="Add company"
      createFields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'address', label: 'Address' },
        { name: 'contact_person', label: 'Contact person' },
        { name: 'contact_phone', label: 'Phone' },
        { name: 'contact_email', label: 'Email' },
      ]}
      actions={[{ label: 'Delete', tone: 'danger', run: (row) => deleteAction(`/super-admin/companies/${row.id}`) }]}
    />
  )
}

export function SuperAdminNoticesPage() {
  return (
    <InteractiveTablePage
      title="Send Notice / Memo"
      endpoint="/super-admin/notices"
      rowsKey="items"
      columns={[
        { key: 'title', label: 'Title' },
        { key: 'audience', label: 'Audience' },
        { key: 'created_at', label: 'Sent' },
      ]}
      createLabel="Send notice"
      createFields={[
        { name: 'title', label: 'Title', required: true },
        { name: 'message', label: 'Message', type: 'textarea', required: true },
      ]}
      actions={[{ label: 'Delete', tone: 'danger', run: (row) => deleteAction(`/super-admin/notices/${row.id}`) }]}
    />
  )
}

export function SuperAdminBiometricPage() {
  return (
    <InteractiveTablePage
      title="Scanner Registration"
      endpoint="/super-admin/biometric-scanners"
      rowsKey="items"
      columns={[
        { key: 'name', label: 'Scanner' },
        { key: 'device_id', label: 'Device ID' },
        { key: 'location', label: 'Location' },
        { key: 'is_active', label: 'Active', render: (r) => <StatusPill value={r.is_active ? 'active' : 'rejected'} /> },
      ]}
      createLabel="Register scanner"
      createFields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'device_id', label: 'Device ID', required: true },
        { name: 'location', label: 'Location' },
      ]}
      actions={[
        { label: 'Delete', tone: 'danger', run: (row) => deleteAction(`/super-admin/biometric-scanners/${row.id}`) },
      ]}
    />
  )
}

export function SuperAdminExamBookingsPage() {
  return (
    <InteractiveTablePage
      title="Exam Booking Approvals"
      endpoint="/super-admin/exam-bookings"
      rowsKey="items"
      columns={[
        person('user_profiles'),
        { key: 'units.name', label: 'Unit', render: (r) => cell(r, 'units.name') },
        { key: 'exam_date', label: 'Exam Date' },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      ]}
      actions={[
        {
          label: 'Approve',
          tone: 'primary',
          when: (r) => String(r.status || '') === 'pending',
          run: (row) => postAction(`/super-admin/exam-bookings/${row.id}/approve`),
        },
        {
          label: 'Reject',
          tone: 'danger',
          requireComment: true,
          when: (r) => String(r.status || '') === 'pending',
          run: (row, comment) =>
            postAction(`/super-admin/exam-bookings/${row.id}/reject`, { comments: comment }),
        },
      ]}
    />
  )
}

export function DeptExamBookingsPage() {
  return (
    <InteractiveTablePage
      title="Exam Booking Approvals"
      endpoint="/dept-admin/exam-bookings"
      rowsKey="items"
      columns={[
        person('user_profiles'),
        { key: 'units.name', label: 'Unit', render: (r) => cell(r, 'units.name') },
        { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
      ]}
      actions={[
        {
          label: 'Approve',
          tone: 'primary',
          when: (r) => String(r.status || '') === 'pending',
          run: (row) => postAction(`/dept-admin/exam-bookings/${row.id}/approve`),
        },
        {
          label: 'Reject',
          tone: 'danger',
          requireComment: true,
          when: (r) => String(r.status || '') === 'pending',
          run: (row, comment) =>
            postAction(`/dept-admin/exam-bookings/${row.id}/reject`, { comments: comment }),
        },
      ]}
    />
  )
}

export function DeptCompaniesPage() {
  return (
    <InteractiveTablePage
      title="Industry Partners"
      endpoint="/dept-admin/companies"
      rowsKey="items"
      columns={[
        { key: 'name', label: 'Company' },
        { key: 'address', label: 'Address' },
        { key: 'contact_phone', label: 'Phone' },
      ]}
      createLabel="Add company"
      createFields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'address', label: 'Address' },
        { name: 'contact_person', label: 'Contact person' },
        { name: 'contact_phone', label: 'Phone' },
        { name: 'contact_email', label: 'Email' },
      ]}
      actions={[{ label: 'Delete', tone: 'danger', run: (row) => deleteAction(`/dept-admin/companies/${row.id}`) }]}
    />
  )
}

export function DeptNoticesPage() {
  return (
    <InteractiveTablePage
      title="Send Notice / Memo"
      endpoint="/dept-admin/notices"
      rowsKey="items"
      columns={[
        { key: 'title', label: 'Title' },
        { key: 'created_at', label: 'Sent' },
      ]}
      createLabel="Send notice"
      createFields={[
        { name: 'title', label: 'Title', required: true },
        { name: 'message', label: 'Message', type: 'textarea', required: true },
      ]}
      actions={[{ label: 'Delete', tone: 'danger', run: (row) => deleteAction(`/dept-admin/notices/${row.id}`) }]}
    />
  )
}

export function DeptAssignUnitsPage() {
  const units = useQuery({ queryKey: ['meta', 'units'], queryFn: () => fetchMeta('units') })
  const classes = useQuery({ queryKey: ['meta', 'classes'], queryFn: () => fetchMeta('classes') })
  const trainers = useQuery({
    queryKey: ['dept-admin', 'trainers'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/dept-admin/trainers')
      return (data.data?.items || data.data?.trainers || []) as Row[]
    },
  })
  if (units.isLoading || classes.isLoading || trainers.isLoading) return <PageSkeleton />
  return (
    <InteractiveTablePage
      title="Assign Units"
      endpoint="/dept-admin/assign-units"
      rowsKey="items"
      columns={[
        { key: 'units.code', label: 'Unit', render: (r) => cell(r, 'units.code') },
        { key: 'user_profiles.full_name', label: 'Trainer', render: (r) => cell(r, 'user_profiles.full_name') },
        { key: 'classes.name', label: 'Class', render: (r) => cell(r, 'classes.name') },
      ]}
      createLabel="Assign unit"
      createFields={[
        {
          name: 'trainer_id',
          label: 'Trainer',
          type: 'select',
          required: true,
          options: (trainers.data || []).map((t) => ({
            value: String(t.id || ''),
            label: String(t.full_name || t.email || t.id),
          })),
        },
        {
          name: 'unit_id',
          label: 'Unit',
          type: 'select',
          required: true,
          options: metaOptions(units.data || []),
        },
        {
          name: 'class_id',
          label: 'Class',
          type: 'select',
          options: metaOptions(classes.data || []),
        },
      ]}
      actions={[{ label: 'Delete', tone: 'danger', run: (row) => deleteAction(`/dept-admin/assign-units/${row.id}`) }]}
    />
  )
}

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
export function DeptClassesPage() {
  const courses = useQuery({ queryKey: ['meta', 'dept-courses'], queryFn: () => fetchMeta('courses') })
  if (courses.isLoading) return <PageSkeleton />
  return (
    <InteractiveTablePage
      title="Classes"
      endpoint="/dept-admin/classes"
      rowsKey="items"
      columns={[
        { key: 'name', label: 'Class' },
        { key: 'courses.name', label: 'Course', render: (r) => cell(r, 'courses.name') },
      ]}
      createLabel="Add class"
      createFields={[
        { name: 'name', label: 'Class name', required: true },
        {
          name: 'course_id',
          label: 'Course',
          type: 'select',
          required: true,
          options: metaOptions(courses.data || []),
        },
      ]}
      createAction={(payload) => postAction('/dept-admin/classes', payload)}
      actions={[]}
    />
  )
}

export function DeptTrainersPage() {
  return (
    <InteractiveTablePage
      title="Trainers"
      endpoint="/dept-admin/trainers"
      rowsKey="items"
      columns={[
        { key: 'full_name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'staff_no', label: 'Staff No' },
      ]}
      createLabel="Add trainer"
      createFields={[
        { name: 'full_name', label: 'Full name', required: true },
        { name: 'email', label: 'Email', required: true },
        { name: 'staff_no', label: 'Staff number' },
        { name: 'mobile_number', label: 'Mobile number' },
        { name: 'password', label: 'Temporary password', placeholder: 'Auto-generated if blank' },
      ]}
      createAction={(payload) => postAction('/dept-admin/trainers', payload)}
      actions={[]}
    />
  )
}

export function DeptStudentsPage() {
  return (
    <InteractiveTablePage
      title="Students"
      endpoint="/dept-admin/students"
      rowsKey="items"
      columns={[
        { key: 'full_name', label: 'Name' },
        { key: 'admission_no', label: 'Admission' },
        { key: 'email', label: 'Email' },
      ]}
      createLabel="Add student"
      createFields={[
        { name: 'full_name', label: 'Full name', required: true },
        { name: 'email', label: 'Email', required: true },
        { name: 'admission_no', label: 'Admission number', required: true },
        { name: 'mobile_number', label: 'Mobile number' },
        { name: 'password', label: 'Temporary password', placeholder: 'Auto-generated if blank' },
      ]}
      createAction={(payload) => postAction('/dept-admin/students', payload)}
      actions={[]}
    />
  )
}

export function DeptUnitsPage() {
  return (
    <InteractiveTablePage
      title="Units"
      endpoint="/dept-admin/units"
      rowsKey="items"
      columns={[
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Name' },
      ]}
      createLabel="Add unit"
      createFields={[
        { name: 'name', label: 'Unit name', required: true },
        { name: 'code', label: 'Unit code', required: true },
      ]}
      createAction={(payload) => postAction('/dept-admin/units', payload)}
      actions={[]}
    />
  )
}
export const DeptAttendancePage = list('Unit Attendance', '/dept-admin/attendance', [
  person(),
  { key: 'units.code', label: 'Unit', render: (r) => cell(r, 'units.code') },
  { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
  { key: 'attendance_date', label: 'Date' },
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
export const DeptImportPage = list('Import Data', '/dept-admin/import', [{ key: 'name', label: 'Template' }])
