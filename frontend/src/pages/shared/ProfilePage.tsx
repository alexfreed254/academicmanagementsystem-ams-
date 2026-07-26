import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { fetchProfile, updateProfile, changePassword, type ProfileRow } from '@/api/auth'
import { PortalShell } from '@/layouts/PortalShell'
import { ErrorState, PageSkeleton } from '@/components/ui/States'
import { getApiErrorMessage } from '@/lib/apiClient'

export default function ProfilePage() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['auth', 'profile'], queryFn: fetchProfile })
  const [msg, setMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null)
  const [details, setDetails] = useState({ full_name: '', mobile_number: '' })
  const [pwd, setPwd] = useState({ current_password: '', new_password: '', confirm: '' })

  useEffect(() => {
    if (!q.data) return
    setDetails({
      full_name: q.data.full_name || '',
      mobile_number: q.data.mobile_number || '',
    })
  }, [q.data])

  const saveDetails = useMutation({
    mutationFn: () => updateProfile(details),
    onSuccess: (profile) => {
      void qc.setQueryData(['auth', 'profile'], profile)
      setMsg({ type: 'success', text: 'Profile details updated successfully.' })
    },
    onError: (e) => setMsg({ type: 'danger', text: getApiErrorMessage(e) }),
  })

  const savePassword = useMutation({
    mutationFn: async () => {
      if (pwd.new_password !== pwd.confirm) throw new Error('Passwords do not match.')
      await changePassword(pwd.current_password, pwd.new_password)
    },
    onSuccess: () => {
      setPwd({ current_password: '', new_password: '', confirm: '' })
      setMsg({ type: 'success', text: 'Password changed successfully.' })
    },
    onError: (e) => setMsg({ type: 'danger', text: getApiErrorMessage(e) }),
  })

  if (q.isLoading) {
    return (
      <PortalShell title="My Profile">
        <PageSkeleton />
      </PortalShell>
    )
  }
  if (q.isError || !q.data) {
    return (
      <PortalShell title="My Profile">
        <div className="p-6">
          <ErrorState message={getApiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
        </div>
      </PortalShell>
    )
  }

  const p = q.data as ProfileRow
  const dept =
    p.departments && typeof p.departments === 'object' && !Array.isArray(p.departments)
      ? String((p.departments as { name?: string }).name || 'General')
      : 'General'

  return (
    <PortalShell title="My Profile">
      <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
        {msg ? (
          <div
            style={{
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 20,
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: msg.type === 'success' ? '#e8f5e9' : '#ffebee',
              color: msg.type === 'success' ? '#2e7d32' : '#c62828',
              border: `1px solid ${msg.type === 'success' ? '#c8e6c9' : '#ffcdd2'}`,
            }}
          >
            <i className={`fas fa-${msg.type === 'success' ? 'check-circle' : 'exclamation-circle'}`} />
            {msg.text}
          </div>
        ) : null}

        <div style={card}>
          <div style={cardHeader}>
            <i className="fas fa-user-circle" /> Profile Information
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #f0f0f0' }}>
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: '#e3f2fd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                  color: '#1565c0',
                  border: '3px solid #1565c0',
                }}
              >
                <i className="fas fa-user" />
              </div>
              <div>
                <h3 style={{ fontSize: 20, color: '#333', margin: '0 0 4px' }}>{p.full_name}</h3>
                <p style={{ color: '#666', fontSize: 13, margin: 0 }}>
                  {String(p.role || '').replace(/_/g, ' ')} · {p.admission_no || p.staff_no || 'Member'}
                </p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20 }}>
              <Info label="Official Email" value={p.email || '—'} />
              <Info label="Mobile / WhatsApp" value={p.mobile_number || '—'} />
              <Info label="Department" value={dept} />
              <Info label="Account Status" value="Active" accent />
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={cardHeader}>
            <i className="fas fa-edit" /> Edit Profile Details
          </div>
          <div style={{ padding: 24 }}>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                saveDetails.mutate()
              }}
            >
              <Field label="Full Name *">
                <input
                  required
                  value={details.full_name}
                  onChange={(e) => setDetails((d) => ({ ...d, full_name: e.target.value }))}
                  style={input}
                />
              </Field>
              <Field label="Mobile / WhatsApp Number">
                <input
                  value={details.mobile_number}
                  onChange={(e) => setDetails((d) => ({ ...d, mobile_number: e.target.value }))}
                  placeholder="+254712345678"
                  style={input}
                />
              </Field>
              <button type="submit" disabled={saveDetails.isPending} style={btn}>
                <i className="fas fa-save" /> Save Changes
              </button>
            </form>
          </div>
        </div>

        <div style={card}>
          <div style={cardHeader}>
            <i className="fas fa-lock" /> Change Password
          </div>
          <div style={{ padding: 24 }}>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                savePassword.mutate()
              }}
            >
              <Field label="Current Password">
                <input
                  type="password"
                  required
                  value={pwd.current_password}
                  onChange={(e) => setPwd((p) => ({ ...p, current_password: e.target.value }))}
                  style={input}
                />
              </Field>
              <Field label="New Password">
                <input
                  type="password"
                  required
                  value={pwd.new_password}
                  onChange={(e) => setPwd((p) => ({ ...p, new_password: e.target.value }))}
                  style={input}
                />
              </Field>
              <Field label="Confirm New Password">
                <input
                  type="password"
                  required
                  value={pwd.confirm}
                  onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                  style={input}
                />
              </Field>
              <button type="submit" disabled={savePassword.isPending} style={btn}>
                <i className="fas fa-key" /> Update Password
              </button>
            </form>
          </div>
        </div>
      </div>
    </PortalShell>
  )
}

function Info({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 4, fontWeight: 600, letterSpacing: '0.05em' }}>
        {label}
      </label>
      <p style={{ fontSize: 14, fontWeight: 600, color: accent ? '#2e7d32' : '#333', margin: 0 }}>{value}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

const card: CSSProperties = {
  background: 'white',
  borderRadius: 12,
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  marginBottom: 24,
  overflow: 'hidden',
  border: '1px solid #f0f0f0',
}
const cardHeader: CSSProperties = {
  background: 'linear-gradient(135deg, #1565c0, #0d47a1)',
  color: 'white',
  padding: '16px 24px',
  fontSize: 15,
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
}
const input: CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #ddd',
  borderRadius: 8,
  fontSize: 13,
}
const btn: CSSProperties = {
  padding: '10px 22px',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 700,
  background: '#1565c0',
  color: 'white',
}
