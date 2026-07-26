import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '@/api/auth'
import { getApiErrorMessage } from '@/lib/apiClient'
import './ForgotPasswordPage.css'

const LOGO_URL = '/THIKATTILOGO.jpg'

export default function ForgotPasswordPage() {
  const [tab, setTab] = useState<'staff' | 'student'>('student')
  const [email, setEmail] = useState('')
  const [admission, setAdmission] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [staffMsg, setStaffMsg] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    setStaffMsg(null)

    try {
      const result = await forgotPassword(
        tab === 'staff'
          ? { login_type: 'staff', email: email.trim() }
          : { login_type: 'student', admission_no: admission.trim() },
      )
      if (result.info) setInfo(result.info)
      else if (result.message) setStaffMsg(result.message)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Request failed.'))
    } finally {
      setBusy(false)
    }
  }

  const isStudent = tab === 'student'

  return (
    <div className="auth-forgot-page">
      <div className="card">
        <div className="logo-wrap">
          <img src={LOGO_URL} alt="Thika Technical Training Institute logo" />
          <h1>Thika Technical Training Institute</h1>
          <p>{isStudent ? 'Trainee Password Reset' : 'Staff Password Reset'}</p>
        </div>

        <div className="tabs" role="tablist" aria-label="Account type">
          <button
            type="button"
            className={`tab${isStudent ? ' active' : ''}`}
            role="tab"
            aria-selected={isStudent}
            onClick={() => {
              setTab('student')
              setError(null)
              setInfo(null)
              setStaffMsg(null)
            }}
          >
            Trainee
          </button>
          <button
            type="button"
            className={`tab${!isStudent ? ' active' : ''}`}
            role="tab"
            aria-selected={!isStudent}
            onClick={() => {
              setTab('staff')
              setError(null)
              setInfo(null)
              setStaffMsg(null)
            }}
          >
            Staff / Admin
          </button>
        </div>

        {error ? <div className="error-box" role="alert">{error}</div> : null}

        {info ? (
          <>
            <div className="result-box">
              <h3>Contact Your Administrator</h3>
              <p>{info}</p>
            </div>
            <Link to="/login" className="btn-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', lineHeight: '48px' }}>
              Back to Login
            </Link>
          </>
        ) : staffMsg ? (
          <>
            <div className="result-box">
              <h3>Check Your Email</h3>
              <p>{staffMsg}</p>
            </div>
            <Link to="/login" className="btn-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', lineHeight: '48px' }}>
              Back to Login
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            {isStudent ? (
              <>
                <p className="hint">
                  Self-service password reset is disabled for security. Submit your admission
                  number to see how to get help from your department office.
                </p>
                <label className="form-label" htmlFor="admissionNo">
                  Admission Number
                </label>
                <div className="input-wrap">
                  <span className="ico" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2" /><path d="M12 12h6M12 9h3" /></svg>
                  </span>
                  <input
                    id="admissionNo"
                    type="text"
                    value={admission}
                    onChange={(e) => setAdmission(e.target.value)}
                    placeholder="e.g. A12345"
                    autoComplete="off"
                  />
                </div>
              </>
            ) : (
              <>
                <p className="hint">
                  Enter your institutional email. If an account exists, we will send a reset link.
                </p>
                <label className="form-label" htmlFor="email">
                  Email Address
                </label>
                <div className="input-wrap">
                  <span className="ico" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                  </span>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@ttti.ac.ke"
                    required
                    autoComplete="email"
                  />
                </div>
              </>
            )}

            <button type="submit" className={`btn-submit${isStudent ? '' : ' staff'}`} disabled={busy}>
              {busy ? 'Please wait…' : isStudent ? 'How to Reset Password' : 'Send Reset Link'}
            </button>
          </form>
        )}

        {!info && !staffMsg ? (
          <div className="footer-links">
            <Link to="/login">← Back to Login</Link>
          </div>
        ) : null}
      </div>
    </div>
  )
}
