import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { PageSkeleton } from '@/components/ui/States'
import { RequireAuth, RequireRole } from '@/routes/guards'
import * as RoleMenus from '@/pages/shared/RoleMenuPages'
import * as AdminMenus from '@/pages/shared/AdminMenuPages'
import * as SharedMods from '@/pages/shared/SharedModulePages'
import * as STMenus from '@/pages/shared/StudentTrainerMenuPages'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const ChangePasswordPage = lazy(() => import('@/pages/auth/ChangePasswordPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const StudentRegisterPage = lazy(() => import('@/pages/auth/StudentRegisterPage'))
const AboutPage = lazy(() => import('@/pages/main/AboutPage'))
const ApplyPage = lazy(() => import('@/pages/main/ApplyPage'))
const ContactPage = lazy(() => import('@/pages/main/ContactPage'))
const ProfilePage = lazy(() => import('@/pages/shared/ProfilePage'))
const NotificationsPage = lazy(() => import('@/pages/shared/NotificationsPage'))
const InternalVerifierReportsPage = lazy(() => import('@/pages/shared/InternalVerifierReportsPage'))
const ErrorPage = lazy(() => import('@/pages/shared/ErrorPage'))

const PrintPages = {
  AdminMarksPrintPage: lazy(() =>
    import('@/pages/shared/PrintReportPages').then((m) => ({ default: m.AdminMarksPrintPage })),
  ),
  ExamOfficerMarksPrintPage: lazy(() =>
    import('@/pages/shared/PrintReportPages').then((m) => ({ default: m.ExamOfficerMarksPrintPage })),
  ),
  TrainerMarksPrintPage: lazy(() =>
    import('@/pages/shared/PrintReportPages').then((m) => ({ default: m.TrainerMarksPrintPage })),
  ),
  UnitAttendancePrintPage: lazy(() =>
    import('@/pages/shared/PrintReportPages').then((m) => ({ default: m.UnitAttendancePrintPage })),
  ),
  SessionPrintPage: lazy(() =>
    import('@/pages/shared/PrintReportPages').then((m) => ({ default: m.SessionPrintPage })),
  ),
  GraduationListPrintPage: lazy(() =>
    import('@/pages/shared/PrintReportPages').then((m) => ({ default: m.GraduationListPrintPage })),
  ),
  ClassListPrintPage: lazy(() =>
    import('@/pages/shared/PrintReportPages').then((m) => ({ default: m.ClassListPrintPage })),
  ),
  AssessmentSheetPrintPage: lazy(() =>
    import('@/pages/shared/PrintReportPages').then((m) => ({ default: m.AssessmentSheetPrintPage })),
  ),
  TraineeReportPrintPage: lazy(() =>
    import('@/pages/shared/PrintReportPages').then((m) => ({ default: m.TraineeReportPrintPage })),
  ),
  StudentUnitReportPrintPage: lazy(() =>
    import('@/pages/shared/PrintReportPages').then((m) => ({ default: m.StudentUnitReportPrintPage })),
  ),
  TraineeApprovedBookingsPrintPage: lazy(() =>
    import('@/pages/shared/PrintReportPages').then((m) => ({ default: m.TraineeApprovedBookingsPrintPage })),
  ),
  ClearanceFormPrintPage: lazy(() =>
    import('@/pages/shared/PrintReportPages').then((m) => ({ default: m.ClearanceFormPrintPage })),
  ),
}

const TrainerDashboardPage = lazy(() => import('@/pages/trainer/DashboardPage'))
const MarksEntryPage = lazy(() => import('@/pages/trainer/MarksEntryPage'))
const AssessmentsPage = lazy(() => import('@/pages/trainer/AssessmentsPage'))
const AttendancePage = lazy(() => import('@/pages/trainer/AttendancePage'))

const StudentDashboardPage = lazy(() => import('@/pages/student/DashboardPage'))
const StudentAttendancePage = lazy(() => import('@/pages/student/AttendancePage'))
const StudentUnitsPage = lazy(() => import('@/pages/student/UnitsPage'))
const StudentMarksPage = lazy(() => import('@/pages/student/MarksPage'))
const ExamBookingNewPage = lazy(() => import('@/pages/student/ExamBookingNewPage'))
const MyDocumentsPage = lazy(() => import('@/pages/student/MyDocumentsPage'))
const ExamBookingsPage = lazy(() => import('@/pages/student/ExamBookingsPage'))
const StudentDetailPages = {
  StudentUploadAssessmentPage: lazy(() =>
    import('@/pages/student/DetailPages').then((m) => ({ default: m.StudentUploadAssessmentPage })),
  ),
  StudentUploadPoePage: lazy(() =>
    import('@/pages/student/DetailPages').then((m) => ({ default: m.StudentUploadPoePage })),
  ),
  StudentAddEvidencePage: lazy(() =>
    import('@/pages/student/DetailPages').then((m) => ({ default: m.StudentAddEvidencePage })),
  ),
  StudentUnitDetailPage: lazy(() =>
    import('@/pages/student/DetailPages').then((m) => ({ default: m.StudentUnitDetailPage })),
  ),
  StudentPortfolioViewPage: lazy(() =>
    import('@/pages/student/DetailPages').then((m) => ({ default: m.StudentPortfolioViewPage })),
  ),
  StudentMyFilesPage: lazy(() =>
    import('@/pages/student/DetailPages').then((m) => ({ default: m.StudentMyFilesPage })),
  ),
  StudentEmploymentProjectsPage: lazy(() =>
    import('@/pages/student/DetailPages').then((m) => ({ default: m.StudentEmploymentProjectsPage })),
  ),
}

const TrainerDetailPages = {
  TrainerReviewAssessmentPage: lazy(() =>
    import('@/pages/trainer/DetailPages').then((m) => ({ default: m.TrainerReviewAssessmentPage })),
  ),
  TrainerViewSessionPage: lazy(() =>
    import('@/pages/trainer/DetailPages').then((m) => ({ default: m.TrainerViewSessionPage })),
  ),
}

const RoleDetailPages = {
  ExamOfficerBookingDetailPage: lazy(() =>
    import('@/pages/shared/RoleDetailPages').then((m) => ({ default: m.ExamOfficerBookingDetailPage })),
  ),
  LiaisonPlacementDetailPage: lazy(() =>
    import('@/pages/shared/RoleDetailPages').then((m) => ({ default: m.LiaisonPlacementDetailPage })),
  ),
  LiaisonGradeAttachmentPage: lazy(() =>
    import('@/pages/shared/RoleDetailPages').then((m) => ({ default: m.LiaisonGradeAttachmentPage })),
  ),
  CdaccTraineeDetailPage: lazy(() =>
    import('@/pages/shared/RoleDetailPages').then((m) => ({ default: m.CdaccTraineeDetailPage })),
  ),
  InternalVerifierAttachmentDetailPage: lazy(() =>
    import('@/pages/shared/RoleDetailPages').then((m) => ({ default: m.InternalVerifierAttachmentDetailPage })),
  ),
  DeptApplicationsPage: lazy(() =>
    import('@/pages/shared/RoleDetailPages').then((m) => ({ default: m.DeptApplicationsPage })),
  ),
  DeptTraineeDocumentDetailPage: lazy(() =>
    import('@/pages/shared/RoleDetailPages').then((m) => ({ default: m.DeptTraineeDocumentDetailPage })),
  ),
}

const AdminDetailPages = {
  SuperAdminEditUserPage: lazy(() =>
    import('@/pages/shared/AdminDetailPages').then((m) => ({ default: m.SuperAdminEditUserPage })),
  ),
}

const ClearanceDetailPages = {
  ClearanceVerifyPage: lazy(() =>
    import('@/pages/shared/ClearanceDetailPages').then((m) => ({ default: m.ClearanceVerifyPage })),
  ),
  ClearanceManageTrainersPage: lazy(() =>
    import('@/pages/shared/ClearanceDetailPages').then((m) => ({ default: m.ClearanceManageTrainersPage })),
  ),
  ClearanceCertificatePage: lazy(() =>
    import('@/pages/shared/ClearanceDetailPages').then((m) => ({ default: m.ClearanceCertificatePage })),
  ),
}

const SuperAdminDashboardPage = lazy(() => import('@/pages/super_admin/DashboardPage'))
const DeptAdminDashboardPage = lazy(() => import('@/pages/dept_admin/DashboardPage'))
const ExamOfficerDashboardPage = lazy(() => import('@/pages/examination_officer/DashboardPage'))
const IndustryMentorDashboardPage = lazy(() => import('@/pages/industry_mentor/DashboardPage'))
const InternalVerifierDashboardPage = lazy(() => import('@/pages/internal_verifier/DashboardPage'))
const LiaisonDashboardPage = lazy(() => import('@/pages/liaison_officer/DashboardPage'))
const CdaccDashboardPage = lazy(() => import('@/pages/cdacc_verifier/DashboardPage'))
const WorkshopDashboardPage = lazy(() => import('@/pages/workshop_technician/DashboardPage'))
const ServiceDeptDashboardPage = lazy(() => import('@/pages/service_dept/DashboardPage'))
const RegistrarDashboardPage = lazy(() => import('@/pages/admin_oversight/RegistrarDashboardPage'))
const DeputyPrincipalDashboardPage = lazy(
  () => import('@/pages/admin_oversight/DeputyPrincipalDashboardPage'),
)
const QualityAssuranceDashboardPage = lazy(
  () => import('@/pages/admin_oversight/QualityAssuranceDashboardPage'),
)

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
}

function L({ children }: { children: ReactNode }) {
  return <Lazy>{children}</Lazy>
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<L><LoginPage /></L>} />
          <Route path="/about" element={<L><AboutPage /></L>} />
          <Route path="/apply" element={<L><ApplyPage /></L>} />
          <Route path="/contact" element={<L><ContactPage /></L>} />
          <Route path="/auth/forgot-password" element={<L><ForgotPasswordPage /></L>} />
          <Route path="/auth/student-register" element={<L><StudentRegisterPage /></L>} />
          <Route path="/clearance/verify" element={<L><ClearanceDetailPages.ClearanceVerifyPage /></L>} />
          <Route path="/clearance/verify/:serial" element={<L><ClearanceDetailPages.ClearanceVerifyPage /></L>} />

          <Route element={<RequireAuth />}>
            <Route path="/auth/change-password" element={<L><ChangePasswordPage /></L>} />
            {/* Shared destinations used by every sidebar */}
            <Route path="/auth/profile" element={<L><ProfilePage /></L>} />
            <Route path="/notifications" element={<L><NotificationsPage /></L>} />
            <Route path="/clearance/approver" element={<L><SharedMods.ClearanceApproverPage /></L>} />
            <Route path="/clearance/service-dept" element={<L><SharedMods.ServiceClearancePage /></L>} />
            <Route path="/clearance/" element={<L><SharedMods.ClearanceStudentPage /></L>} />
            <Route path="/clearance" element={<Navigate to="/clearance/" replace />} />
            <Route path="/clearance/certificate/:requestId" element={<L><ClearanceDetailPages.ClearanceCertificatePage /></L>} />
            <Route path="/clearance/form/print" element={<L><PrintPages.ClearanceFormPrintPage /></L>} />
            <Route path="/clearance/manage-trainers/:requestId" element={<L><ClearanceDetailPages.ClearanceManageTrainersPage /></L>} />
            <Route path="/error/403" element={<L><ErrorPage code={403} /></L>} />
            <Route path="/error/404" element={<L><ErrorPage code={404} /></L>} />

            <Route path="/summative/" element={<L><SharedMods.SummativeHubPage /></L>} />
            <Route path="/summative/overview" element={<L><SharedMods.SummativeOverviewPage /></L>} />
            <Route path="/summative/entry" element={<L><SharedMods.SummativeEntryPage /></L>} />
            <Route path="/summative/analysis" element={<L><SharedMods.SummativeAnalysisPage /></L>} />
            <Route path="/summative/reports" element={<L><SharedMods.SummativeReportsPage /></L>} />
            <Route path="/summative/graduation-list" element={<L><SharedMods.SummativeGraduationPage /></L>} />
            <Route path="/summative/graduation-list/print" element={<L><PrintPages.GraduationListPrintPage /></L>} />
            <Route path="/summative" element={<Navigate to="/summative/" replace />} />

            <Route path="/academic-trips/upload" element={<L><SharedMods.AcademicTripsUploadPage /></L>} />
            <Route path="/academic-trips/:id/media" element={<L><SharedMods.AcademicTripMediaPage /></L>} />
            <Route path="/academic-trips/:id" element={<L><SharedMods.AcademicTripDetailPage /></L>} />
            <Route path="/academic-trips" element={<L><SharedMods.AcademicTripsPage /></L>} />
            <Route path="/biometric/*" element={<L><SharedMods.BiometricPage /></L>} />
            <Route path="/biometric" element={<Navigate to="/biometric/" replace />} />

            {/* Trainer */}
            <Route element={<RequireRole roles={['trainer']} />}>
              <Route path="/trainer/dashboard" element={<L><TrainerDashboardPage /></L>} />
              <Route path="/trainer/attendance" element={<L><AttendancePage /></L>} />
              <Route path="/trainer/attendance-history" element={<L><STMenus.TrainerAttendanceHistoryPage /></L>} />
              <Route path="/trainer/assessments/:id/review" element={<L><TrainerDetailPages.TrainerReviewAssessmentPage /></L>} />
              <Route path="/trainer/view-session" element={<L><TrainerDetailPages.TrainerViewSessionPage /></L>} />
              <Route path="/trainer/assessments" element={<L><AssessmentsPage /></L>} />
              <Route path="/trainer/marks-entry" element={<L><MarksEntryPage /></L>} />
              <Route path="/trainer/marks/print" element={<L><PrintPages.TrainerMarksPrintPage /></L>} />
              <Route path="/trainer/attendance/print" element={<L><PrintPages.UnitAttendancePrintPage /></L>} />
              <Route path="/trainer/session/print" element={<L><PrintPages.SessionPrintPage /></L>} />
              <Route path="/trainer/marks-import" element={<L><STMenus.TrainerMarksImportPage /></L>} />
              <Route path="/trainer/portfolio" element={<L><STMenus.TrainerPortfolioPage /></L>} />
              <Route path="/trainer" element={<Navigate to="/trainer/dashboard" replace />} />
              <Route path="/trainer/*" element={<Navigate to="/trainer/dashboard" replace />} />
            </Route>

            {/* Student */}
            <Route element={<RequireRole roles={['student']} />}>
              <Route path="/student/dashboard" element={<L><StudentDashboardPage /></L>} />
              <Route path="/student/units" element={<L><StudentUnitsPage /></L>} />
              <Route path="/student/attendance" element={<L><StudentAttendancePage /></L>} />
              <Route path="/student/marks" element={<L><StudentMarksPage /></L>} />
              <Route path="/student/unit-report/print" element={<L><PrintPages.StudentUnitReportPrintPage /></L>} />
              <Route path="/student/marks/print" element={<L><PrintPages.StudentUnitReportPrintPage /></L>} />
              <Route path="/student/summative" element={<L><STMenus.StudentSummativePage /></L>} />
              <Route path="/student/portfolio" element={<L><STMenus.StudentPortfolioPage /></L>} />
              <Route path="/student/assessments/upload" element={<L><StudentDetailPages.StudentUploadAssessmentPage /></L>} />
              <Route path="/student/upload-poe" element={<L><StudentDetailPages.StudentUploadPoePage /></L>} />
              <Route path="/student/assessments/:id/evidence" element={<L><StudentDetailPages.StudentAddEvidencePage /></L>} />
              <Route path="/student/units/:unitId" element={<L><StudentDetailPages.StudentUnitDetailPage /></L>} />
              <Route path="/student/portfolio-view" element={<L><StudentDetailPages.StudentPortfolioViewPage /></L>} />
              <Route path="/student/my-files" element={<L><StudentDetailPages.StudentMyFilesPage /></L>} />
              <Route path="/student/employment-projects" element={<L><StudentDetailPages.StudentEmploymentProjectsPage /></L>} />
              <Route path="/student/assessments" element={<L><STMenus.StudentAssessmentsPage /></L>} />
              <Route path="/student/documents" element={<L><MyDocumentsPage /></L>} />
              <Route path="/student/exam-booking-form" element={<L><ExamBookingNewPage /></L>} />
              <Route path="/student/exam-bookings" element={<L><ExamBookingsPage /></L>} />
              <Route path="/student/industrial-attachment" element={<L><STMenus.StudentIndustrialAttachmentPage /></L>} />
              <Route path="/student/logbook" element={<L><STMenus.StudentLogbookPage /></L>} />
              <Route path="/student/attachment-marks" element={<L><STMenus.StudentAttachmentMarksPage /></L>} />
              <Route path="/student/mentoring-tool" element={<L><STMenus.StudentMentoringToolPage /></L>} />
              <Route path="/student/employment-status" element={<L><STMenus.StudentEmploymentStatusPage /></L>} />
              <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
              <Route path="/student/*" element={<Navigate to="/student/dashboard" replace />} />
            </Route>

            {/* Super Admin */}
            <Route element={<RequireRole roles={['super_admin']} />}>
              <Route path="/super-admin/dashboard" element={<L><SuperAdminDashboardPage /></L>} />
              <Route path="/super-admin/users/:id/edit" element={<L><AdminDetailPages.SuperAdminEditUserPage /></L>} />
              <Route path="/super-admin/users" element={<L><AdminMenus.SuperAdminUsersPage /></L>} />
              <Route path="/super-admin/credentials" element={<L><AdminMenus.SuperAdminCredentialsPage /></L>} />
              <Route path="/super-admin/departments" element={<L><AdminMenus.SuperAdminDepartmentsPage /></L>} />
              <Route path="/super-admin/courses" element={<L><AdminMenus.SuperAdminCoursesPage /></L>} />
              <Route path="/super-admin/classes" element={<L><AdminMenus.SuperAdminClassesPage /></L>} />
              <Route path="/super-admin/units" element={<L><AdminMenus.SuperAdminUnitsPage /></L>} />
              <Route path="/super-admin/trainees-documents" element={<L><AdminMenus.SuperAdminTraineesDocsPage /></L>} />
              <Route path="/super-admin/attendance" element={<L><AdminMenus.SuperAdminAttendancePage /></L>} />
              <Route path="/super-admin/class-list" element={<L><AdminMenus.SuperAdminClassListPage /></L>} />
              <Route path="/super-admin/trainee-search" element={<L><AdminMenus.SuperAdminTraineeSearchPage /></L>} />
              <Route path="/super-admin/assessment-sheet" element={<L><AdminMenus.SuperAdminAssessmentSheetPage /></L>} />
              <Route path="/super-admin/exam-bookings" element={<L><AdminMenus.SuperAdminExamBookingsPage /></L>} />
              <Route path="/super-admin/trainer-poe" element={<L><AdminMenus.SuperAdminTrainerPoePage /></L>} />
              <Route path="/super-admin/assessments" element={<L><AdminMenus.SuperAdminAssessmentsPage /></L>} />
              <Route path="/super-admin/marks" element={<L><AdminMenus.SuperAdminMarksPage /></L>} />
              <Route path="/super-admin/marks/print" element={<L><PrintPages.AdminMarksPrintPage /></L>} />
              <Route path="/super-admin/class-list/print" element={<L><PrintPages.ClassListPrintPage /></L>} />
              <Route path="/super-admin/assessment-sheet/print" element={<L><PrintPages.AssessmentSheetPrintPage /></L>} />
              <Route path="/super-admin/trainee-report/print" element={<L><PrintPages.TraineeReportPrintPage /></L>} />
              <Route path="/super-admin/attendance/print" element={<L><PrintPages.UnitAttendancePrintPage /></L>} />
              <Route path="/super-admin/clearances" element={<L><AdminMenus.SuperAdminClearancesPage /></L>} />
              <Route path="/super-admin/service-clearance" element={<L><AdminMenus.SuperAdminServiceClearancePage /></L>} />
              <Route path="/super-admin/attachments" element={<L><AdminMenus.SuperAdminAttachmentsPage /></L>} />
              <Route path="/super-admin/attachment-marks" element={<L><AdminMenus.SuperAdminAttachmentMarksPage /></L>} />
              <Route path="/super-admin/mentoring-tools" element={<L><AdminMenus.SuperAdminMentoringToolsPage /></L>} />
              <Route path="/super-admin/gis-tracking" element={<L><AdminMenus.SuperAdminGisPage /></L>} />
              <Route path="/super-admin/logbooks" element={<L><AdminMenus.SuperAdminLogbooksPage /></L>} />
              <Route path="/super-admin/companies" element={<L><AdminMenus.SuperAdminCompaniesPage /></L>} />
              <Route path="/super-admin/notices" element={<L><AdminMenus.SuperAdminNoticesPage /></L>} />
              <Route path="/super-admin/biometric-scanners" element={<L><AdminMenus.SuperAdminBiometricPage /></L>} />
              <Route path="/super-admin/logs" element={<L><AdminMenus.SuperAdminLogsPage /></L>} />
              <Route path="/super-admin/import" element={<L><AdminMenus.SuperAdminImportPage /></L>} />
              <Route path="/super-admin" element={<Navigate to="/super-admin/dashboard" replace />} />
              <Route path="/super-admin/*" element={<Navigate to="/super-admin/dashboard" replace />} />
            </Route>

            {/* Dept Admin */}
            <Route element={<RequireRole roles={['dept_admin']} />}>
              <Route path="/dept-admin/dashboard" element={<L><DeptAdminDashboardPage /></L>} />
              <Route path="/dept-admin/welcome" element={<Navigate to="/dept-admin/dashboard" replace />} />
              <Route path="/dept-admin/trainees-documents/:studentId" element={<L><RoleDetailPages.DeptTraineeDocumentDetailPage /></L>} />
              <Route path="/dept-admin/applications" element={<L><RoleDetailPages.DeptApplicationsPage /></L>} />
              <Route path="/dept-admin/trainees-documents" element={<L><AdminMenus.DeptTraineesDocsPage /></L>} />
              <Route path="/dept-admin/courses" element={<L><AdminMenus.DeptCoursesPage /></L>} />
              <Route path="/dept-admin/classes" element={<L><AdminMenus.DeptClassesPage /></L>} />
              <Route path="/dept-admin/trainers" element={<L><AdminMenus.DeptTrainersPage /></L>} />
              <Route path="/dept-admin/students" element={<L><AdminMenus.DeptStudentsPage /></L>} />
              <Route path="/dept-admin/units" element={<L><AdminMenus.DeptUnitsPage /></L>} />
              <Route path="/dept-admin/assign-units" element={<L><AdminMenus.DeptAssignUnitsPage /></L>} />
              <Route path="/dept-admin/credentials" element={<L><AdminMenus.DeptCredentialsPage /></L>} />
              <Route path="/dept-admin/attendance" element={<L><AdminMenus.DeptAttendancePage /></L>} />
              <Route path="/dept-admin/class-list" element={<L><AdminMenus.DeptClassListPage /></L>} />
              <Route path="/dept-admin/trainee-search" element={<L><AdminMenus.DeptTraineeSearchPage /></L>} />
              <Route path="/dept-admin/assessment-sheet" element={<L><AdminMenus.DeptAssessmentSheetPage /></L>} />
              <Route path="/dept-admin/exam-bookings" element={<L><AdminMenus.DeptExamBookingsPage /></L>} />
              <Route path="/dept-admin/marks" element={<L><AdminMenus.DeptMarksPage /></L>} />
              <Route path="/dept-admin/marks/print" element={<L><PrintPages.AdminMarksPrintPage /></L>} />
              <Route path="/dept-admin/class-list/print" element={<L><PrintPages.ClassListPrintPage /></L>} />
              <Route path="/dept-admin/assessment-sheet/print" element={<L><PrintPages.AssessmentSheetPrintPage /></L>} />
              <Route path="/dept-admin/trainee-report/print" element={<L><PrintPages.TraineeReportPrintPage /></L>} />
              <Route path="/dept-admin/attendance/print" element={<L><PrintPages.UnitAttendancePrintPage /></L>} />
              <Route path="/dept-admin/exam-bookings/print" element={<L><PrintPages.TraineeApprovedBookingsPrintPage /></L>} />
              <Route path="/dept-admin/trainer-documents" element={<L><AdminMenus.DeptTrainerDocsPage /></L>} />
              <Route path="/dept-admin/trainee-poe" element={<L><AdminMenus.DeptTraineePoePage /></L>} />
              <Route path="/dept-admin/attachments" element={<L><AdminMenus.DeptAttachmentsPage /></L>} />
              <Route path="/dept-admin/attachment-marks" element={<L><AdminMenus.DeptAttachmentMarksPage /></L>} />
              <Route path="/dept-admin/mentoring-tools" element={<L><AdminMenus.DeptMentoringToolsPage /></L>} />
              <Route path="/dept-admin/gis-tracking" element={<L><AdminMenus.DeptGisPage /></L>} />
              <Route path="/dept-admin/logbooks" element={<L><AdminMenus.DeptLogbooksPage /></L>} />
              <Route path="/dept-admin/companies" element={<L><AdminMenus.DeptCompaniesPage /></L>} />
              <Route path="/dept-admin/fingerprint-registration" element={<L><AdminMenus.DeptFingerprintPage /></L>} />
              <Route path="/dept-admin/notices" element={<L><AdminMenus.DeptNoticesPage /></L>} />
              <Route path="/dept-admin/import" element={<L><AdminMenus.DeptImportPage /></L>} />
              <Route path="/dept-admin" element={<Navigate to="/dept-admin/dashboard" replace />} />
              <Route path="/dept-admin/*" element={<Navigate to="/dept-admin/dashboard" replace />} />
            </Route>

            {/* Examination Officer */}
            <Route element={<RequireRole roles={['examination_officer']} />}>
              <Route path="/examination-officer/dashboard" element={<L><ExamOfficerDashboardPage /></L>} />
              <Route path="/examination-officer/exam-bookings/:id" element={<L><RoleDetailPages.ExamOfficerBookingDetailPage /></L>} />
              <Route path="/examination-officer/exam-bookings" element={<L><RoleMenus.ExamOfficerBookingsPage /></L>} />
              <Route path="/examination-officer/marks" element={<L><RoleMenus.ExamOfficerMarksPage /></L>} />
              <Route path="/examination-officer/marks/print" element={<L><PrintPages.ExamOfficerMarksPrintPage /></L>} />
              <Route path="/examination-officer" element={<Navigate to="/examination-officer/dashboard" replace />} />
              <Route path="/examination-officer/*" element={<Navigate to="/examination-officer/dashboard" replace />} />
            </Route>

            {/* Industry Mentor */}
            <Route element={<RequireRole roles={['industry_mentor']} />}>
              <Route path="/industry-mentor/dashboard" element={<L><IndustryMentorDashboardPage /></L>} />
              <Route path="/industry-mentor/logbook" element={<L><RoleMenus.IndustryMentorLogbookPage /></L>} />
              <Route path="/industry-mentor/competency" element={<L><RoleMenus.IndustryMentorCompetencyPage /></L>} />
              <Route path="/industry-mentor/trainees" element={<L><RoleMenus.IndustryMentorTraineesPage /></L>} />
              <Route path="/industry-mentor/weekly-attendance" element={<L><RoleMenus.IndustryMentorWeeklyAttendancePage /></L>} />
              <Route path="/industry-mentor/location" element={<L><RoleMenus.IndustryMentorLocationPage /></L>} />
              <Route path="/industry-mentor" element={<Navigate to="/industry-mentor/dashboard" replace />} />
              <Route path="/industry-mentor/*" element={<Navigate to="/industry-mentor/dashboard" replace />} />
            </Route>

            {/* Internal Verifier */}
            <Route element={<RequireRole roles={['internal_verifier']} />}>
              <Route path="/internal-verifier/dashboard" element={<L><InternalVerifierDashboardPage /></L>} />
              <Route path="/internal-verifier/competency" element={<L><RoleMenus.InternalVerifierCompetencyPage /></L>} />
              <Route path="/internal-verifier/attachments/:id" element={<L><RoleDetailPages.InternalVerifierAttachmentDetailPage /></L>} />
              <Route path="/internal-verifier/attachments" element={<L><RoleMenus.InternalVerifierAttachmentsPage /></L>} />
              <Route path="/internal-verifier/reports" element={<L><InternalVerifierReportsPage /></L>} />
              <Route path="/internal-verifier" element={<Navigate to="/internal-verifier/dashboard" replace />} />
              <Route path="/internal-verifier/*" element={<Navigate to="/internal-verifier/dashboard" replace />} />
            </Route>

            {/* Liaison */}
            <Route element={<RequireRole roles={['liaison_officer']} />}>
              <Route path="/liaison-officer/dashboard" element={<L><LiaisonDashboardPage /></L>} />
              <Route path="/liaison-officer/periods" element={<L><RoleMenus.LiaisonPeriodsPage /></L>} />
              <Route path="/liaison-officer/attachments/:id/grade" element={<L><RoleDetailPages.LiaisonGradeAttachmentPage /></L>} />
              <Route path="/liaison-officer/attachments/:id" element={<L><RoleDetailPages.LiaisonPlacementDetailPage /></L>} />
              <Route path="/liaison-officer/attachments" element={<L><RoleMenus.LiaisonAttachmentsPage /></L>} />
              <Route path="/liaison-officer/logbooks" element={<L><RoleMenus.LiaisonLogbooksPage /></L>} />
              <Route path="/liaison-officer/attachment-marks" element={<L><RoleMenus.LiaisonAttachmentMarksPage /></L>} />
              <Route path="/liaison-officer/mentoring-tools" element={<L><RoleMenus.LiaisonMentoringToolsPage /></L>} />
              <Route path="/liaison-officer/companies" element={<L><RoleMenus.LiaisonCompaniesPage /></L>} />
              <Route path="/liaison-officer" element={<Navigate to="/liaison-officer/dashboard" replace />} />
              <Route path="/liaison-officer/*" element={<Navigate to="/liaison-officer/dashboard" replace />} />
            </Route>

            {/* CDACC */}
            <Route element={<RequireRole roles={['cdacc_verifier']} />}>
              <Route path="/cdacc-verifier/dashboard" element={<L><CdaccDashboardPage /></L>} />
              <Route path="/cdacc-verifier/trainer-documents" element={<L><RoleMenus.CdaccTrainerDocumentsPage /></L>} />
              <Route path="/cdacc-verifier/marks" element={<L><RoleMenus.CdaccMarksPage /></L>} />
              <Route path="/cdacc-verifier/trainees/:id" element={<L><RoleDetailPages.CdaccTraineeDetailPage /></L>} />
              <Route path="/cdacc-verifier/trainees" element={<L><RoleMenus.CdaccTraineesPage /></L>} />
              <Route path="/cdacc-verifier/trainee-poe" element={<L><RoleMenus.CdaccTraineePoePage /></L>} />
              <Route path="/cdacc-verifier/attachment-marks" element={<L><RoleMenus.CdaccAttachmentMarksPage /></L>} />
              <Route path="/cdacc-verifier/mentoring-tools" element={<L><RoleMenus.CdaccMentoringToolsPage /></L>} />
              <Route path="/cdacc-verifier/digital-logbook" element={<L><RoleMenus.CdaccDigitalLogbookPage /></L>} />
              <Route path="/cdacc-verifier" element={<Navigate to="/cdacc-verifier/dashboard" replace />} />
              <Route path="/cdacc-verifier/*" element={<Navigate to="/cdacc-verifier/dashboard" replace />} />
            </Route>

            {/* Workshop */}
            <Route element={<RequireRole roles={['workshop_technician']} />}>
              <Route path="/workshop-technician/dashboard" element={<L><WorkshopDashboardPage /></L>} />
              <Route path="/workshop-technician/inventory" element={<L><RoleMenus.WorkshopInventoryPage /></L>} />
              <Route path="/workshop-technician" element={<Navigate to="/workshop-technician/dashboard" replace />} />
              <Route path="/workshop-technician/*" element={<Navigate to="/workshop-technician/dashboard" replace />} />
            </Route>

            {/* Service dept */}
            <Route element={<RequireRole roles={['library_hod', 'sports_hod', 'service_clearance_officer']} />}>
              <Route path="/service-dept/dashboard" element={<L><ServiceDeptDashboardPage /></L>} />
              <Route path="/service-dept/pending" element={<Navigate to="/clearance/service-dept" replace />} />
              <Route path="/service-dept" element={<Navigate to="/service-dept/dashboard" replace />} />
              <Route path="/service-dept/*" element={<Navigate to="/service-dept/dashboard" replace />} />
            </Route>

            {/* Oversight */}
            <Route element={<RequireRole roles={['registrar']} />}>
              <Route path="/admin-oversight/registrar" element={<L><RegistrarDashboardPage /></L>} />
              <Route path="/admin-oversight/registrar/admissions" element={<L><RoleMenus.OversightAdmissionsPage /></L>} />
              <Route
                path="/admin-oversight/registrar/clearances"
                element={<L><RoleMenus.OversightClearancesPage endpoint="/admin-oversight/registrar/clearances" title="Clearance Requests" /></L>}
              />
              <Route path="/admin-oversight/registrar/*" element={<Navigate to="/admin-oversight/registrar" replace />} />
            </Route>

            <Route element={<RequireRole roles={['deputy_principal']} />}>
              <Route path="/admin-oversight/deputy-principal" element={<L><DeputyPrincipalDashboardPage /></L>} />
              <Route path="/admin-oversight/deputy-principal/academic" element={<L><RoleMenus.OversightAcademicPage /></L>} />
              <Route
                path="/admin-oversight/deputy-principal/clearances"
                element={<L><RoleMenus.OversightClearancesPage endpoint="/admin-oversight/deputy-principal/clearances" title="Clearance Oversight" /></L>}
              />
              <Route path="/admin-oversight/deputy-principal/*" element={<Navigate to="/admin-oversight/deputy-principal" replace />} />
            </Route>

            <Route element={<RequireRole roles={['quality_assurance_officer']} />}>
              <Route path="/admin-oversight/quality-assurance" element={<L><QualityAssuranceDashboardPage /></L>} />
              <Route path="/admin-oversight/quality-assurance/reports" element={<L><RoleMenus.QaReportsPage /></L>} />
              <Route path="/admin-oversight/quality-assurance/approvals" element={<L><RoleMenus.QaApprovalsPage /></L>} />
              <Route path="/admin-oversight/quality-assurance/*" element={<Navigate to="/admin-oversight/quality-assurance" replace />} />
            </Route>

            <Route element={<RequireRole roles={['environment_hod', 'dean_students', 'finance_officer']} />}>
              <Route path="/clearance/*" element={<L><SharedMods.ClearanceApproverPage /></L>} />
            </Route>

            <Route path="*" element={<L><ErrorPage code={404} /></L>} />
          </Route>

          <Route path="*" element={<L><ErrorPage code={404} /></L>} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
