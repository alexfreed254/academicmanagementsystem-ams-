/**
 * Digital Logbook — React port of templates/student/logbook.html
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, getApiErrorMessage } from '@/lib/apiClient'
import { postAction } from '@/api/mutations'
import { fileToBase64 } from '@/components/detail/DetailShell'
import { PortalShell } from '@/layouts/PortalShell'
import { ErrorState, PageSkeleton } from '@/components/ui/States'
import type { Row } from '@/api/portals'
import './logbook.css'

const SLOTS = [
  { value: '08:00-11:00', label: '08:00 – 11:00', name: 'Morning' },
  { value: '11:00-14:00', label: '11:00 – 14:00', name: 'Late Morning' },
  { value: '14:00-17:00', label: '14:00 – 17:00', name: 'Afternoon' },
  { value: '17:00-20:00', label: '17:00 – 20:00', name: 'Late Afternoon' },
]

type WeekGroup = { week_start: string; label: string; entries: Row[] }
type Payload = {
  attachment: Row | null
  logbooks: Row[]
  weeks_grouped: WeekGroup[]
  today_str: string
}

export default function LogbookPage() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['student-logbook'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/student/logbook')
      return data.data as Payload
    },
  })

  const [logDate, setLogDate] = useState('')
  const [entryTime, setEntryTime] = useState('')
  const [tasks, setTasks] = useState('')
  const [skills, setSkills] = useState('')
  const [challenges, setChallenges] = useState('')
  const [achievements, setAchievements] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const submit = useMutation({
    mutationFn: async () => {
      const evidence = []
      for (const file of files) {
        evidence.push({
          file_name: file.name,
          file_base64: await fileToBase64(file),
          content_type: file.type || 'application/octet-stream',
        })
      }
      return postAction('/student/logbook', {
        attachment_id: q.data?.attachment?.id,
        log_date: logDate || q.data?.today_str,
        entry_time: entryTime,
        tasks_performed: tasks,
        skills_applied: skills,
        challenges_encountered: challenges,
        achievements,
        evidence,
      })
    },
    onSuccess: () => {
      setMsg('Logbook entry added successfully.')
      setErr(null)
      setTasks('')
      setSkills('')
      setChallenges('')
      setAchievements('')
      setEntryTime('')
      setFiles([])
      void qc.invalidateQueries({ queryKey: ['student-logbook'] })
    },
    onError: (e) => {
      setErr(getApiErrorMessage(e))
      setMsg(null)
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!entryTime || !tasks.trim()) {
      setErr('Date, time slot, and activity description are required.')
      return
    }
    submit.mutate()
  }

  if (q.isLoading) {
    return (
      <PortalShell title="Digital Logbook">
        <PageSkeleton />
      </PortalShell>
    )
  }
  if (q.isError || !q.data) {
    return (
      <PortalShell title="Digital Logbook">
        <div className="p-6">
          <ErrorState message={getApiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
        </div>
      </PortalShell>
    )
  }

  const data = q.data
  const attachment = data.attachment
  const today = data.today_str || new Date().toISOString().slice(0, 10)
  const dateValue = logDate || today

  if (!attachment) {
    return (
      <PortalShell title="Digital Logbook">
        <div className="lb-wrap">
          <div className="empty-state">
            <h3>No Industrial Attachment Found</h3>
            <p>You need an industrial attachment to use the logbook.</p>
            <Link to="/student/industrial-attachment" className="lb-cta">
              Go to Industrial Attachment
            </Link>
          </div>
        </div>
      </PortalShell>
    )
  }

  const co = (attachment.companies as Row) || {}

  return (
    <PortalShell title="Digital Logbook">
      <div className="lb-wrap">
        {msg ? <div className="lb-alert ok">{msg}</div> : null}
        {err ? <div className="lb-alert bad">{err}</div> : null}

        <div className="attach-bar">
          <div>
            <div className="attach-name">{String(co.name || attachment.company_name || '—')}</div>
            <div className="attach-meta">
              {String(attachment.start_date || '—')} — {String(attachment.end_date || '—')} ·{' '}
              <span className={`pill ${String(attachment.status)}`}>{String(attachment.status)}</span>
            </div>
          </div>
          <Link to="/student/industrial-attachment" className="back-link">
            ← Back to Attachment
          </Link>
        </div>

        <div className="lb-card">
          <div className="lb-card-head">
            Log Today&apos;s Activity
            <span className="head-right">Every 3 hours — submit one entry per time slot</span>
          </div>
          <div className="lb-card-body">
            <form onSubmit={onSubmit}>
              <div className="f-grid">
                <div className="f-field">
                  <label className="f-label">Activity Date *</label>
                  <input
                    className="f-input"
                    type="date"
                    required
                    max={today}
                    value={dateValue}
                    onChange={(e) => setLogDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="f-field">
                <label className="f-label">Time Slot *</label>
                <div className="slot-grid">
                  {SLOTS.map((s) => (
                    <label key={s.value} className="slot-card">
                      <input
                        type="radio"
                        name="entry_time"
                        checked={entryTime === s.value}
                        onChange={() => setEntryTime(s.value)}
                      />
                      <div className="slot-label">
                        <span className="slot-time">{s.label}</span>
                        <span className="slot-name">{s.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="f-field">
                <label className="f-label">Tasks / Activities Performed *</label>
                <textarea
                  className="f-textarea"
                  required
                  value={tasks}
                  onChange={(e) => setTasks(e.target.value)}
                  placeholder="Describe what you did during this time slot…"
                />
              </div>
              <div className="f-grid">
                <div className="f-field">
                  <label className="f-label">Skills Applied</label>
                  <textarea className="f-textarea" value={skills} onChange={(e) => setSkills(e.target.value)} />
                </div>
                <div className="f-field">
                  <label className="f-label">Challenges Encountered</label>
                  <textarea className="f-textarea" value={challenges} onChange={(e) => setChallenges(e.target.value)} />
                </div>
              </div>
              <div className="f-field">
                <label className="f-label">Achievements</label>
                <textarea className="f-textarea" value={achievements} onChange={(e) => setAchievements(e.target.value)} />
              </div>

              <div className="f-field">
                <label className="f-label">Evidence (photos / PDF / video)</label>
                <div className={`drop-zone ${files.length ? 'has-files' : ''}`}>
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,.pdf,.mp4,.mov,.webm,.mp3,.wav"
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  />
                  <div className="drop-zone-text">
                    {files.length ? `${files.length} file(s) selected` : 'Click to attach evidence files'}
                  </div>
                  <div className="drop-zone-hint">Images, PDF, video or audio — optional</div>
                </div>
                {files.length ? (
                  <ul className="file-list">
                    {files.map((f) => (
                      <li key={f.name + f.size}>
                        {f.name} ({(f.size / 1024).toFixed(1)} KB)
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <button type="submit" className="btn-submit" disabled={submit.isPending}>
                {submit.isPending ? 'Saving…' : 'Save Logbook Entry'}
              </button>
            </form>
          </div>
        </div>

        <div className="lb-card">
          <div className="lb-card-head">
            Weekly Entries
            <span className="head-right">{data.logbooks.length} entry(ies)</span>
          </div>
          <div className="lb-card-body">
            {!data.weeks_grouped?.length ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <h3>No entries yet</h3>
                <p>Log your first activity using the form above.</p>
              </div>
            ) : (
              data.weeks_grouped.map((week) => (
                <div key={week.week_start} className="week-block">
                  <div className="week-label">{week.label}</div>
                  {week.entries.map((entry) => {
                    const evidence = (entry._evidence as Row[]) || []
                    return (
                      <div key={String(entry.id)} className="entry-card">
                        <div className="entry-head">
                          <strong>{String(entry.log_date || entry.entry_date || '')}</strong>
                          <span className="slot-chip">{String(entry.entry_time || '—')}</span>
                          <span className={`status-chip ${String(entry.mentor_approval_status || entry.status || 'pending')}`}>
                            {String(entry.mentor_approval_status || entry.status || 'pending')}
                          </span>
                        </div>
                        <div className="entry-body">{String(entry.tasks_performed || entry.activities || '')}</div>
                        {entry.skills_applied ? (
                          <div className="entry-meta">
                            <strong>Skills:</strong> {String(entry.skills_applied)}
                          </div>
                        ) : null}
                        {evidence.length ? (
                          <div className="ev-row">
                            {evidence.map((ev) => (
                              <a key={String(ev.url)} href={String(ev.url)} target="_blank" rel="noreferrer" className="ev-link">
                                {String(ev.name || 'file')}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PortalShell>
  )
}
