import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { PageSkeleton } from '@/components/ui/States'
import { RequireAuth, RequireRole } from '@/routes/guards'
import { RoleHomeRedirect } from '@/routes/RoleHomeRedirect'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))

const TrainerDashboardPage = lazy(() => import('@/pages/trainer/DashboardPage'))
const MarksEntryPage = lazy(() => import('@/pages/trainer/MarksEntryPage'))
const AssessmentsPage = lazy(() => import('@/pages/trainer/AssessmentsPage'))
const AttendancePage = lazy(() => import('@/pages/trainer/AttendancePage'))

const StudentDashboardPage = lazy(() => import('@/pages/student/DashboardPage'))
const StudentAttendancePage = lazy(() => import('@/pages/student/AttendancePage'))
const StudentUnitsPage = lazy(() => import('@/pages/student/UnitsPage'))
const StudentMarksPage = lazy(() => import('@/pages/student/MarksPage'))

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

const FeaturePlaceholder = lazy(() => import('@/pages/shared/FeaturePlaceholder'))

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
}

/** Any nav destination inside a portal that has no React page yet. */
function Pending() {
  return (
    <Lazy>
      <FeaturePlaceholder />
    </Lazy>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route
            path="/login"
            element={
              <Lazy>
                <LoginPage />
              </Lazy>
            }
          />

          <Route element={<RequireAuth />}>
            {/* ── Trainer ─────────────────────────────────────────────── */}
            <Route element={<RequireRole roles={['trainer']} />}>
              <Route
                path="/trainer/dashboard"
                element={
                  <Lazy>
                    <TrainerDashboardPage />
                  </Lazy>
                }
              />
              <Route
                path="/trainer/attendance"
                element={
                  <Lazy>
                    <AttendancePage />
                  </Lazy>
                }
              />
              <Route
                path="/trainer/assessments"
                element={
                  <Lazy>
                    <AssessmentsPage />
                  </Lazy>
                }
              />
              <Route
                path="/trainer/marks-entry"
                element={
                  <Lazy>
                    <MarksEntryPage />
                  </Lazy>
                }
              />
              <Route path="/trainer" element={<Navigate to="/trainer/dashboard" replace />} />
              <Route path="/trainer/*" element={<Pending />} />
            </Route>

            {/* ── Student ─────────────────────────────────────────────── */}
            <Route element={<RequireRole roles={['student']} />}>
              <Route
                path="/student/dashboard"
                element={
                  <Lazy>
                    <StudentDashboardPage />
                  </Lazy>
                }
              />
              <Route
                path="/student/units"
                element={
                  <Lazy>
                    <StudentUnitsPage />
                  </Lazy>
                }
              />
              <Route
                path="/student/attendance"
                element={
                  <Lazy>
                    <StudentAttendancePage />
                  </Lazy>
                }
              />
              <Route
                path="/student/marks"
                element={
                  <Lazy>
                    <StudentMarksPage />
                  </Lazy>
                }
              />
              <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
              <Route path="/student/*" element={<Pending />} />
            </Route>

            {/* ── Super Admin ─────────────────────────────────────────── */}
            <Route element={<RequireRole roles={['super_admin']} />}>
              <Route
                path="/super-admin/dashboard"
                element={
                  <Lazy>
                    <SuperAdminDashboardPage />
                  </Lazy>
                }
              />
              <Route path="/super-admin" element={<Navigate to="/super-admin/dashboard" replace />} />
              <Route path="/super-admin/*" element={<Pending />} />
            </Route>

            {/* ── Department Admin ────────────────────────────────────── */}
            <Route element={<RequireRole roles={['dept_admin']} />}>
              <Route
                path="/dept-admin/dashboard"
                element={
                  <Lazy>
                    <DeptAdminDashboardPage />
                  </Lazy>
                }
              />
              <Route path="/dept-admin" element={<Navigate to="/dept-admin/dashboard" replace />} />
              <Route path="/dept-admin/*" element={<Pending />} />
            </Route>

            {/* ── Examination Officer ─────────────────────────────────── */}
            <Route element={<RequireRole roles={['examination_officer']} />}>
              <Route
                path="/examination-officer/dashboard"
                element={
                  <Lazy>
                    <ExamOfficerDashboardPage />
                  </Lazy>
                }
              />
              <Route
                path="/examination-officer"
                element={<Navigate to="/examination-officer/dashboard" replace />}
              />
              <Route path="/examination-officer/*" element={<Pending />} />
            </Route>

            {/* ── Industry Mentor ─────────────────────────────────────── */}
            <Route element={<RequireRole roles={['industry_mentor']} />}>
              <Route
                path="/industry-mentor/dashboard"
                element={
                  <Lazy>
                    <IndustryMentorDashboardPage />
                  </Lazy>
                }
              />
              <Route
                path="/industry-mentor"
                element={<Navigate to="/industry-mentor/dashboard" replace />}
              />
              <Route path="/industry-mentor/*" element={<Pending />} />
            </Route>

            {/* ── Internal Verifier ───────────────────────────────────── */}
            <Route element={<RequireRole roles={['internal_verifier']} />}>
              <Route
                path="/internal-verifier/dashboard"
                element={
                  <Lazy>
                    <InternalVerifierDashboardPage />
                  </Lazy>
                }
              />
              <Route
                path="/internal-verifier"
                element={<Navigate to="/internal-verifier/dashboard" replace />}
              />
              <Route path="/internal-verifier/*" element={<Pending />} />
            </Route>

            {/* ── Liaison Officer ─────────────────────────────────────── */}
            <Route element={<RequireRole roles={['liaison_officer']} />}>
              <Route
                path="/liaison-officer/dashboard"
                element={
                  <Lazy>
                    <LiaisonDashboardPage />
                  </Lazy>
                }
              />
              <Route
                path="/liaison-officer"
                element={<Navigate to="/liaison-officer/dashboard" replace />}
              />
              <Route path="/liaison-officer/*" element={<Pending />} />
            </Route>

            {/* ── CDACC External Verifier ─────────────────────────────── */}
            <Route element={<RequireRole roles={['cdacc_verifier']} />}>
              <Route
                path="/cdacc-verifier/dashboard"
                element={
                  <Lazy>
                    <CdaccDashboardPage />
                  </Lazy>
                }
              />
              <Route
                path="/cdacc-verifier"
                element={<Navigate to="/cdacc-verifier/dashboard" replace />}
              />
              <Route path="/cdacc-verifier/*" element={<Pending />} />
            </Route>

            {/* ── Workshop Technician ─────────────────────────────────── */}
            <Route element={<RequireRole roles={['workshop_technician']} />}>
              <Route
                path="/workshop-technician/dashboard"
                element={
                  <Lazy>
                    <WorkshopDashboardPage />
                  </Lazy>
                }
              />
              <Route
                path="/workshop-technician"
                element={<Navigate to="/workshop-technician/dashboard" replace />}
              />
              <Route path="/workshop-technician/*" element={<Pending />} />
            </Route>

            {/* ── Service departments (library / games / clearance) ───── */}
            <Route
              element={
                <RequireRole roles={['library_hod', 'sports_hod', 'service_clearance_officer']} />
              }
            >
              <Route
                path="/service-dept/dashboard"
                element={
                  <Lazy>
                    <ServiceDeptDashboardPage />
                  </Lazy>
                }
              />
              <Route
                path="/service-dept"
                element={<Navigate to="/service-dept/dashboard" replace />}
              />
              <Route path="/service-dept/*" element={<Pending />} />
            </Route>

            {/* ── Admin oversight ─────────────────────────────────────── */}
            <Route element={<RequireRole roles={['registrar']} />}>
              <Route
                path="/admin-oversight/registrar"
                element={
                  <Lazy>
                    <RegistrarDashboardPage />
                  </Lazy>
                }
              />
              <Route path="/admin-oversight/registrar/*" element={<Pending />} />
            </Route>

            <Route element={<RequireRole roles={['deputy_principal']} />}>
              <Route
                path="/admin-oversight/deputy-principal"
                element={
                  <Lazy>
                    <DeputyPrincipalDashboardPage />
                  </Lazy>
                }
              />
              <Route path="/admin-oversight/deputy-principal/*" element={<Pending />} />
            </Route>

            <Route element={<RequireRole roles={['quality_assurance_officer']} />}>
              <Route
                path="/admin-oversight/quality-assurance"
                element={
                  <Lazy>
                    <QualityAssuranceDashboardPage />
                  </Lazy>
                }
              />
              <Route path="/admin-oversight/quality-assurance/*" element={<Pending />} />
            </Route>

            {/* ── Clearance approvers with no dedicated portal yet ────── */}
            <Route
              element={<RequireRole roles={['environment_hod', 'dean_students', 'finance_officer']} />}
            >
              <Route path="/clearance/*" element={<Pending />} />
            </Route>

            {/* Signed in but on an unknown path → that role's home. */}
            <Route path="/" element={<RoleHomeRedirect />} />
            <Route path="*" element={<RoleHomeRedirect />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
