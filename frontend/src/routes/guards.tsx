import { Navigate, Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { PageSkeleton } from '@/components/ui/States'
import { getRoleHome } from '@/config/navigation'
import { redirectToLogin } from '@/config/legacy'
import type { UserRole } from '@/types'

export function RequireAuth() {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) redirectToLogin()
  }, [loading, user])

  if (loading) return <PageSkeleton />
  if (!user) return <PageSkeleton />
  return <Outlet />
}

export function RequireRole({ roles }: { roles: UserRole[] }) {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) redirectToLogin()
  }, [loading, user])

  if (loading) return <PageSkeleton />
  if (!user) return <PageSkeleton />
  if (!roles.includes(user.role)) {
    return <Navigate to={getRoleHome(user.role)} replace />
  }
  return <Outlet />
}
