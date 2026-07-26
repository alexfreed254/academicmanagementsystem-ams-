import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchCdaccDashboard, type Row } from '@/api/portals'
import { useAuth } from '@/providers/AuthProvider'
import { PortalShell } from '@/layouts/PortalShell'
import { ErrorState, PageSkeleton } from '@/components/ui/States'
import { PrideFooter } from '@/components/PrideFooter'
import { getApiErrorMessage } from '@/lib/apiClient'

const TITLE = 'CDACC External Verifier Dashboard'

function text(value: unknown, fallback = ''): string {
  return value === null || value === undefined || value === '' ? fallback : String(value)
}

/** Joined Supabase relation (e.g. `a.user_profiles`) as a plain row. */
function joined(row: Row, key: string): Row {
  const value = row[key]
  return value && typeof value === 'object' ? (value as Row) : {}
}

export default function CdaccVerifierDashboardPage() {
  const { user } = useAuth()
  const q = useQuery({
    queryKey: ['cdacc-verifier', 'dashboard'],
    queryFn: fetchCdaccDashboard,
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
  const stats = data.stats
  const pendingAssessments = data.pending_assessments || []
  const recentVerified = data.recent_verified || []

  return (
    <PortalShell title={TITLE}>
      <div className="cd-dashboard bg-gray-50 min-h-screen p-6">
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-xl shadow-lg p-6 mb-8 text-white">
          <h1 className="text-2xl font-bold mb-1">
            <i className="fas fa-certificate mr-2"></i>Welcome, {user?.full_name}!
          </h1>
          <p className="text-blue-200 text-sm">{data.current_month} &bull; CDACC External Verifier Portal</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 text-center">
            <div className="text-3xl font-bold text-gray-700 mb-1">{stats.total || 0}</div>
            <div className="text-xs text-gray-500 font-semibold uppercase">Total POE</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-orange-100 text-center">
            <div className="text-3xl font-bold text-orange-500 mb-1">{stats.pending || 0}</div>
            <div className="text-xs text-gray-500 font-semibold uppercase">Pending</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-green-100 text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">{stats.approved || 0}</div>
            <div className="text-xs text-gray-500 font-semibold uppercase">Verified / Approved</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-red-100 text-center">
            <div className="text-3xl font-bold text-red-500 mb-1">{stats.rejected || 0}</div>
            <div className="text-xs text-gray-500 font-semibold uppercase">Rejected</div>
          </div>
        </div>

        {/* Pending verification */}
        <div className="bg-white rounded-xl shadow-sm mb-8 border border-orange-100">
          <div className="px-6 py-4 border-b border-orange-50 bg-orange-50 rounded-t-xl flex items-center justify-between">
            <h2 className="text-lg font-bold text-orange-900">
              <i className="fas fa-clock text-orange-500 mr-2"></i>Pending Verification
              <span className="ml-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingAssessments.length}
              </span>
            </h2>
            <Link
              to="/cdacc-verifier/assessments?status=pending"
              className="text-orange-600 text-sm font-semibold hover:underline"
            >
              View All
            </Link>
          </div>
          {pendingAssessments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Unit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Uploaded</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pendingAssessments.map((a, index) => {
                    const student = joined(a, 'user_profiles')
                    const unit = joined(a, 'units')
                    const assessmentId = text(a.id)
                    return (
                      <tr key={assessmentId || index} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-sm text-gray-900">{text(student.full_name, '—')}</p>
                          <p className="text-xs text-gray-400">{text(student.admission_no)}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{text(unit.code, '—')}</td>
                        <td className="px-4 py-3">
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">
                            {text(a.assessment_type, '—')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{text(a.uploaded_at).slice(0, 10)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 items-center">
                            <Link
                              to="/cdacc-verifier/assessments?status=pending"
                              className="bg-green-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-green-700"
                            >
                              Verify
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-10 text-center text-gray-400">
              <i className="fas fa-check-double text-4xl mb-3 block"></i>No assessments pending verification
            </div>
          )}
        </div>

        {/* Recently verified */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              <i className="fas fa-history text-blue-500 mr-2"></i>Recently Verified
            </h2>
            <Link
              to="/cdacc-verifier/assessments?status=approved"
              className="text-blue-600 text-sm font-semibold hover:underline"
            >
              View All
            </Link>
          </div>
          {recentVerified.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {recentVerified.map((a, index) => {
                const student = joined(a, 'user_profiles')
                const unit = joined(a, 'units')
                const status = text(a.status)
                return (
                  <div key={text(a.id) || index} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900">
                        {text(student.full_name, '—')} — {text(unit.code)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {text(a.assessment_type)} &bull; {text(a.uploaded_at).slice(0, 10)}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {status.toUpperCase()}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-gray-400">No verified assessments yet.</div>
          )}
        </div>
      </div>
      <PrideFooter />
    </PortalShell>
  )
}
