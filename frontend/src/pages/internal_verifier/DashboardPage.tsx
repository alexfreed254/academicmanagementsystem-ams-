import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchInternalVerifierDashboard, type Row } from '@/api/portals'
import { PortalShell } from '@/layouts/PortalShell'
import { ErrorState, PageSkeleton } from '@/components/ui/States'
import { PrideFooter } from '@/components/PrideFooter'
import { getApiErrorMessage } from '@/lib/apiClient'
import './DashboardPage.css'

const TITLE = 'Internal Verifier Dashboard'

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

/** Joined Supabase relation (e.g. `comp.units`) as a plain row. */
function joined(row: Row, key: string): Row {
  const value = row[key]
  return value && typeof value === 'object' ? (value as Row) : {}
}

export default function InternalVerifierDashboardPage() {
  const q = useQuery({
    queryKey: ['internal-verifier', 'dashboard'],
    queryFn: fetchInternalVerifierDashboard,
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
  const pendingCompetencies = data.pending_competencies || []

  return (
    <PortalShell title={TITLE}>
      <div className="iv-dashboard bg-gray-50 min-h-screen p-6">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Internal Verifier Dashboard</h1>
          <p className="text-gray-600">Quality assurance and competency verification</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Pending Verifications */}
          <div className="stat-card bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-clock text-orange-600 text-xl"></i>
              </div>
              <span className="text-2xl font-bold text-orange-600">{data.total_pending}</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Pending Verifications</h3>
            <p className="text-gray-900 text-lg font-semibold">Awaiting Review</p>
          </div>

          {/* Verified Competencies */}
          <div className="stat-card bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-check-circle text-green-600 text-xl"></i>
              </div>
              <span className="text-2xl font-bold text-green-600">{data.verified_count}</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Verified</h3>
            <p className="text-gray-900 text-lg font-semibold">Approved</p>
          </div>

          {/* Rejected Competencies */}
          <div className="stat-card bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-times-circle text-red-600 text-xl"></i>
              </div>
              <span className="text-2xl font-bold text-red-600">{data.rejected_count}</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Rejected</h3>
            <p className="text-gray-900 text-lg font-semibold">Needs Revision</p>
          </div>
        </div>

        {/* Pending Competency Verifications */}
        <div className="bg-white rounded-xl shadow-sm mb-8 border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              <i className="fas fa-clipboard-check text-blue-600 mr-2"></i>Pending Competency Verifications
            </h2>
            <Link to="/internal-verifier/competency" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
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
                        <div className="flex gap-2">
                          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">
                            Status: {text(comp.competency_status)}
                          </span>
                          <span className="inline-block bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded">
                            Assessor: {text(comp.assessor_name)}
                          </span>
                        </div>
                      </div>
                      <Link
                        to="/internal-verifier/competency"
                        className="ml-4 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 transition inline-flex items-center gap-1"
                      >
                        <i className="fas fa-check-double"></i> Verify
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <i className="fas fa-clipboard-check text-gray-300 text-5xl mb-4"></i>
              <p className="text-gray-500">No pending verifications</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">
              <i className="fas fa-bolt text-yellow-600 mr-2"></i>Quick Actions
            </h2>
          </div>
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/internal-verifier/competency"
                className="bg-blue-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-blue-700 transition text-center flex items-center justify-center gap-2"
              >
                <i className="fas fa-clipboard-list"></i> View All Competencies
              </Link>
              <Link
                to="/internal-verifier/attachments"
                className="bg-green-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-green-700 transition text-center flex items-center justify-center gap-2"
              >
                <i className="fas fa-paperclip"></i> View Attachments
              </Link>
              <Link
                to="/internal-verifier/reports"
                className="bg-purple-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-purple-700 transition text-center flex items-center justify-center gap-2"
              >
                <i className="fas fa-file-alt"></i> CDACC Reports
              </Link>
            </div>
          </div>
        </div>
      </div>
      <PrideFooter />
    </PortalShell>
  )
}
