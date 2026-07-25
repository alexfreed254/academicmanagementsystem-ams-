import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, getApiErrorMessage } from '@/lib/apiClient'
import { PortalShell } from '@/layouts/PortalShell'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/ui/States'
import type { Row } from '@/api/portals'
import { cell, StatusPill, type Column } from '@/pages/shared/ApiTablePage'

export type RowAction = {
  label: string
  tone?: 'primary' | 'danger' | 'neutral'
  /** If true, prompt for comments before posting. */
  requireComment?: boolean
  /** Build POST/PATCH/DELETE request for this row. */
  run: (row: Row, comment?: string) => Promise<unknown>
  /** Hide action for some rows. */
  when?: (row: Row) => boolean
}

const btnStyle = (tone: RowAction['tone'] = 'neutral'): React.CSSProperties => {
  if (tone === 'primary') {
    return { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }
  }
  if (tone === 'danger') {
    return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }
  }
  return { background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0' }
}

/**
 * List page with optional create form and per-row mutation actions.
 * Used to replace read-only ApiTablePage stubs during the React migration.
 */
export function InteractiveTablePage({
  title,
  subtitle,
  endpoint,
  rowsKey,
  columns,
  actions = [],
  createFields,
  createEndpoint,
  createMethod = 'post',
  createAction,
  createLabel = 'Add',
  keepSearch = true,
  extraHeader,
}: {
  title: string
  subtitle?: string
  endpoint: string
  rowsKey: string
  columns: Column[]
  actions?: RowAction[]
  createFields?: Array<{
    name: string
    label: string
    type?: 'text' | 'number' | 'date' | 'select' | 'textarea'
    required?: boolean
    options?: Array<{ value: string; label: string }>
    placeholder?: string
  }>
  createEndpoint?: string
  createMethod?: 'post' | 'put' | 'patch'
  createAction?: (payload: Record<string, string>) => Promise<unknown>
  createLabel?: string
  keepSearch?: boolean
  extraHeader?: ReactNode
}) {
  const [params] = useSearchParams()
  const qs = keepSearch ? params.toString() : ''
  const url = qs ? `${endpoint}?${qs}` : endpoint
  const qc = useQueryClient()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const q = useQuery({
    queryKey: ['portal-table', url],
    queryFn: async () => {
      const { data } = await api.get(url.startsWith('/api/') ? url : `/api/v1${url}`)
      return data.data as Record<string, unknown>
    },
  })

  const createMut = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      if (createAction) return createAction(payload)
      const ep = createEndpoint || endpoint
      const path = ep.startsWith('/api/') ? ep : `/api/v1${ep}`
      const { data } = await api[createMethod](path, payload)
      return data
    },
    onSuccess: () => {
      setMsg('Saved successfully.')
      setErr(null)
      setShowCreate(false)
      setForm({})
      void qc.invalidateQueries({ queryKey: ['portal-table', url] })
    },
    onError: (e) => {
      setErr(getApiErrorMessage(e))
      setMsg(null)
    },
  })

  async function runAction(action: RowAction, row: Row) {
    let comment: string | undefined
    if (action.requireComment) {
      const entered = window.prompt('Enter a reason / comment:')
      if (entered === null) return
      comment = entered.trim()
      if (!comment) {
        setErr('A comment is required for this action.')
        return
      }
    }
    const id = String(row.id || '')
    setBusyId(id)
    setErr(null)
    setMsg(null)
    try {
      await action.run(row, comment)
      setMsg(`${action.label} completed.`)
      void qc.invalidateQueries({ queryKey: ['portal-table', url] })
    } catch (e) {
      setErr(getApiErrorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  function onCreate(e: FormEvent) {
    e.preventDefault()
    const payload: Record<string, string> = {}
    for (const field of createFields || []) {
      const value = (form[field.name] || '').trim()
      if (field.required && !value) {
        setErr(`${field.label} is required.`)
        return
      }
      if (value) payload[field.name] = value
    }
    createMut.mutate(payload)
  }

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
  const cols = [...columns]
  if (actions.length) {
    cols.push({
      key: '_actions',
      label: 'Actions',
      render: (row) => {
        const visible = actions.filter((a) => (a.when ? a.when(row) : true))
        if (!visible.length) return '—'
        const id = String(row.id || '')
        return (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {visible.map((action) => (
              <button
                key={action.label}
                type="button"
                disabled={busyId === id}
                onClick={() => void runAction(action, row)}
                style={{
                  ...btnStyle(action.tone),
                  borderRadius: 8,
                  padding: '5px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: busyId === id ? 'wait' : 'pointer',
                  opacity: busyId === id ? 0.6 : 1,
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )
      },
    })
  }

  return (
    <PortalShell title={title}>
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{title}</h1>
            {subtitle ? <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>{subtitle}</p> : null}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {extraHeader}
            {createFields?.length ? (
              <button
                type="button"
                onClick={() => setShowCreate((v) => !v)}
                style={{
                  border: 'none',
                  background: '#1d4ed8',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {showCreate ? 'Cancel' : createLabel}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void q.refetch()}
              style={{
                border: '1px solid #dbeafe',
                background: '#eff6ff',
                color: '#1d4ed8',
                borderRadius: 8,
                padding: '8px 12px',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        {msg ? (
          <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#dcfce7', color: '#166534', fontSize: 13 }}>
            {msg}
          </div>
        ) : null}
        {err ? (
          <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#fee2e2', color: '#991b1b', fontSize: 13 }}>
            {err}
          </div>
        ) : null}

        {showCreate && createFields?.length ? (
          <form
            onSubmit={onCreate}
            style={{
              marginBottom: 16,
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
              gap: 12,
            }}
          >
            {createFields.map((field) => (
              <label key={field.name} style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569' }}>
                {field.label}
                {field.type === 'select' ? (
                  <select
                    value={form[field.name] || ''}
                    required={field.required}
                    onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="">Select…</option>
                    {(field.options || []).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={form[field.name] || ''}
                    required={field.required}
                    placeholder={field.placeholder}
                    onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                    style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
                  />
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={form[field.name] || ''}
                    required={field.required}
                    placeholder={field.placeholder}
                    onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                    style={inputStyle}
                  />
                )}
              </label>
            ))}
            <div style={{ gridColumn: '1 / -1' }}>
              <button
                type="submit"
                disabled={createMut.isPending}
                style={{
                  border: 'none',
                  background: '#0f172a',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {createMut.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        ) : null}

        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,.04)',
          }}
        >
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0' }}>
            <strong style={{ fontSize: 14 }}>
              {rows.length} record{rows.length === 1 ? '' : 's'}
            </strong>
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
                    {cols.map((col) => (
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
                      {cols.map((col) => (
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

const inputStyle: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 13,
  fontWeight: 500,
  color: '#0f172a',
}

export { StatusPill, cell }
