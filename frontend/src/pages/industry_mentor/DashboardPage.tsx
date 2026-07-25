import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchIndustryMentorDashboard, type Row } from '@/api/portals'
import { PortalShell } from '@/layouts/PortalShell'
import { ErrorState, PageSkeleton } from '@/components/ui/States'
import { PrideFooter } from '@/components/PrideFooter'
import { getApiErrorMessage } from '@/lib/apiClient'
import './DashboardPage.css'

const TITLE = 'Industry Mentor Dashboard'

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

/** Joined Supabase relation (e.g. `log.user_profiles`) as a plain row. */
function joined(row: Row, key: string): Row {
  const value = row[key]
  return value && typeof value === 'object' ? (value as Row) : {}
}

/** Jinja's `{{ value[:100] }}{% if value|length > 100 %}...{% endif %}`. */
function truncate(value: unknown, limit: number): string {
  const raw = text(value)
  return raw.length > limit ? `${raw.slice(0, limit)}...` : raw
}

export default function IndustryMentorDashboardPage() {
  const q = useQuery({
    queryKey: ['industry-mentor', 'dashboard'],
    queryFn: fetchIndustryMentorDashboard,
  })

  if (q.isLoading) {
    return (
      <PortalShell title={TITLE}>
        <PageSkeleton />
      </PortalShell>
    )
  }

  if (q.isError) {
    return (
      <PortalShell title={TITLE}>
        <div className="p-6">
          <ErrorState message={getApiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
        </div>
      </PortalShell>
    )
  }

  const data = q.data!
  const attachments = data.attachments || []
  const pendingLogbooks = data.pending_logbooks || []
  const pendingCompetencies = data.pending_competencies || []
  const mentor = data.mentor || {}
  const company = joined(mentor, 'companies')

  return (
    <PortalShell title={TITLE}>
      <div className="im-dashboard bg-gray-50 min-h-screen p-6">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Industry Mentor Dashboard</h1>
          <p className="text-gray-600">Monitor and guide your trainees' progress</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Active Trainees */}
          <div className="stat-card bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-users text-green-600 text-xl"></i>
              </div>
              <span className="text-2xl font-bold text-green-600">{attachments.length}</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Active Trainees</h3>
            <p className="text-gray-900 text-lg font-semibold">Under Supervision</p>
          </div>

          {/* Pending Logbook Reviews */}
          <div className="stat-card bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-book text-orange-600 text-xl"></i>
              </div>
              <span className="text-2xl font-bold text-orange-600">{pendingLogbooks.length}</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Pending Reviews</h3>
            <p className="text-gray-900 text-lg font-semibold">Logbook Entries</p>
          </div>

          {/* Pending Competency Assessments */}
          <div className="stat-card bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-clipboard-check text-blue-600 text-xl"></i>
              </div>
              <span className="text-2xl font-bold text-blue-600">{pendingCompetencies.length}</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Pending Assessments</h3>
            <p className="text-gray-900 text-lg font-semibold">Competencies</p>
          </div>
        </div>

        {/* Pending Logbook Reviews */}
        <div className="bg-white rounded-xl shadow-sm mb-8 border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              <i className="fas fa-book text-orange-600 mr-2"></i>Pending Logbook Reviews
            </h2>
            <Link to="/industry-mentor/logbook" className="text-orange-600 hover:text-orange-700 text-sm font-semibold">
              View All <i className="fas fa-arrow-right ml-1"></i>
            </Link>
          </div>
          {pendingLogbooks.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {pendingLogbooks.map((log, index) => {
                const student = joined(log, 'user_profiles')
                return (
                  <div key={text(log.id) || index} className="px-6 py-4 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {text(student.full_name)} ({text(student.admission_no)})
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">{truncate(log.tasks_performed, 100)}</p>
                        <div className="flex gap-2">
                          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">
                            <i className="fas fa-calendar mr-1"></i>
                            {text(log.log_date)}
                          </span>
                        </div>
                      </div>
                      <Link
                        to="/industry-mentor/logbook"
                        className="ml-4 bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-orange-700 transition inline-flex items-center gap-1"
                      >
                        <i className="fas fa-eye"></i> Review
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <i className="fas fa-book-open text-gray-300 text-5xl mb-4"></i>
              <p className="text-gray-500">No pending logbook reviews</p>
            </div>
          )}
        </div>

        {/* Pending Competency Assessments */}
        <div className="bg-white rounded-xl shadow-sm mb-8 border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              <i className="fas fa-clipboard-check text-blue-600 mr-2"></i>Pending Competency Assessments
            </h2>
            <Link to="/industry-mentor/competency" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
              View All <i className="fas fa-arrow-right ml-1"></i>
            </Link>
          </div>
          {pendingCompetencies.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {pendingCompetencies.map((comp, index) => {
                const student = joined(comp, 'user_profiles')
                const unit = joined(comp, 'units')
                return (
                  <div key={text(comp.id) || index} className="px-6 py-4 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {text(student.full_name)} ({text(student.admission_no)})
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {text(unit.name)} - {text(comp.competency_element)}
                        </p>
                      </div>
                      <Link
                        to="/industry-mentor/competency"
                        className="ml-4 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 transition inline-flex items-center gap-1"
                      >
                        <i className="fas fa-check"></i> Assess
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <i className="fas fa-clipboard-list text-gray-300 text-5xl mb-4"></i>
              <p className="text-gray-500">No pending competency assessments</p>
            </div>
          )}
        </div>

        {/* My Company */}
        <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-xl shadow-lg p-6 text-white">
          <h2 className="text-xl font-bold mb-4">
            <i className="fas fa-building mr-2"></i>My Company
          </h2>
          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="text-2xl font-bold mb-2">{text(company.name)}</h3>
            <p className="text-green-100 mb-1">
              <i className="fas fa-map-marker-alt mr-2"></i>
              {text(company.address)}
            </p>
            <p className="text-green-100">
              <i className="fas fa-briefcase mr-2"></i>
              {text(mentor.specialization)}
            </p>
          </div>
        </div>
      </div>
      <PrideFooter />
    </PortalShell>
  )
}
