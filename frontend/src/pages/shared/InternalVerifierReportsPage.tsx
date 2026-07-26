import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, getApiErrorMessage } from '@/lib/apiClient'
import { PortalShell } from '@/layouts/PortalShell'
import { ErrorState, PageSkeleton } from '@/components/ui/States'

export default function InternalVerifierReportsPage() {
  const q = useQuery({
    queryKey: ['internal-verifier', 'reports'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/internal-verifier/reports')
      return data.data.stats as { pending: number; verified: number; rejected: number }
    },
  })

  if (q.isLoading) {
    return (
      <PortalShell title="CDACC Reports">
        <PageSkeleton />
      </PortalShell>
    )
  }
  if (q.isError || !q.data) {
    return (
      <PortalShell title="CDACC Reports">
        <div className="p-6">
          <ErrorState message={getApiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
        </div>
      </PortalShell>
    )
  }

  const s = q.data
  const cards = [
    { label: 'Pending', value: s.pending, color: '#f59e0b' },
    { label: 'Verified', value: s.verified, color: '#16a34a' },
    { label: 'Rejected', value: s.rejected, color: '#dc2626' },
  ]

  return (
    <PortalShell title="CDACC Reports">
      <div style={{ padding: 24 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>CDACC Reports</h1>
        <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 13 }}>
          Competency verification summary for internal verification.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
          {cards.map((c) => (
            <div
              key={c.label}
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderLeft: `4px solid ${c.color}`,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{c.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{c.value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20 }}>
          <Link to="/internal-verifier/competency" style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 13 }}>
            Review pending competencies →
          </Link>
        </div>
      </div>
    </PortalShell>
  )
}
