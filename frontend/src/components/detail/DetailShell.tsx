import { type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PortalShell } from '@/layouts/PortalShell'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/ui/States'
import { StatusPill } from '@/pages/shared/ApiTablePage'

const card: CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0,0,0,.04)',
}

export function DetailShell({
  title,
  backTo,
  backLabel = '← Back',
  subtitle,
  loading,
  error,
  onRetry,
  notFound,
  extraHeader,
  children,
}: {
  title: string
  backTo?: string
  backLabel?: string
  subtitle?: string
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  notFound?: boolean
  extraHeader?: ReactNode
  children?: ReactNode
}) {
  if (loading) {
    return (
      <PortalShell title={title}>
        <PageSkeleton />
      </PortalShell>
    )
  }

  return (
    <PortalShell title={title}>
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            {backTo ? (
              <Link to={backTo} style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', display: 'inline-block', marginBottom: 8 }}>
                {backLabel}
              </Link>
            ) : null}
            <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{title}</h1>
            {subtitle ? <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>{subtitle}</p> : null}
          </div>
          {extraHeader}
        </div>

        {error ? <ErrorState message={error} onRetry={onRetry} /> : null}
        {!error && notFound ? (
          <div style={{ padding: 40 }}>
            <EmptyState title="Record not found" />
          </div>
        ) : null}
        {!error && !notFound ? children : null}
      </div>
    </PortalShell>
  )
}

export function InfoGrid({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
        gap: 12,
        marginBottom: 16,
      }}
    >
      {items.map((item) => (
        <div key={item.label} style={{ ...card, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
            {item.label}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{item.value ?? '—'}</div>
        </div>
      ))}
    </div>
  )
}

export function DetailCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div style={{ ...card, marginBottom: 16 }}>
      {title ? (
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 14 }}>
          {title}
        </div>
      ) : null}
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  )
}

export function StatusBadge({ value }: { value: unknown }) {
  return <StatusPill value={value} />
}

export const inputStyle: CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 13,
  fontWeight: 500,
  color: '#0f172a',
  width: '100%',
}

export function PrimaryButton({
  children,
  disabled,
  type = 'button',
  onClick,
}: {
  children: ReactNode
  disabled?: boolean
  type?: 'button' | 'submit'
  onClick?: () => void
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        border: 'none',
        background: '#0f172a',
        color: '#fff',
        borderRadius: 8,
        padding: '10px 16px',
        fontWeight: 700,
        fontSize: 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  )
}

export function fmtBytes(b: unknown): string {
  let n = Number(b) || 0
  if (n <= 0) return '0 B'
  for (const u of ['B', 'KB', 'MB']) {
    if (n < 1024) return `${n.toFixed(1)} ${u}`
    n /= 1024
  }
  return `${n.toFixed(1)} GB`
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      resolve(result.includes(',') ? result.split(',')[1]! : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
