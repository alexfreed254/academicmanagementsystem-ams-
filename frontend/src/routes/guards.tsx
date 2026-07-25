import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { PageSkeleton } from '@/components/ui/States'
import ErrorPage from '@/pages/shared/ErrorPage'
import type { UserRole } from '@/types'

export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageSkeleton />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (user.must_change_password && location.pathname !== '/auth/change-password') {
    return <Navigate to="/auth/change-password" replace />
  }
  return <Outlet />
}

export function RequireRole({ roles }: { roles: UserRole[] }) {
  const { user, loading } = useAuth()
  if (loading) return <PageSkeleton />
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) {
    return <ErrorPage code={403} />
  }
  return <Outlet />
}
