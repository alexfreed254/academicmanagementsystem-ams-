/**
 * Mentoring Tool — port of templates/student/mentoring_tool.html
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { api, getApiErrorMessage } from '@/lib/apiClient'
import { postAction } from '@/api/mutations'
import { fileToBase64 } from '@/components/detail/DetailShell'
import { PortalShell } from '@/layouts/PortalShell'
import { ErrorState, PageSkeleton } from '@/components/ui/States'
import type { Row } from '@/api/portals'
import './mentoring-tool.css'

type Payload = { uploads: Row[] }

export default function MentoringToolPage() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['student-mentoring-tool'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/student/mentoring-tool')
      return data.data as Payload
    },
  })

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Please select a PDF file to upload.')
      return postAction('/student/mentoring-tool', {
        title,
        description,
        file_name: file.name,
        file_base64: await fileToBase64(file),
        content_type: 'application/pdf',
      })
    },
    onSuccess: () => {
      setMsg(`"${title}" uploaded successfully.`)
      setErr(null)
      setTitle('')
      setDescription('')
      setFile(null)
      void qc.invalidateQueries({ queryKey: ['student-mentoring-tool'] })
    },
    onError: (e) => {
      setErr(getApiErrorMessage(e))
      setMsg(null)
    },
  })

  const del = useMutation({
    mutationFn: (id: string) => postAction(`/student/mentoring-tool/${id}/delete`, {}),
    onSuccess: (res) => {
      const t = (res as { data?: { title?: string } })?.data?.title
      setMsg(t ? `"${t}" deleted.` : 'Deleted.')
      setErr(null)
      void qc.invalidateQueries({ queryKey: ['student-mentoring-tool'] })
    },
    onError: (e) => {
      setErr(getApiErrorMessage(e))
      setMsg(null)
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setErr('Please provide a title for this upload.')
      return
    }
    upload.mutate()
  }

  if (q.isLoading) {
    return (
      <PortalShell title="Mentoring Tool / Hardcopy Logbook">
        <PageSkeleton />
      </PortalShell>
    )
  }
  if (q.isError || !q.data) {
    return (
      <PortalShell title="Mentoring Tool / Hardcopy Logbook">
        <div className="p-6">
          <ErrorState message={getApiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
        </div>
      </PortalShell>
    )
  }

  const uploads = q.data.uploads || []

  return (
    <PortalShell title="Mentoring Tool / Hardcopy Logbook">
      <div className="mt-wrap">
        {msg ? <div className="mt-alert ok">{msg}</div> : null}
        {err ? <div className="mt-alert bad">{err}</div> : null}

        <div className="mt-hero">
          <h1>Mentoring Tool / Hardcopy Logbook</h1>
          <p>
            Upload scanned PDFs of your mentoring assessment tool or handwritten logbook pages for review by your
            liaison officer and department admin.
          </p>
        </div>

        <div className="mt-upload-card">
          <h2>Upload New Document</h2>
          <form onSubmit={onSubmit}>
            <div className="mt-form-grid">
              <div className="mt-field">
                <label>
                  Document Title <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Week 1-4 Logbook Pages, Mentoring Tool Part A…"
                />
              </div>
              <div className="mt-field">
                <label>Description (optional)</label>
                <textarea
                  maxLength={400}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief note about what is covered in this document…"
                />
              </div>
              <div className="mt-field">
                <label>
                  PDF File <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div className={`mt-dropzone ${file ? 'has-file' : ''}`}>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    required
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <div className="mt-dz-text">{file ? file.name : 'Click to browse or drag & drop'}</div>
                  <div className="mt-dz-sub">PDF only · Max 20 MB</div>
                </div>
              </div>
            </div>
            <button type="submit" className="mt-upload-btn" disabled={upload.isPending}>
              {upload.isPending ? 'Uploading…' : 'Upload Document'}
            </button>
          </form>
        </div>

        <div className="mt-list-card">
          <div className="mt-list-head">
            My Uploaded Documents
            <span className="count">{uploads.length} file(s)</span>
          </div>
          {!uploads.length ? (
            <div className="mt-empty">
              <p>No documents uploaded yet.</p>
            </div>
          ) : (
            uploads.map((u) => (
              <div key={String(u.id)} className="mt-file-row">
                <div className="mt-file-icon">PDF</div>
                <div className="mt-file-info">
                  <div className="mt-file-title">{String(u.title || '')}</div>
                  <div className="mt-file-meta">
                    {String(u.file_name || '')}
                    {u.file_size ? ` · ${(Number(u.file_size) / 1024).toFixed(1)} KB` : ''}
                    {u.uploaded_at ? ` · ${String(u.uploaded_at).slice(0, 10)}` : ''}
                  </div>
                  {u.description ? <div className="mt-file-desc">{String(u.description)}</div> : null}
                </div>
                <div className="mt-file-actions">
                  {u.file_url ? (
                    <a className="btn-view" href={String(u.file_url)} target="_blank" rel="noreferrer">
                      View
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="btn-del"
                    onClick={() => {
                      if (confirm(`Delete "${String(u.title)}"?`)) del.mutate(String(u.id))
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PortalShell>
  )
}
