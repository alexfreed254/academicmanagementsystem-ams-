import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchLiaisonDashboard, type Row } from '@/api/portals'
import { useAuth } from '@/providers/AuthProvider'
import { PortalShell } from '@/layouts/PortalShell'
import { PrideFooter } from '@/components/PrideFooter'
import { ErrorState, PageSkeleton } from '@/components/ui/States'
import { getApiErrorMessage } from '@/lib/apiClient'

const TITLE = 'Industrial Liaison Officer Dashboard'

function text(value: unknown, fallback = ''): string {
  return value === null || value === undefined || value === '' ? fallback : String(value)
}

function joined(row: Row, key: string): Row {
  const value = row[key]
  return value && typeof value === 'object' ? (value as Row) : {}
}

export default function LiaisonOfficerDashboardPage() {
  const { user } = useAuth()
  const q = useQuery({
    queryKey: ['liaison-officer', 'dashboard'],
    queryFn: fetchLiaisonDashboard,
    refetchInterval: 20_000,
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
  const pendingAttachments = data.pending_attachments || []
  const activeAttachments = data.active_attachments || []
  const recentLogbooks = data.recent_logbooks || []

  return (
    <PortalShell title={TITLE}>
      <div className="bg-gray-50 min-h-screen p-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-xl shadow-lg p-6 mb-8 text-white">
          <h1 className="text-2xl font-bold mb-1">
            <i className="fas fa-handshake mr-2"></i>Welcome, {user?.full_name}!
          </h1>
          <p className="text-blue-200 text-sm">
            {data.current_month} &bull; Industrial Liaison Officer Portal
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">{stats.total || 0}</div>
            <div className="text-xs text-gray-500 font-semibold uppercase">Total Attachments</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-orange-100 text-center">
            <div className="text-3xl font-bold text-orange-500 mb-1">{stats.pending || 0}</div>
            <div className="text-xs text-gray-500 font-semibold uppercase">Pending Approval</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-green-100 text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">{stats.active || 0}</div>
            <div className="text-xs text-gray-500 font-semibold uppercase">Active</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-blue-100 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">{stats.approved || 0}</div>
            <div className="text-xs text-gray-500 font-semibold uppercase">Approved</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-purple-100 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-1">{stats.companies || 0}</div>
            <div className="text-xs text-gray-500 font-semibold uppercase">Industry Partners</div>
          </div>
        </div>

        {/* Pending Attachments */}
        <div className="bg-white rounded-xl shadow-sm mb-8 border border-orange-100">
          <div className="px-6 py-4 border-b border-orange-50 flex items-center justify-between bg-orange-50 rounded-t-xl">
            <h2 className="text-lg font-bold text-orange-900">
              <i className="fas fa-clock text-orange-500 mr-2"></i>Pending Attachments
              <span className="ml-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingAttachments.length}
              </span>
            </h2>
            <Link
              to="/liaison-officer/attachments?status=pending"
              className="text-orange-600 text-sm font-semibold hover:underline"
            >
              View All
            </Link>
          </div>
          {pendingAttachments.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {pendingAttachments.map((a, index) => {
                const student = joined(a, 'user_profiles')
                const company = joined(a, 'companies')
                return (
                  <div
                    key={text(a.id) || index}
                    className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">
                        {text(student.full_name, '—')}
                        <span className="text-xs text-gray-400 ml-2">
                          {text(student.admission_no)}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600">
                        <i className="fas fa-building mr-1"></i>
                        {text(company.name, '—')}
                      </p>
                      <p className="text-xs text-gray-400">
                        {text(a.start_date)} → {text(a.end_date, 'TBD')}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled
                      title="Approve action not yet available in this portal"
                      className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold opacity-60 cursor-not-allowed flex-shrink-0"
                    >
                      <i className="fas fa-check mr-1"></i>Approve
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-6 py-10 text-center text-gray-400">
              <i className="fas fa-check-circle text-4xl mb-3 block"></i>No pending attachments
            </div>
          )}
        </div>

        {/* Active Attachments */}
        <div className="bg-white rounded-xl shadow-sm mb-8 border border-green-100">
          <div className="px-6 py-4 border-b border-green-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              <i className="fas fa-circle text-green-500 mr-2"></i>Active Attachments
            </h2>
            <Link
              to="/liaison-officer/attachments?status=active"
              className="text-green-600 text-sm font-semibold hover:underline"
            >
              View All
            </Link>
          </div>
          {activeAttachments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Start
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      End
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activeAttachments.map((a, index) => {
                    const student = joined(a, 'user_profiles')
                    const company = joined(a, 'companies')
                    return (
                      <tr key={text(a.id) || index} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">
                          {text(student.full_name, '—')}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {text(company.name, '—')}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500">
                          {text(a.start_date, '—')}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500">
                          {text(a.end_date, 'Ongoing')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-gray-400">
              No active attachments at the moment.
            </div>
          )}
        </div>

        {/* Recent Logbooks */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              <i className="fas fa-book-open text-blue-500 mr-2"></i>Recent Logbook Entries
            </h2>
            <Link
              to="/liaison-officer/logbooks"
              className="text-blue-600 text-sm font-semibold hover:underline"
            >
              View All
            </Link>
          </div>
          {recentLogbooks.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {recentLogbooks.map((l, index) => {
                const student = joined(l, 'user_profiles')
                const status = text(l.mentor_approval_status, 'pending')
                const badgeClass =
                  status === 'approved'
                    ? 'bg-green-100 text-green-700'
                    : status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                return (
                  <div
                    key={text(l.id) || index}
                    className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900">
                        {text(student.full_name, '—')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {text(l.tasks_performed, '—')} &bull; {text(l.log_date)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${badgeClass}`}>
                      {status.toUpperCase()}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-gray-400">No logbook entries found.</div>
          )}
        </div>
      </div>
      <PrideFooter />
    </PortalShell>
  )
}
