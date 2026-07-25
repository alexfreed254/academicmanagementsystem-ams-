import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import { api, getApiErrorMessage } from '@/lib/apiClient'
import { PortalShell } from '@/layouts/PortalShell'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/ui/States'
import type { Row } from '@/api/portals'

export type Column = {
  key: string
  label: string
  render?: (row: Row) => ReactNode
}

function dig(row: Row, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && !Array.isArray(acc)) return (acc as Row)[part]
    return undefined
  }, row)
}

export function cell(row: Row, key: string, fallback = '—'): string {
  const v = dig(row, key)
  if (v === null || v === undefined || v === '') return fallback
  return String(v)
}

/**
 * Generic portal list page used for sidebar destinations that show tabular data.
 * Keeps PortalShell + original table card look without redesigning each screen.
 */
export function ApiTablePage({
  title,
  subtitle,
  endpoint,
  rowsKey,
  columns,
  keepSearch = true,
}: {
  title: string
  subtitle?: string
  endpoint: string
  rowsKey: string
  columns: Column[]
  keepSearch?: boolean
}) {
  const [params] = useSearchParams()
  const qs = keepSearch ? params.toString() : ''
  const url = qs ? `${endpoint}?${qs}` : endpoint

  const q = useQuery({
    queryKey: ['portal-table', url],
    queryFn: async () => {
      const { data } = await api.get(url.startsWith('/api/') ? url : `/api/v1${url}`)
      return data.data as Record<string, unknown>
    },
  })

  if (q.isLoading) {
    return (
      <PortalShell title={title}>
        <PageSkeleton />
      </PortalShell>
    )
  }
  if (q.isError) {
    return (
      <PortalShell title={title}>
        <div className="p-6">
          <ErrorState message={getApiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
        </div>
      </PortalShell>
    )
  }

  const rows = ((q.data?.[rowsKey] as Row[]) || []) as Row[]

  return (
    <PortalShell title={title}>
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 18 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{title}</h1>
          {subtitle ? <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>{subtitle}</p> : null}
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,.04)',
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <strong style={{ fontSize: 14 }}>{rows.length} record{rows.length === 1 ? '' : 's'}</strong>
            <button
              type="button"
              onClick={() => void q.refetch()}
              style={{
                border: '1px solid #dbeafe',
                background: '#eff6ff',
                color: '#1d4ed8',
                borderRadius: 8,
                padding: '6px 12px',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          </div>

          {rows.length === 0 ? (
            <div style={{ padding: 40 }}>
              <EmptyState title="No records found" />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        style={{
                          textAlign: 'left',
                          padding: '11px 14px',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={cell(row, 'id', String(i))} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {columns.map((col) => (
                        <td key={col.key} style={{ padding: '12px 14px', fontSize: 13, color: '#334155' }}>
                          {col.render ? col.render(row) : cell(row, col.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  )
}

export function StatusPill({ value }: { value: unknown }) {
  const s = String(value || 'pending').toLowerCase()
  const map: Record<string, { bg: string; color: string }> = {
    approved: { bg: '#dcfce7', color: '#15803d' },
    completed: { bg: '#dbeafe', color: '#1d4ed8' },
    active: { bg: '#dbeafe', color: '#1e40af' },
    pending: { bg: '#fef3c7', color: '#92400e' },
    rejected: { bg: '#fee2e2', color: '#991b1b' },
    verified: { bg: '#dcfce7', color: '#15803d' },
    good: { bg: '#dcfce7', color: '#15803d' },
    fair: { bg: '#fef3c7', color: '#92400e' },
    poor: { bg: '#ffedd5', color: '#c2410c' },
    damaged: { bg: '#fee2e2', color: '#991b1b' },
  }
  const tone = map[s] || { bg: '#f1f5f9', color: '#475569' }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: tone.bg,
        color: tone.color,
        textTransform: 'capitalize',
      }}
    >
      {s.replace(/_/g, ' ')}
    </span>
  )
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', textDecoration: 'none' }}>
      {label}
    </Link>
  )
}
