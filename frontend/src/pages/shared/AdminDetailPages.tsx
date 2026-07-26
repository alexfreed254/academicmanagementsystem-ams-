import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, getApiErrorMessage } from '@/lib/apiClient'
import { fetchMeta, patchAction } from '@/api/mutations'
import { DetailCard, DetailShell, PrimaryButton, inputStyle } from '@/components/detail/DetailShell'
import { PageSkeleton } from '@/components/ui/States'

export function SuperAdminEditUserPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState({ full_name: '', role: '', department_id: '', is_active: true })

  const userQ = useQuery({
    queryKey: ['super-admin-user', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/super-admin/users/${id}`)
      return data.data as Record<string, unknown>
    },
    enabled: Boolean(id),
  })

  const deptsQ = useQuery({ queryKey: ['meta', 'departments'], queryFn: () => fetchMeta('departments') })
  const rolesQ = useQuery({ queryKey: ['meta', 'roles'], queryFn: () => fetchMeta('roles') })

  const user = (userQ.data?.user as Record<string, unknown>) || null

  useEffect(() => {
    if (!user) return
    setForm({
      full_name: String(user.full_name || ''),
      role: String(user.role || ''),
      department_id: String(user.department_id || ''),
      is_active: user.is_active !== false,
    })
  }, [user])

  const save = useMutation({
    mutationFn: async () => {
      await patchAction(`/super-admin/users/${id}`, {
        full_name: form.full_name,
        role: form.role,
        department_id: form.department_id || null,
        is_active: form.is_active,
      })
    },
    onSuccess: () => {
      setMsg('User updated.')
      setErr(null)
      void qc.invalidateQueries({ queryKey: ['portal-table', '/super-admin/users'] })
      navigate('/super-admin/users')
    },
    onError: (e) => {
      setErr(getApiErrorMessage(e))
      setMsg(null)
    },
  })

  if (userQ.isLoading || deptsQ.isLoading || rolesQ.isLoading) {
    return (
      <DetailShell title="Edit User">
        <PageSkeleton />
      </DetailShell>
    )
  }

  return (
    <DetailShell
      title="Edit User"
      backTo="/super-admin/users"
      loading={false}
      error={userQ.isError ? getApiErrorMessage(userQ.error) : null}
      notFound={!user}
    >
      {msg ? <div style={{ marginBottom: 12, padding: 10, background: '#dcfce7', borderRadius: 8, fontSize: 13 }}>{msg}</div> : null}
      {err ? <div style={{ marginBottom: 12, padding: 10, background: '#fee2e2', borderRadius: 8, fontSize: 13 }}>{err}</div> : null}
      <DetailCard>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
          style={{ display: 'grid', gap: 12, maxWidth: 480 }}
        >
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600 }}>
            Full name
            <input required value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} style={inputStyle} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600 }}>
            Role
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} style={inputStyle}>
              {(rolesQ.data || []).map((r) => (
                <option key={String(r)} value={String(r)}>
                  {String(r)}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600 }}>
            Department
            <select value={form.department_id} onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))} style={inputStyle}>
              <option value="">None</option>
              {(deptsQ.data || []).map((d) => (
                <option key={String(d.id)} value={String(d.id)}>
                  {String(d.name)}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
            Active account
          </label>
          <PrimaryButton type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save changes'}</PrimaryButton>
        </form>
      </DetailCard>
    </DetailShell>
  )
}
