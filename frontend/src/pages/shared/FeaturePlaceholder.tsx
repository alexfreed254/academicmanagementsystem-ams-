import { Link, useLocation } from 'react-router-dom'
import { PortalShell } from '@/layouts/PortalShell'
import { useAuth } from '@/providers/AuthProvider'
import { getRoleHome } from '@/config/navigation'

/** "/dept-admin/exam-bookings" → "Exam Bookings" */
function titleFromPath(pathname: string) {
  const last = pathname.split('/').filter(Boolean).pop() || 'Page'
  return last
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Placeholder for features not yet ported to React.
 * Preserves navigation and points users to the working Flask UI.
 */
export default function FeaturePlaceholder({
  title,
  legacyPath,
}: {
  title?: string
  legacyPath?: string
}) {
  const location = useLocation()
  const { user } = useAuth()
  const legacyOrigin = (import.meta.env.VITE_LEGACY_ORIGIN as string | undefined) || ''
  const path = legacyPath || location.pathname
  const heading = title || titleFromPath(path)
  const href = `${legacyOrigin.replace(/\/$/, '')}${path}`
  const home = getRoleHome(user?.role || '')

  return (
    <PortalShell title={heading}>
      <div className="grid place-items-center p-8">
        <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-[#1e5a9f]">
            <i className="fas fa-layer-group text-xl" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">{heading}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            This screen is queued for React migration. Your existing workflow remains available in the
            current portal UI — design and data behaviour are unchanged.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {legacyOrigin ? (
              <a
                href={href}
                className="rounded-xl bg-[#1e5a9f] px-4 py-2.5 text-sm font-bold text-white"
              >
                Open current page
              </a>
            ) : null}
            <Link
              to={home}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </PortalShell>
  )
}
