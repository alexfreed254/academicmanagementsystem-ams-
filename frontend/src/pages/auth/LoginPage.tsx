import { useEffect } from 'react'
import { PageSkeleton } from '@/components/ui/States'
import { redirectToLogin } from '@/config/legacy'

/**
 * SPA no longer hosts its own login UI.
 * Canonical login is the Flask Jinja page at /auth/login.
 */
export default function LoginPage() {
  useEffect(() => {
    redirectToLogin()
  }, [])

  return <PageSkeleton />
}
