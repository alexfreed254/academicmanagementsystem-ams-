import { Navigate } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { getRoleHome } from '@/config/navigation'
import { PageSkeleton } from '@/components/ui/States'

/** Sends an authenticated user to their own portal home. */
export function RoleHomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <PageSkeleton />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={getRoleHome(user.role)} replace />
}
