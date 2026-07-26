import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api, getApiErrorMessage } from '@/lib/apiClient'
import { DetailCard, DetailShell, InfoGrid, PrimaryButton, StatusBadge, inputStyle } from '@/components/detail/DetailShell'
import { cell } from '@/pages/shared/ApiTablePage'
import type { Row } from '@/api/portals'

export function ClearanceVerifyPage() {
  const [params, setParams] = useSearchParams()
  const initial = params.get('serial') || ''
  const [serial, setSerial] = useState(initial)
  const [submitted, setSubmitted] = useState(initial)

  const q = useQuery({
    queryKey: ['clearance-verify', submitted],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/clearance/verify/${encodeURIComponent(submitted)}`)
      return data.data as Record<string, unknown>
    },
    enabled: Boolean(submitted),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const s = serial.trim().toUpperCase()
    setSubmitted(s)
    setParams(s ? { serial: s } : {})
  }

  const result = (q.data?.result as Row) || null
  const verifyError = q.data?.error as string | null

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', padding: '40px 16px' }}>
      <div style={{ maxWidth: 540, margin: '0 auto', textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#1e3a5f' }}>Clearance Verification</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>Verify a TTTI course clearance certificate by serial number.</p>
      </div>

      <form
        onSubmit={onSubmit}
        style={{
          maxWidth: 540,
          margin: '0 auto 24px',
          background: '#fff',
          border: '2px solid #1565c0',
          borderRadius: 16,
          padding: 28,
        }}
      >
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 8, textAlign: 'left' }}>Serial number</label>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={serial}
            onChange={(e) => setSerial(e.target.value.toUpperCase())}
            placeholder="TTTI/CLR/2026/XXXXXXXX"
            style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', fontWeight: 600 }}
          />
          <PrimaryButton type="submit">Verify</PrimaryButton>
        </div>
      </form>

      {q.isLoading ? <p style={{ textAlign: 'center', color: '#64748b' }}>Checking…</p> : null}
      {q.isError ? <p style={{ textAlign: 'center', color: '#991b1b' }}>{getApiErrorMessage(q.error)}</p> : null}

      {submitted && !q.isLoading && verifyError ? (
        <div style={{ maxWidth: 540, margin: '0 auto', background: '#fef2f2', border: '2px solid #ef4444', borderRadius: 14, padding: 24 }}>
          <strong style={{ color: '#991b1b' }}>{verifyError}</strong>
        </div>
      ) : null}

      {result ? (
        <div style={{ maxWidth: 540, margin: '0 auto', background: '#fff', border: '2px solid #22c55e', borderRadius: 14, padding: 24 }}>
          <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 18, color: '#1e3a5f', marginBottom: 16 }}>
            {String(result._serial || submitted)}
          </div>
          <InfoGrid
            items={[
              { label: 'Trainee', value: cell(result, 'user_profiles.full_name') },
              { label: 'Admission', value: cell(result, 'user_profiles.admission_no') },
              { label: 'Course', value: cell(result, 'courses.name') },
              { label: 'Department', value: cell(result, 'departments.name') },
              { label: 'Status', value: <StatusBadge value={result.status} /> },
            ]}
          />
        </div>
      ) : null}

      <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#6b7280' }}>
        <Link to="/login" style={{ color: '#1565c0', fontWeight: 700 }}>Staff login</Link>
      </p>
    </div>
  )
}

export function ClearanceManageTrainersPage() {
  const { requestId } = useParams()
  const q = useQuery({
    queryKey: ['clearance-manage-trainers', requestId],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/clearance/manage-trainers/${requestId}`)
      return data.data as Record<string, unknown>
    },
    enabled: Boolean(requestId),
  })

  const cr = (q.data?.clearance as Row) || {}
  const trainers = ((q.data?.trainer_approvals as Row[]) || []) as Row[]

  return (
    <DetailShell
      title="Manage Trainer Clearances"
      backTo="/clearance/"
      subtitle={cell(cr, 'user_profiles.full_name')}
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
    >
      <InfoGrid
        items={[
          { label: 'Course', value: cell(cr, 'courses.name') },
          { label: 'Approved trainers', value: `${q.data?.approved_count ?? 0} / ${q.data?.required_count ?? 0}` },
          { label: 'Stage 1 complete', value: q.data?.stage1_done ? 'Yes' : 'No' },
        ]}
      />
      <DetailCard title="Trainer approvals">
        {trainers.map((t) => (
          <div key={String(t.id)} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
            <span>{cell(t.trainer as Row, 'full_name', 'Trainer')}</span>
            <StatusBadge value={t.is_waived ? 'waived' : t.status} />
          </div>
        ))}
      </DetailCard>
    </DetailShell>
  )
}

export function ClearanceCertificatePage() {
  const { requestId } = useParams()
  const q = useQuery({
    queryKey: ['clearance-certificate', requestId],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/clearance/certificate/${requestId}`)
      return data.data as Record<string, unknown>
    },
    enabled: Boolean(requestId),
  })

  const cr = (q.data?.clearance as Row) || {}
  const student = (q.data?.student as Row) || {}
  const serial = String(q.data?.serial || '')
  const approvals = ((q.data?.approvals as Row[]) || []) as Row[]

  return (
    <DetailShell
      title="Clearance Certificate"
      backTo="/clearance/"
      loading={q.isLoading}
      error={q.isError ? getApiErrorMessage(q.error) : null}
    >
      <div
        className="print-certificate"
        style={{
          background: '#fff',
          border: '2px solid #1565c0',
          borderRadius: 12,
          padding: 32,
          maxWidth: 800,
          margin: '0 auto',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#1e3a5f' }}>TTTI Course Clearance Certificate</h2>
          <p style={{ margin: 0, fontFamily: 'monospace', fontWeight: 700, color: '#1565c0' }}>{serial}</p>
        </div>
        <InfoGrid
          items={[
            { label: 'Trainee', value: cell(student, 'full_name') },
            { label: 'Admission No.', value: cell(student, 'admission_no') },
            { label: 'Course', value: cell(cr, 'courses.name') },
            { label: 'Department', value: cell(cr, 'departments.name') },
            { label: 'Status', value: <StatusBadge value={cr.status} /> },
          ]}
        />
        <DetailCard title="Approval trail">
          {approvals.map((a) => (
            <div key={String(a.id)} style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
              {cell(a, 'approver_category')} — {cell(a, 'status')} {a.approved_at ? `· ${String(a.approved_at).slice(0, 10)}` : ''}
            </div>
          ))}
        </DetailCard>
        <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <PrimaryButton onClick={() => window.print()}>Print certificate</PrimaryButton>
          <Link
            to={`/clearance/form/print?request_id=${encodeURIComponent(String(requestId ?? ''))}`}
            target="_blank"
            style={{ alignSelf: 'center', fontSize: 13, fontWeight: 700, color: '#1565c0' }}
          >
            Print clearance form →
          </Link>
          <Link to={`/clearance/verify/${encodeURIComponent(serial)}`} style={{ alignSelf: 'center', fontSize: 13, fontWeight: 700, color: '#1565c0' }}>
            Public verify link →
          </Link>
        </div>
      </div>
    </DetailShell>
  )
}
