import { Link } from 'react-router-dom'
import { PublicLayout } from '@/pages/main/LandingPage'
import './PublicPages.css'

export default function ContactPage() {
  return (
    <PublicLayout>
      <article className="content-card">
        <h1>Contact</h1>
        <p>Contact the institution administration for admissions, support, or general enquiries.</p>

        <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
          <div>
            <strong style={{ display: 'block', marginBottom: 4 }}>General Support</strong>
            <a href="mailto:support@ttti.ac.ke" style={{ color: '#2563eb' }}>
              support@ttti.ac.ke
            </a>
          </div>
          <div>
            <strong style={{ display: 'block', marginBottom: 4 }}>Campus</strong>
            <span style={{ color: '#475569' }}>Thika Technical Training Institute, Thika, Kenya</span>
          </div>
          <div>
            <strong style={{ display: 'block', marginBottom: 4 }}>Office Hours</strong>
            <span style={{ color: '#475569' }}>Monday – Friday, 8:00 AM – 5:00 PM</span>
          </div>
        </div>

        <p style={{ marginTop: 24 }}>
          Trainees needing password help should visit their department office with admission number
          and valid ID.{' '}
          <Link to="/auth/forgot-password" style={{ color: '#2563eb', fontWeight: 700 }}>
            Learn more
          </Link>
        </p>
      </article>
    </PublicLayout>
  )
}
