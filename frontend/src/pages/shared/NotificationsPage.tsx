import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, getApiErrorMessage } from '@/lib/apiClient'
import { PortalShell } from '@/layouts/PortalShell'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/ui/States'

type Notif = {
  id: string
  title?: string
  message?: string
  created_at?: string
  is_read?: boolean
  notification_type?: string
  type?: string
  action_url?: string
}

export default function NotificationsPage() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['notifications', 'all'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/notifications')
      return data.data as { notifications: Notif[]; unread_count: number }
    },
  })

  const markAll = useMutation({
    mutationFn: async () => {
      await api.post('/api/v1/notifications/mark-all-read')
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  if (q.isLoading) {
    return (
      <PortalShell title="Notifications">
        <PageSkeleton />
      </PortalShell>
    )
  }
  if (q.isError) {
    return (
      <PortalShell title="Notifications">
        <div className="p-6">
          <ErrorState message={getApiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
        </div>
      </PortalShell>
    )
  }

  const items = q.data?.notifications || []
  const unread = q.data?.unread_count || 0

  return (
    <PortalShell title="Notifications">
      <div style={{ padding: 24, maxWidth: 860, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Notifications</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>{unread} unread</p>
          </div>
          <button
            type="button"
            disabled={markAll.isPending || unread === 0}
            onClick={() => markAll.mutate()}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #dbeafe',
              background: '#eff6ff',
              color: '#1d4ed8',
              fontWeight: 700,
              fontSize: 12,
              cursor: unread ? 'pointer' : 'not-allowed',
            }}
          >
            Mark all read
          </button>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {items.length === 0 ? (
            <div style={{ padding: 40 }}>
              <EmptyState title="No notifications" />
            </div>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: 16,
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  gap: 12,
                  background: n.is_read ? '#fff' : '#f0f7ff',
                  borderLeft: n.is_read ? '4px solid transparent' : '4px solid #1565c0',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#e3f2fd',
                    color: '#1565c0',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <i className="fas fa-bell" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{n.title || 'Notification'}</div>
                  <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                    {n.created_at ? String(n.created_at).slice(0, 16).replace('T', ' ') : ''}
                  </div>
                </div>
                {n.action_url ? (
                  <Link
                    to={n.action_url}
                    onClick={() => {
                      if (!n.is_read) void api.post(`/api/v1/notifications/${n.id}/read`)
                    }}
                    style={{ fontSize: 12, fontWeight: 700, color: '#1565c0', alignSelf: 'center' }}
                  >
                    Open
                  </Link>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </PortalShell>
  )
}
