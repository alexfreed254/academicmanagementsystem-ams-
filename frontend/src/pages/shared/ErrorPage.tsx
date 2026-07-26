import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { getRoleHome } from '@/config/navigation'

export default function ErrorPage({ code = 404 }: { code?: 403 | 404 }) {
  const [params] = useSearchParams()
  const paramCode = Number(params.get('code'))
  const status = paramCode === 403 || paramCode === 404 ? paramCode : code
  const { user } = useAuth()
  const home = user ? getRoleHome(user.role) : '/login'

  const title = status === 403 ? 'Access denied' : 'Page not found'
  const message =
    status === 403
      ? 'You do not have permission to view this page.'
      : 'The page you requested does not exist or has been moved.'

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#f8fafc',
      }}
    >
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: '32px 28px',
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 8px 24px rgba(15,23,42,.06)',
        }}
      >
        <div style={{ fontSize: 48, fontWeight: 800, color: status === 403 ? '#dc2626' : '#64748b', lineHeight: 1 }}>
          {status}
        </div>
        <h1 style={{ margin: '12px 0 8px', fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{title}</h1>
        <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>{message}</p>
        <Link
          to={home}
          style={{
            display: 'inline-block',
            background: '#0f172a',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
