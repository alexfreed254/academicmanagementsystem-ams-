import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchExamOfficerDashboard, type Row } from '@/api/portals'
import { PortalShell } from '@/layouts/PortalShell'
import { ErrorState, PageSkeleton } from '@/components/ui/States'
import { PrideFooter } from '@/components/PrideFooter'
import { getApiErrorMessage } from '@/lib/apiClient'
import './DashboardPage.css'

const TITLE = 'Examination Officer Dashboard'

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

/** Joined Supabase relation (e.g. `booking.units`) as a plain row. */
function joined(row: Row, key: string): Row {
  const value = row[key]
  return value && typeof value === 'object' ? (value as Row) : {}
}

/** Jinja's `|title` filter. */
function titleCase(value: unknown): string {
  return text(value).replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}

export default function ExaminationOfficerDashboardPage() {
  const q = useQuery({
    queryKey: ['examination-officer', 'dashboard'],
    queryFn: fetchExamOfficerDashboard,
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
  const recentBookings = data.recent_bookings || []

  return (
    <PortalShell title={TITLE}>
      <div className="eo-dashboard bg-gray-50 min-h-screen p-6">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Examination Officer Dashboard</h1>
          <p className="text-gray-600">Manage exam bookings and monitor examination activities</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Approved Bookings */}
          <div className="stat-card bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-check-circle text-green-600 text-xl"></i>
              </div>
              <span className="text-2xl font-bold text-green-600">{data.total_approved}</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Approved Bookings</h3>
            <p className="text-gray-900 text-lg font-semibold">Ready for Exam</p>
          </div>

          {/* Pending Approval */}
          <div className="stat-card bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-clock text-orange-600 text-xl"></i>
              </div>
              <span className="text-2xl font-bold text-orange-600">{data.total_pending}</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Pending Approval</h3>
            <p className="text-gray-900 text-lg font-semibold">Awaiting Review</p>
          </div>

          {/* Completed Exams */}
          <div className="stat-card bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-graduation-cap text-blue-600 text-xl"></i>
              </div>
              <span className="text-2xl font-bold text-blue-600">{data.total_completed}</span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Completed Exams</h3>
            <p className="text-gray-900 text-lg font-semibold">Finished</p>
          </div>
        </div>

        {/* Recent Approved Bookings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              <i className="fas fa-calendar-check text-green-600 mr-2"></i>Recent Approved Bookings
            </h2>
            <Link
              to="/examination-officer/exam-bookings"
              className="text-green-600 hover:text-green-700 text-sm font-semibold"
            >
              View All <i className="fas fa-arrow-right ml-1"></i>
            </Link>
          </div>
          {recentBookings.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {recentBookings.map((booking, index) => {
                const student = joined(booking, 'user_profiles')
                const unit = joined(booking, 'units')
                const studentClass = joined(student, 'classes')
                const bookingId = text(booking.id)
                return (
                  <div key={bookingId || index} className="px-6 py-4 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {text(student.full_name)} - {text(unit.name)}
                        </h3>
                        <div className="flex gap-3 text-xs text-gray-500 mb-2">
                          <span>
                            <i className="fas fa-calendar mr-1"></i>
                            {text(booking.exam_date)}
                          </span>
                          <span>
                            <i className="fas fa-clock mr-1"></i>
                            {titleCase(booking.exam_session)}
                          </span>
                          <span>
                            <i className="fas fa-door-open mr-1"></i>
                            {text(studentClass.name)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">
                            {text(unit.code)}
                          </span>
                          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">
                            {text(student.admission_no)}
                          </span>
                        </div>
                      </div>
                      <Link
                        to={`/examination-officer/exam-bookings/${bookingId}/view`}
                        className="ml-4 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-purple-700 transition inline-flex items-center gap-1"
                      >
                        <i className="fas fa-eye"></i> View
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <i className="fas fa-calendar-times text-gray-300 text-5xl mb-4"></i>
              <p className="text-gray-500">No recent bookings found</p>
            </div>
          )}
        </div>
      </div>
      <PrideFooter />
    </PortalShell>
  )
}
