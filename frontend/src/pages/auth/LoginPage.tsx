import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { getRoleHome } from '@/config/navigation'
import { getApiErrorMessage } from '@/lib/apiClient'
import './LoginPage.css'

const LOGO_URL = '/THIKATTILOGO.jpg'

export default function LoginPage() {
  const { user, loading, loginStaff, loginStudent } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'staff' | 'student'>('staff')
  const [email, setEmail] = useState('')
  const [admission, setAdmission] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && user) {
    return <Navigate to={getRoleHome(user.role)} replace />
  }

  function switchTab(type: 'staff' | 'student') {
    setTab(type)
    setError(null)
    if (type === 'student') setEmail('')
    else setAdmission('')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const u =
        tab === 'staff'
          ? await loginStaff(email.trim(), password)
          : await loginStudent(admission.trim(), password)
      navigate(getRoleHome(u.role), { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Login failed'))
    } finally {
      setBusy(false)
    }
  }

  const isStudent = tab === 'student'
  const year = new Date().getFullYear()

  return (
    <div className="login-page">
      <div className="ambient" aria-hidden="true">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
      </div>

      <div className="wrap">
        <div className="login-shell">
          <section className="hero-panel" aria-label="Institute branding">
            <svg className="hex-pattern" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <pattern id="hex" x="0" y="0" width="52" height="60" patternUnits="userSpaceOnUse">
                  <polygon
                    points="26,2 50,15 50,45 26,58 2,45 2,15"
                    fill="none"
                    stroke="white"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hex)" />
            </svg>
            <div className="hero-glow" aria-hidden="true" />

            <div className="hero-brand">
              <div className="logo-ring">
                <img src={LOGO_URL} alt="Thika Technical Training Institute logo" />
              </div>
              <div>
                <h1>
                  Thika Technical
                  <br />
                  Training Institute
                </h1>
                <p className="hero-eyebrow">Academic Management System</p>
              </div>
              <div className="hero-rule" aria-hidden="true" />
              <p className="hero-copy">
                A unified portal for academic records, scheduling, examinations, and institutional
                services.
              </p>
            </div>

            <div className="stats">
              <div className="stat">
                <strong>9+</strong>
                <small>User Roles</small>
              </div>
              <div className="stat">
                <strong>1</strong>
                <small>Platform</small>
              </div>
              <div className="stat">
                <strong>24/7</strong>
                <small>Access</small>
              </div>
            </div>

            <div className="secure-badge">
              <div className="secure-dot" aria-hidden="true" />
              <span>Secure connection · SSL encrypted</span>
            </div>
          </section>

          <section className="login-panel">
            <div className="mobile-brand" aria-label="Institute branding">
              <div className="logo-ring">
                <img src={LOGO_URL} alt="Thika Technical Training Institute logo" />
              </div>
              <div>
                <strong>Thika Technical Training Institute</strong>
                <span>Academic Management System</span>
              </div>
            </div>

            <div className="tabs" role="tablist" aria-label="Login type">
              <button
                type="button"
                className={`tab${!isStudent ? ' active' : ''}`}
                role="tab"
                aria-selected={!isStudent}
                onClick={() => switchTab('staff')}
              >
                Staff / Admin
              </button>
              <button
                type="button"
                className={`tab${isStudent ? ' active' : ''}`}
                role="tab"
                aria-selected={isStudent}
                onClick={() => switchTab('student')}
              >
                Trainee
              </button>
            </div>

            <div className="heading">
              <h2>{isStudent ? 'Trainee portal' : 'Welcome back'}</h2>
              <p>
                {isStudent
                  ? 'Sign in using your admission number.'
                  : 'Sign in with your institutional email address.'}
              </p>
            </div>

            {error ? (
              <div className="alert alert-error" role="alert">
                <span className="alert-icon" aria-hidden="true">
                  ✕
                </span>
                <span>{error}</span>
              </div>
            ) : null}

            <form className="form" onSubmit={onSubmit} noValidate={false}>
              {!isStudent ? (
                <div className="field">
                  <label htmlFor="email">Email Address</label>
                  <div className="input-wrap">
                    <span className="ico" aria-hidden="true">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </span>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      placeholder="you@ttti.ac.ke/your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="field">
                  <label htmlFor="admissionNo">Admission Number</label>
                  <div className="input-wrap">
                    <span className="ico" aria-hidden="true">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <circle cx="8" cy="12" r="2" />
                        <path d="M12 12h6M12 9h3" />
                      </svg>
                    </span>
                    <input
                      id="admissionNo"
                      type="text"
                      name="admission_no"
                      placeholder="A123456"
                      value={admission}
                      onChange={(e) => setAdmission(e.target.value)}
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="field">
                <label htmlFor="password">Password</label>
                <div className="input-wrap has-toggle">
                  <span className="ico" aria-hidden="true">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="toggle-pw"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" y1="2" x2="22" y2="22" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="meta">
                <label>
                  <input
                    type="checkbox"
                    name="remember"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />{' '}
                  Remember me
                </label>
                {isStudent ? (
                  <Link to="/auth/forgot-password">Forgot Password?</Link>
                ) : null}
              </div>

              <button type="submit" className="btn-login" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>

            <p className="support">
              Need help? Contact <a href="mailto:support@ttti.ac.ke">support@ttti.ac.ke</a>
              {' · '}
              <Link to="/welcome">Welcome page</Link>
              {' · '}
              <Link to="/">Home</Link>
            </p>
          </section>
        </div>

        <p className="bottom-tag">
          © {year} Thika Technical Training Institute · All rights reserved
        </p>
      </div>
    </div>
  )
}
