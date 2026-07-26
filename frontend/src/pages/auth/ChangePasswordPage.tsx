import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { changePassword } from '@/api/auth'
import { useAuth } from '@/providers/AuthProvider'
import { getRoleHome } from '@/config/navigation'
import { getApiErrorMessage } from '@/lib/apiClient'
import { PageSkeleton } from '@/components/ui/States'
import './AuthForm.css'

export default function ChangePasswordPage() {
  const { user, loading, refresh } = useAuth()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (loading) return <PageSkeleton />
  if (!user) return <Navigate to="/login" replace />

  const home = getRoleHome(user.role)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (next !== confirm) {
      setError('New passwords do not match.')
      return
    }
    if (next.length < 8 || !/\d/.test(next) || !/[!@#$]/.test(next)) {
      setError('Password must be at least 8 characters with one number and one symbol (!@#$).')
      return
    }

    setBusy(true)
    try {
      await changePassword(current, next)
      await refresh()
      setSuccess('Password changed successfully.')
      setTimeout(() => {
        navigate(home, { replace: true })
      }, 800)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error changing password.'))
    } finally {
      setBusy(false)
    }
  }

  const forced = Boolean(user.must_change_password)

  return (
    <div className="auth-form-page">
      <div className="card">
        <h2>Change Password</h2>
        <p className="lead">
          {forced
            ? 'You must set a new password before continuing.'
            : 'Update your account password below.'}
        </p>

        {error ? (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="alert alert-success" role="status">
            {success}
          </div>
        ) : null}
        {forced ? (
          <div className="alert alert-info" role="status">
            For security, please choose a new password to access your portal.
          </div>
        ) : null}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="current_password">Current Password</label>
            <div className="input-wrap">
              <span className="ico" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              </span>
              <input
                id="current_password"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Current password"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="new_password">New Password</label>
            <div className="input-wrap">
              <span className="ico" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>
              </span>
              <input
                id="new_password"
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="At least 8 characters"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="confirm_password">Confirm New Password</label>
            <div className="input-wrap">
              <span className="ico" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>
              </span>
              <input
                id="confirm_password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Repeat new password"
              />
            </div>
          </div>
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Updating…' : 'Update Password'}
          </button>
        </form>

        {!forced ? (
          <Link to={home} className="back-link">
            ← Go back
          </Link>
        ) : null}
      </div>
    </div>
  )
}
