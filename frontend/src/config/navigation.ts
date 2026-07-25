import type { NavSection, UserRole } from '@/types'

/**
 * Sidebar navigation and portal theming, transcribed from the Jinja
 * `templates/<role>/base.html` shells so the React portals keep the exact
 * same menu structure, labels, icons, and colours.
 */

export interface RoleTheme {
  /** Sidebar background gradient (from each base.html `.sidebar` override). */
  sidebar: string
  /** Accent used for active nav, menu labels and the topbar underline. */
  accent: string
  /** Topbar bottom border colour. */
  topbarBorder: string
  /** Role badge text shown under the institute name. */
  badge: string
  badgeIcon: string
  title: string
}

const NAVY = 'linear-gradient(180deg, #0a0f1e 0%, #0f1f40 35%, #111827 100%)'
const NAVY_REFINED = 'linear-gradient(180deg, #0a0f1e 0%, #0f1f40 45%, #0d1b35 100%)'
const NAVY_DENSE = 'linear-gradient(180deg, #060d1f 0%, #0b1735 55%, #0d1b33 100%)'

const AMBER = '#fbbf24'
const BLUE = '#2563eb'

const roleThemes: Record<string, RoleTheme> = {
  super_admin: {
    sidebar: NAVY_REFINED,
    accent: AMBER,
    topbarBorder: '#fef3c7',
    badge: 'Super Administrator',
    badgeIcon: 'shield-alt',
    title: 'Super Admin Portal',
  },
  dept_admin: {
    sidebar: NAVY_REFINED,
    accent: '#1565c0',
    topbarBorder: '#dbeafe',
    badge: 'Department Admin',
    badgeIcon: 'user-tie',
    title: 'Department Admin Portal',
  },
  trainer: {
    sidebar: NAVY_REFINED,
    accent: '#6d28d9',
    topbarBorder: '#ede9fe',
    badge: 'Trainer',
    badgeIcon: 'chalkboard-teacher',
    title: 'TTTI Trainer Portal',
  },
  student: {
    sidebar: NAVY_DENSE,
    accent: '#0891b2',
    topbarBorder: '#cffafe',
    badge: 'Trainee',
    badgeIcon: 'user-graduate',
    title: 'TTTI Trainee Portal',
  },
  examination_officer: {
    sidebar: NAVY,
    accent: BLUE,
    topbarBorder: '#fef3c7',
    badge: 'Examination Officer',
    badgeIcon: 'file-signature',
    title: 'Examination Officer Portal',
  },
  industry_mentor: {
    sidebar: NAVY,
    accent: BLUE,
    topbarBorder: '#fef3c7',
    badge: 'Industry Mentor',
    badgeIcon: 'user-tie',
    title: 'Industry Mentor Portal',
  },
  internal_verifier: {
    sidebar: NAVY,
    accent: BLUE,
    topbarBorder: '#fef3c7',
    badge: 'Internal Verifier',
    badgeIcon: 'clipboard-check',
    title: 'Internal Verifier Portal',
  },
  liaison_officer: {
    sidebar: NAVY,
    accent: AMBER,
    topbarBorder: '#fef3c7',
    badge: 'Industrial Liaison Officer',
    badgeIcon: 'handshake',
    title: 'Liaison Officer Portal',
  },
  cdacc_verifier: {
    sidebar: NAVY_DENSE,
    accent: AMBER,
    topbarBorder: '#fef3c7',
    badge: 'CDACC External Verifier',
    badgeIcon: 'certificate',
    title: 'CDACC Verifier Portal',
  },
  workshop_technician: {
    sidebar: 'linear-gradient(180deg, #0a0f1e 0%, #0f172a 50%, #111827 100%)',
    accent: '#f97316',
    topbarBorder: '#ffedd5',
    badge: 'Workshop Technician',
    badgeIcon: 'tools',
    title: 'Workshop Technician Portal',
  },
  registrar: {
    sidebar: NAVY,
    accent: BLUE,
    topbarBorder: '#fef3c7',
    badge: 'Registrar',
    badgeIcon: 'id-card',
    title: 'Registrar Oversight',
  },
  deputy_principal: {
    sidebar: NAVY,
    accent: BLUE,
    topbarBorder: '#fef3c7',
    badge: 'Deputy Principal',
    badgeIcon: 'user-shield',
    title: 'Deputy Principal Oversight',
  },
  quality_assurance_officer: {
    sidebar: NAVY,
    accent: BLUE,
    topbarBorder: '#fef3c7',
    badge: 'Quality Assurance Officer',
    badgeIcon: 'clipboard-check',
    title: 'Quality Assurance Oversight',
  },
  // Service department roles are themed at runtime in Flask via DEPT_CONFIG;
  // these mirror routes/service_dept.py exactly.
  library_hod: {
    sidebar: 'linear-gradient(160deg, #1e3a8a 0%, #1d4ed8 100%)',
    accent: '#1d4ed8',
    topbarBorder: '#dbeafe',
    badge: 'Library Department',
    badgeIcon: 'book',
    title: 'Library Clearance Portal',
  },
  sports_hod: {
    sidebar: 'linear-gradient(160deg, #14532d 0%, #16a34a 100%)',
    accent: '#16a34a',
    topbarBorder: '#dcfce7',
    badge: 'Games & Sports Department',
    badgeIcon: 'futbol',
    title: 'Games Clearance Portal',
  },
  service_clearance_officer: {
    sidebar: 'linear-gradient(160deg, #78350f 0%, #d97706 100%)',
    accent: '#d97706',
    topbarBorder: '#fef3c7',
    badge: 'Service Clearance Officer',
    badgeIcon: 'building',
    title: 'Service Clearance Portal',
  },
  environment_hod: {
    sidebar: NAVY,
    accent: '#16a34a',
    topbarBorder: '#dcfce7',
    badge: 'Environment HOD',
    badgeIcon: 'leaf',
    title: 'Clearance Approver Portal',
  },
  dean_students: {
    sidebar: NAVY,
    accent: BLUE,
    topbarBorder: '#dbeafe',
    badge: 'Dean of Students',
    badgeIcon: 'user-friends',
    title: 'Clearance Approver Portal',
  },
  finance_officer: {
    sidebar: NAVY,
    accent: '#d97706',
    topbarBorder: '#fef3c7',
    badge: 'Finance Officer',
    badgeIcon: 'coins',
    title: 'Clearance Approver Portal',
  },
}

const defaultTheme: RoleTheme = {
  sidebar: NAVY,
  accent: AMBER,
  topbarBorder: '#fef3c7',
  badge: 'Portal',
  badgeIcon: 'user',
  title: 'TTTI Portal',
}

export function getRoleTheme(role: UserRole): RoleTheme {
  return roleThemes[role] || defaultTheme
}

/* ── Sidebar menus (transcribed from each base.html) ───────────────────── */

const superAdminNav: NavSection[] = [
  { title: 'Overview', items: [{ label: 'Dashboard', to: '/super-admin/dashboard', icon: 'tachometer-alt' }] },
  {
    title: 'User Management',
    items: [
      { label: 'All Users', to: '/super-admin/users', icon: 'users' },
      { label: 'Super Admins', to: '/super-admin/users?role=super_admin', icon: 'shield-alt' },
      { label: 'Dept Admins / HODs', to: '/super-admin/users?role=dept_admin', icon: 'user-tie' },
      { label: 'Trainers', to: '/super-admin/users?role=trainer', icon: 'chalkboard-teacher' },
      { label: 'Workshop Technicians', to: '/super-admin/users?role=workshop_technician', icon: 'tools' },
      { label: 'Students', to: '/super-admin/users?role=student', icon: 'user-graduate' },
      { label: 'Registrar', to: '/super-admin/users?role=registrar', icon: 'id-card' },
      { label: 'Dean of Students', to: '/super-admin/users?role=dean_students', icon: 'user-friends' },
      { label: 'Deputy Principal', to: '/super-admin/users?role=deputy_principal', icon: 'user-shield' },
      { label: 'Exam Officer', to: '/super-admin/users?role=examination_officer', icon: 'file-signature' },
      { label: 'QA Officer', to: '/super-admin/users?role=quality_assurance_officer', icon: 'clipboard-check' },
      { label: 'Industrial Liaison Officer', to: '/super-admin/users?role=liaison_officer', icon: 'handshake' },
      { label: 'CDACC External Verifiers', to: '/super-admin/users?role=cdacc_verifier', icon: 'certificate' },
      { label: 'Manage Credentials', to: '/super-admin/credentials', icon: 'key' },
    ],
  },
  {
    title: 'Academic Structure',
    items: [
      { label: 'Departments', to: '/super-admin/departments', icon: 'sitemap' },
      { label: 'Courses', to: '/super-admin/courses', icon: 'graduation-cap' },
      { label: 'Classes', to: '/super-admin/classes', icon: 'door-open' },
      { label: 'Units', to: '/super-admin/units', icon: 'book' },
    ],
  },
  {
    title: 'Trainees Documents',
    items: [{ label: 'All Trainees Documents', to: '/super-admin/trainees-documents', icon: 'file-alt' }],
  },
  {
    title: 'Attendance & Assessment',
    items: [
      { label: 'Attendance Records', to: '/super-admin/attendance', icon: 'calendar-check' },
      { label: 'Class List', to: '/super-admin/class-list', icon: 'list-ol' },
      { label: 'Attendance Search', to: '/super-admin/trainee-search', icon: 'search' },
      { label: 'Assessment Sheets', to: '/super-admin/assessment-sheet', icon: 'file-alt' },
      { label: 'Exam Booking Approvals', to: '/super-admin/exam-bookings', icon: 'calendar-check' },
      { label: 'Trainer POE', to: '/super-admin/trainer-poe', icon: 'folder-open' },
      { label: 'Trainees POE', to: '/super-admin/assessments', icon: 'folder-open' },
      { label: 'Marks Report', to: '/super-admin/marks', icon: 'chart-bar' },
    ],
  },
  {
    title: 'Summative Assessment',
    items: [
      { label: 'Overview', to: '/summative/', icon: 'th-large' },
      { label: 'Competence Entry', to: '/summative/entry', icon: 'edit' },
      { label: 'Unit Performance', to: '/summative/analysis', icon: 'chart-bar' },
      { label: 'Reports & Downloads', to: '/summative/reports', icon: 'download' },
      { label: 'Graduation List', to: '/summative/graduation-list', icon: 'user-graduate' },
    ],
  },
  {
    title: 'Academic Trips',
    items: [
      { label: 'Trip Reports', to: '/academic-trips', icon: 'bus' },
      { label: 'Upload Trip Report', to: '/academic-trips/upload', icon: 'plus-circle' },
    ],
  },
  {
    title: 'Clearance Management',
    items: [
      { label: 'Clearance Approvals', to: '/clearance/approver', icon: 'clipboard-check' },
      { label: 'All Clearance Requests', to: '/super-admin/clearances', icon: 'list-alt' },
      { label: 'Institute Library', to: '/super-admin/service-clearance?cat=svc_library', icon: 'book' },
      { label: 'Games Department', to: '/super-admin/service-clearance?cat=svc_games', icon: 'futbol' },
      { label: 'Service Clearance', to: '/super-admin/service-clearance', icon: 'building' },
    ],
  },
  {
    title: 'Industrial Attachments',
    items: [
      { label: 'Attachment Approval Records', to: '/super-admin/attachments', icon: 'file-signature' },
      { label: 'Attachment Marks', to: '/super-admin/attachment-marks', icon: 'star-half-alt' },
      { label: 'Mentoring Tool / Logbooks', to: '/super-admin/mentoring-tools', icon: 'file-pdf' },
      { label: 'GIS Placements & Logbook', to: '/super-admin/gis-tracking', icon: 'map-marked-alt' },
      { label: 'Digital Logbooks', to: '/super-admin/logbooks', icon: 'book-open' },
      { label: 'Industry Partners', to: '/super-admin/companies', icon: 'building' },
    ],
  },
  { title: 'Communication', items: [{ label: 'Send Notice / Memo', to: '/super-admin/notices', icon: 'bullhorn' }] },
  {
    title: 'Biometric System',
    items: [{ label: 'Scanner Registration', to: '/super-admin/biometric-scanners', icon: 'fingerprint' }],
  },
  {
    title: 'System',
    items: [
      { label: 'Audit Logs', to: '/super-admin/logs', icon: 'history' },
      { label: 'Import Data', to: '/super-admin/import', icon: 'file-excel' },
    ],
  },
  { title: 'Profile', items: [{ label: 'My Profile', to: '/auth/profile', icon: 'user-circle' }] },
]

const deptAdminNav: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', to: '/dept-admin/dashboard', icon: 'tachometer-alt' },
      { label: 'Trainee Documents', to: '/dept-admin/trainees-documents', icon: 'file-alt' },
    ],
  },
  {
    title: 'Department Management',
    items: [
      { label: 'Courses', to: '/dept-admin/courses', icon: 'graduation-cap' },
      { label: 'Classes', to: '/dept-admin/classes', icon: 'door-open' },
      { label: 'Trainers', to: '/dept-admin/trainers', icon: 'chalkboard-teacher' },
      { label: 'Students', to: '/dept-admin/students', icon: 'user-graduate' },
      { label: 'Units', to: '/dept-admin/units', icon: 'book' },
      { label: 'Assign Units', to: '/dept-admin/assign-units', icon: 'link' },
      { label: 'Manage Credentials', to: '/dept-admin/credentials', icon: 'key' },
    ],
  },
  {
    title: 'Attendance & Assessment',
    items: [
      { label: 'Unit Attendance', to: '/dept-admin/attendance', icon: 'calendar-check' },
      { label: 'Class List', to: '/dept-admin/class-list', icon: 'list-ol' },
      { label: 'Attendance Search', to: '/dept-admin/trainee-search', icon: 'search' },
      { label: 'Assessment Sheets', to: '/dept-admin/assessment-sheet', icon: 'file-alt' },
    ],
  },
  {
    title: 'Exams & Results',
    items: [
      { label: 'Exam Booking Approvals', to: '/dept-admin/exam-bookings', icon: 'calendar-alt' },
      { label: 'Marks Reports', to: '/dept-admin/marks', icon: 'chart-line' },
      { label: 'Trainer POE', to: '/dept-admin/trainer-documents', icon: 'folder-open' },
      { label: 'Trainee POE', to: '/dept-admin/trainee-poe', icon: 'folder-open' },
    ],
  },
  {
    title: 'Summative Assessment',
    items: [
      { label: 'Overview', to: '/summative/', icon: 'th-large' },
      { label: 'Competence Entry', to: '/summative/entry', icon: 'edit' },
      { label: 'Unit Performance', to: '/summative/analysis', icon: 'chart-bar' },
      { label: 'Reports & Downloads', to: '/summative/reports', icon: 'download' },
      { label: 'Graduation List', to: '/summative/graduation-list', icon: 'user-graduate' },
    ],
  },
  { title: 'Academic Trips', items: [{ label: 'Trip Reports', to: '/academic-trips', icon: 'bus' }] },
  {
    title: 'Industrial Attachment',
    items: [
      { label: 'Attachment Approvals', to: '/dept-admin/attachments', icon: 'file-signature' },
      { label: 'Attachment Marks', to: '/dept-admin/attachment-marks', icon: 'star-half-alt' },
      { label: 'Mentoring Tool / Logbooks', to: '/dept-admin/mentoring-tools', icon: 'file-pdf' },
      { label: 'GIS & Tracking', to: '/dept-admin/gis-tracking', icon: 'map-marked-alt' },
      { label: 'Digital Logbooks', to: '/dept-admin/logbooks', icon: 'book-open' },
      { label: 'Industry Partners', to: '/dept-admin/companies', icon: 'building' },
      { label: 'Fingerprint Registration', to: '/dept-admin/fingerprint-registration', icon: 'fingerprint' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Clearance Approvals', to: '/clearance/approver', icon: 'clipboard-check' },
      { label: 'Send Notice / Memo', to: '/dept-admin/notices', icon: 'bullhorn' },
      { label: 'Import Data', to: '/dept-admin/import', icon: 'file-excel' },
    ],
  },
  { title: 'Account', items: [{ label: 'My Profile', to: '/auth/profile', icon: 'user-circle' }] },
]

const trainerNav: NavSection[] = [
  { title: 'Overview', items: [{ label: 'Dashboard', to: '/trainer/dashboard', icon: 'tachometer-alt' }] },
  {
    title: 'Attendance',
    items: [
      { label: 'Mark Attendance', to: '/trainer/attendance', icon: 'clipboard-list' },
      { label: 'Biometric Attendance', to: '/biometric/', icon: 'fingerprint' },
      { label: 'View & Download Attendance', to: '/trainer/attendance-history', icon: 'download' },
    ],
  },
  {
    title: 'Assessment & Results',
    items: [
      { label: 'Trainee POE Review', to: '/trainer/assessments', icon: 'tasks' },
      { label: 'Marks Entry', to: '/trainer/marks-entry', icon: 'edit' },
      { label: 'Import Marks', to: '/trainer/marks-import', icon: 'file-excel' },
      { label: 'Summative Assessments', to: '/summative/', icon: 'award' },
      { label: 'My Portfolio (POE)', to: '/trainer/portfolio', icon: 'folder-open' },
    ],
  },
  {
    title: 'Academic Trips',
    items: [
      { label: 'Trip Reports', to: '/academic-trips', icon: 'bus' },
      { label: 'Upload Trip Report', to: '/academic-trips/upload', icon: 'plus-circle' },
    ],
  },
  {
    title: 'Administration',
    items: [{ label: 'Clearance Approvals', to: '/clearance/approver', icon: 'clipboard-check' }],
  },
  {
    title: 'Account',
    items: [
      { label: 'My Profile', to: '/auth/profile', icon: 'user-circle' },
      { label: 'Notifications', to: '/notifications', icon: 'bell' },
    ],
  },
]

const studentNav: NavSection[] = [
  { title: 'Overview', items: [{ label: 'Dashboard', to: '/student/dashboard', icon: 'tachometer-alt' }] },
  {
    title: 'Learning',
    items: [
      { label: 'My Units', to: '/student/units', icon: 'book-open' },
      { label: 'Lesson Attendance', to: '/student/attendance', icon: 'clipboard-list' },
      { label: 'Marks & Transcripts', to: '/student/marks', icon: 'chart-line' },
      { label: 'Summative Assessment', to: '/student/summative', icon: 'award' },
      { label: 'Portfolio of Evidence', to: '/student/portfolio', icon: 'folder-open' },
      { label: 'My Assessments', to: '/student/assessments', icon: 'file-alt' },
    ],
  },
  { title: 'Records', items: [{ label: 'My Documents', to: '/student/documents', icon: 'archive' }] },
  {
    title: 'Exams',
    items: [
      { label: 'Exam Booking Form', to: '/student/exam-booking-form', icon: 'file-signature' },
      { label: 'My Exam Bookings', to: '/student/exam-bookings', icon: 'calendar-check' },
    ],
  },
  {
    title: 'Industrial Attachment',
    items: [
      { label: 'Attachment Placement & Letter Review', to: '/student/industrial-attachment', icon: 'industry' },
      { label: 'Digital Logbook', to: '/student/logbook', icon: 'book' },
      { label: 'My Attachment Marks', to: '/student/attachment-marks', icon: 'star-half-alt' },
      { label: 'Mentoring Tool / Logbook', to: '/student/mentoring-tool', icon: 'file-pdf' },
    ],
  },
  {
    title: 'Services',
    items: [
      { label: 'Course Clearance', to: '/clearance/', icon: 'clipboard-check' },
      { label: 'Employment Status', to: '/student/employment-status', icon: 'user-tie' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'My Profile', to: '/auth/profile', icon: 'user-circle' },
      { label: 'Notifications', to: '/notifications', icon: 'bell' },
    ],
  },
]

const examinationOfficerNav: NavSection[] = [
  { title: 'Overview', items: [{ label: 'Dashboard', to: '/examination-officer/dashboard', icon: 'tachometer-alt' }] },
  {
    title: 'Examinations',
    items: [
      { label: 'Approved Bookings', to: '/examination-officer/exam-bookings', icon: 'calendar-check' },
      { label: 'Marks Report', to: '/examination-officer/marks', icon: 'chart-line' },
    ],
  },
  { title: 'Profile', items: [{ label: 'My Profile', to: '/auth/profile', icon: 'user-circle' }] },
]

const industryMentorNav: NavSection[] = [
  { title: 'Overview', items: [{ label: 'Dashboard', to: '/industry-mentor/dashboard', icon: 'tachometer-alt' }] },
  {
    title: 'Assessment',
    items: [
      { label: 'Logbook Review', to: '/industry-mentor/logbook', icon: 'book-open' },
      { label: 'Competency Assessment', to: '/industry-mentor/competency', icon: 'check-circle' },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { label: 'Assigned Trainees', to: '/industry-mentor/trainees', icon: 'users' },
      { label: 'Weekly Attendance', to: '/industry-mentor/weekly-attendance', icon: 'calendar-check' },
      { label: 'Location Tracking', to: '/industry-mentor/location', icon: 'map-marker-alt' },
    ],
  },
  { title: 'Profile', items: [{ label: 'My Profile', to: '/auth/profile', icon: 'user-circle' }] },
]

const internalVerifierNav: NavSection[] = [
  { title: 'Overview', items: [{ label: 'Dashboard', to: '/internal-verifier/dashboard', icon: 'tachometer-alt' }] },
  {
    title: 'Verification',
    items: [
      { label: 'Competency Verification', to: '/internal-verifier/competency', icon: 'check-circle' },
      { label: 'Attachment Records', to: '/internal-verifier/attachments', icon: 'building' },
    ],
  },
  { title: 'Reports', items: [{ label: 'CDACC Reports', to: '/internal-verifier/reports', icon: 'file-alt' }] },
  { title: 'Profile', items: [{ label: 'My Profile', to: '/auth/profile', icon: 'user-circle' }] },
]

const liaisonOfficerNav: NavSection[] = [
  { items: [{ label: 'Dashboard', to: '/liaison-officer/dashboard', icon: 'tachometer-alt' }] },
  {
    title: 'Attachments',
    items: [
      { label: 'Attachment Periods', to: '/liaison-officer/periods', icon: 'calendar-alt' },
      { label: 'Placement Reviews', to: '/liaison-officer/attachments', icon: 'briefcase' },
      { label: 'Pending Verification', to: '/liaison-officer/attachments?status=pending', icon: 'clock' },
      { label: 'Active Attachments', to: '/liaison-officer/attachments?status=active', icon: 'circle' },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { label: 'Digital Logbooks', to: '/liaison-officer/logbooks', icon: 'book-open' },
      { label: 'Attachment Marks', to: '/liaison-officer/attachment-marks', icon: 'star-half-alt' },
      { label: 'Mentoring Tool / Logbooks', to: '/liaison-officer/mentoring-tools', icon: 'file-pdf' },
      { label: 'Industry Partners', to: '/liaison-officer/companies', icon: 'industry' },
    ],
  },
  {
    title: 'Clearance',
    items: [{ label: 'Clearance Approvals', to: '/clearance/approver', icon: 'clipboard-check' }],
  },
  {
    title: 'Profile',
    items: [
      { label: 'My Profile', to: '/auth/profile', icon: 'user-circle' },
      { label: 'Notifications', to: '/notifications', icon: 'bell' },
    ],
  },
]

const cdaccVerifierNav: NavSection[] = [
  { title: 'Overview', items: [{ label: 'Dashboard', to: '/cdacc-verifier/dashboard', icon: 'tachometer-alt' }] },
  {
    title: 'Trainer POE',
    items: [{ label: 'Trainer Documents', to: '/cdacc-verifier/trainer-documents', icon: 'folder-open' }],
  },
  {
    title: 'Marks & Assessment',
    items: [
      { label: 'Formative Marks List', to: '/cdacc-verifier/marks', icon: 'chart-bar' },
      { label: 'Trainee Profiles', to: '/cdacc-verifier/trainees', icon: 'users' },
      { label: 'Trainee Assessment POE', to: '/cdacc-verifier/trainee-poe', icon: 'archive' },
    ],
  },
  {
    title: 'Industrial Attachment',
    items: [
      { label: 'Attachment Marks', to: '/cdacc-verifier/attachment-marks', icon: 'star-half-alt' },
      { label: 'Mentoring Tool / Logbooks', to: '/cdacc-verifier/mentoring-tools', icon: 'file-pdf' },
      { label: 'Digital Logbook', to: '/cdacc-verifier/digital-logbook', icon: 'book-open' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'My Profile', to: '/auth/profile', icon: 'user-circle' },
      { label: 'Notifications', to: '/notifications', icon: 'bell' },
    ],
  },
]

const workshopTechnicianNav: NavSection[] = [
  { items: [{ label: 'Dashboard', to: '/workshop-technician/dashboard', icon: 'tachometer-alt' }] },
  { items: [{ label: 'Workshop Inventory', to: '/workshop-technician/inventory', icon: 'boxes' }] },
  {
    items: [{ label: 'Clearance Approvals', to: '/clearance/approver', icon: 'clipboard-check' }],
  },
  { items: [{ label: 'My Profile', to: '/auth/profile', icon: 'user-circle' }] },
]

const registrarNav: NavSection[] = [
  { title: 'Overview', items: [{ label: 'Dashboard', to: '/admin-oversight/registrar', icon: 'tachometer-alt' }] },
  {
    title: 'Admissions',
    items: [{ label: 'Admission Requests', to: '/admin-oversight/registrar/admissions', icon: 'user-plus' }],
  },
  {
    title: 'Clearance',
    items: [{ label: 'Clearance Requests', to: '/admin-oversight/registrar/clearances', icon: 'clipboard-check' }],
  },
  { title: 'Profile', items: [{ label: 'My Profile', to: '/auth/profile', icon: 'user-circle' }] },
]

const deputyPrincipalNav: NavSection[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', to: '/admin-oversight/deputy-principal', icon: 'tachometer-alt' }],
  },
  {
    title: 'Academic',
    items: [{ label: 'Academic Overview', to: '/admin-oversight/deputy-principal/academic', icon: 'graduation-cap' }],
  },
  {
    title: 'Clearance',
    items: [
      { label: 'Clearance Oversight', to: '/admin-oversight/deputy-principal/clearances', icon: 'clipboard-list' },
    ],
  },
  { title: 'Profile', items: [{ label: 'My Profile', to: '/auth/profile', icon: 'user-circle' }] },
]

const qualityAssuranceNav: NavSection[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', to: '/admin-oversight/quality-assurance', icon: 'tachometer-alt' }],
  },
  {
    title: 'Reports & Analysis',
    items: [{ label: 'Performance Reports', to: '/admin-oversight/quality-assurance/reports', icon: 'chart-bar' }],
  },
  {
    title: 'Approvals',
    items: [
      { label: 'Assessment Approvals', to: '/admin-oversight/quality-assurance/approvals', icon: 'check-circle' },
    ],
  },
  { title: 'Profile', items: [{ label: 'My Profile', to: '/auth/profile', icon: 'user-circle' }] },
]

function serviceDeptNav(label: string): NavSection[] {
  return [
    {
      title: label,
      items: [
        { label: 'Dashboard', to: '/service-dept/dashboard', icon: 'tachometer-alt' },
        { label: 'Pending Clearances', to: '/clearance/service-dept', icon: 'hourglass-half' },
      ],
    },
    { title: 'Account', items: [{ label: 'My Profile', to: '/auth/profile', icon: 'user-circle' }] },
  ]
}

const clearanceApproverNav: NavSection[] = [
  {
    title: 'Clearance',
    items: [{ label: 'Clearance Approvals', to: '/clearance/approver', icon: 'clipboard-check' }],
  },
  { title: 'Account', items: [{ label: 'My Profile', to: '/auth/profile', icon: 'user-circle' }] },
]

const portalNav: Partial<Record<UserRole, NavSection[]>> = {
  super_admin: superAdminNav,
  dept_admin: deptAdminNav,
  trainer: trainerNav,
  student: studentNav,
  examination_officer: examinationOfficerNav,
  industry_mentor: industryMentorNav,
  internal_verifier: internalVerifierNav,
  liaison_officer: liaisonOfficerNav,
  cdacc_verifier: cdaccVerifierNav,
  workshop_technician: workshopTechnicianNav,
  registrar: registrarNav,
  deputy_principal: deputyPrincipalNav,
  quality_assurance_officer: qualityAssuranceNav,
  library_hod: serviceDeptNav('Library Department'),
  sports_hod: serviceDeptNav('Games & Sports'),
  service_clearance_officer: serviceDeptNav('Service Clearance'),
  environment_hod: clearanceApproverNav,
  dean_students: clearanceApproverNav,
  finance_officer: clearanceApproverNav,
}

export function getPortalNav(role: UserRole): NavSection[] {
  return portalNav[role] || [{ items: [{ label: 'Dashboard', to: getRoleHome(role), icon: 'tachometer-alt' }] }]
}

export function getRoleHome(role: UserRole): string {
  const map: Record<string, string> = {
    super_admin: '/super-admin/dashboard',
    dept_admin: '/dept-admin/dashboard',
    trainer: '/trainer/dashboard',
    student: '/student/dashboard',
    examination_officer: '/examination-officer/dashboard',
    industry_mentor: '/industry-mentor/dashboard',
    internal_verifier: '/internal-verifier/dashboard',
    liaison_officer: '/liaison-officer/dashboard',
    cdacc_verifier: '/cdacc-verifier/dashboard',
    workshop_technician: '/workshop-technician/dashboard',
    registrar: '/admin-oversight/registrar',
    deputy_principal: '/admin-oversight/deputy-principal',
    quality_assurance_officer: '/admin-oversight/quality-assurance',
    library_hod: '/service-dept/dashboard',
    sports_hod: '/service-dept/dashboard',
    service_clearance_officer: '/service-dept/dashboard',
    environment_hod: '/clearance/approver',
    dean_students: '/clearance/approver',
    finance_officer: '/clearance/approver',
  }
  return map[role] || '/login'
}

export function getPortalTitle(role: UserRole): string {
  return getRoleTheme(role).title
}
