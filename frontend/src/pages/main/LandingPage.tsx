import { useEffect, useRef, type ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { getRoleHome } from '@/config/navigation'
import { PageSkeleton } from '@/components/ui/States'
import './PublicPages.css'

const LOGO_URL = '/THIKATTILOGO.jpg'

const PARTICLE_COLORS = [
  'rgba(99,179,237,.35)',
  'rgba(147,197,253,.25)',
  'rgba(59,130,246,.3)',
  'rgba(255,255,255,.12)',
]

function PublicNav() {
  const location = useLocation()
  const path = location.pathname

  return (
    <nav className="site-nav" aria-label="Public site">
      <Link to="/" className="brand">
        <img src={LOGO_URL} alt="TTTI logo" />
        <strong>Thika Technical Training Institute</strong>
      </Link>
      <div className="nav-links">
        <Link to="/about" className={path === '/about' ? 'active' : undefined}>
          About
        </Link>
        <Link to="/apply" className={path === '/apply' ? 'active' : undefined}>
          Apply
        </Link>
        <Link to="/contact" className={path === '/contact' ? 'active' : undefined}>
          Contact
        </Link>
        <Link to="/login" className="cta">
          Sign In
        </Link>
      </div>
    </nav>
  )
}

function ParticleBackground() {
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    for (let i = 0; i < 22; i++) {
      const p = document.createElement('div')
      p.className = 'particle'
      const size = Math.random() * 12 + 4
      p.style.width = `${size}px`
      p.style.height = `${size}px`
      p.style.left = `${Math.random() * 100}%`
      p.style.background = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]
      p.style.animationDuration = `${Math.random() * 18 + 10}s`
      p.style.animationDelay = `${Math.random() * 15}s`
      canvas.appendChild(p)
    }
  }, [])

  return (
    <>
      <div className="bg-canvas" aria-hidden="true" />
      <div ref={canvasRef} aria-hidden="true" />
    </>
  )
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-page">
      <ParticleBackground />
      <PublicNav />
      {children}
    </div>
  )
}

export default function LandingPage() {
  const { user, loading } = useAuth()

  if (loading) return <PageSkeleton />
  if (user) return <Navigate to={getRoleHome(user.role)} replace />

  return (
    <PublicLayout>
      <div className="page-shell">
        <section className="hero" aria-label="Institute overview">
          <div className="hero-top">
            <div className="logo-wrap">
              <img src={LOGO_URL} alt="Thika Technical Training Institute logo" />
            </div>
            <h1>
              Thika Technical
              <br />
              Training Institute
            </h1>
            <p className="motto">
              &ldquo;Digitize the Journey. Verify the Competence. Celebrate the Graduate.&rdquo;
            </p>
            <p>
              Unified academic management for administrators, trainers, trainees and industry
              partners — attendance, assessments, portfolios, clearance and job placements in one
              enterprise platform.
            </p>
          </div>

          <div className="stats">
            <div className="stat">
              <strong>9+</strong>
              <small>User Roles</small>
            </div>
            <div className="stat">
              <strong>24/7</strong>
              <small>Access</small>
            </div>
            <div className="stat">
              <strong>100%</strong>
              <small>Digital</small>
            </div>
          </div>

          <div className="portals">
            <div className="portals-title">Available Portals</div>
            <div className="portal-item">
              <span>Trainee — Dashboard, POE, Attendance, Exams, Clearance</span>
            </div>
            <div className="portal-item">
              <span>Trainer — Attendance, Marks, Assessment Review</span>
            </div>
            <div className="portal-item">
              <span>Department Office — Full Academic Management</span>
            </div>
            <div className="portal-links">
              <Link to="/apply">Apply for a Course</Link>
            </div>
          </div>
        </section>

        <section className="content-panel">
          <div>
            <h2>Welcome back</h2>
            <p className="sub">Sign in to access your portal and continue your work.</p>
          </div>

          <Link to="/login" className="btn-primary">
            Sign In →
          </Link>

          <div className="content-footer">
            <span>
              Student? <Link to="/auth/student-register">Register here</Link>
            </span>
            <Link to="/auth/forgot-password">Forgot Password?</Link>
          </div>

          <p style={{ textAlign: 'center', fontSize: 11.5, color: '#94a3b8' }}>
            Secured with industry-grade encryption &amp; RBAC
          </p>
        </section>
      </div>
    </PublicLayout>
  )
}
