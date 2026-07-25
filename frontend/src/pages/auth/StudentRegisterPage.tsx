import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { studentRegister } from '@/api/auth'
import { getApiErrorMessage } from '@/lib/apiClient'
import './AuthForm.css'

export default function StudentRegisterPage() {
  const navigate = useNavigate()
  const [admission, setAdmission] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [disabled, setDisabled] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setBusy(true)
    try {
      const result = await studentRegister({
        admission_no: admission.trim(),
        full_name: fullName.trim(),
        email: email.trim(),
        password,
      })
      setSuccess(result.message)
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Registration failed.')
      if (msg.toLowerCase().includes('not available')) setDisabled(true)
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-form-page">
      <div className="card card-wide">
        <h2>Student Registration</h2>
        <p className="lead">Create your student account to access the portal.</p>

        {disabled ? (
          <div className="alert alert-info" role="status">
            Student self-registration is currently disabled. Contact your department office for
            account setup.
          </div>
        ) : null}

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

        {!disabled ? (
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="admission_no">Admission Number</label>
              <div className="input-wrap">
                <span className="ico" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2" /><path d="M12 12h6M12 9h3" /></svg>
                </span>
                <input
                  id="admission_no"
                  type="text"
                  value={admission}
                  onChange={(e) => setAdmission(e.target.value)}
                  required
                  placeholder="e.g. A123456"
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="full_name">Full Name</label>
              <div className="input-wrap">
                <span className="ico" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </span>
                <input
                  id="full_name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Your full name"
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrap">
                <span className="ico" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <span className="ico" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="At least 8 characters"
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="confirm_password">Confirm Password</label>
              <div className="input-wrap">
                <span className="ico" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </span>
                <input
                  id="confirm_password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder="Repeat password"
                />
              </div>
            </div>
            <button type="submit" className="btn" disabled={busy}>
              {busy ? 'Registering…' : 'Register'}
            </button>
          </form>
        ) : null}

        <Link to="/login" className="back-link">
          ← Back to Login
        </Link>
      </div>
    </div>
  )
}
