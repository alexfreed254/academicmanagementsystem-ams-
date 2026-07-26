import { Link } from 'react-router-dom'
import { PublicLayout } from '@/pages/main/LandingPage'
import './PublicPages.css'

export default function AboutPage() {
  return (
    <PublicLayout>
      <article className="content-card">
        <h1>About TTTI</h1>
        <p>
          Thika Technical Training Institute (TTTI) is a leading TVET institution committed to
          producing competent graduates through competency-based education and training aligned with
          CDACC standards.
        </p>
        <p>
          The Academic Management System unifies trainee records, trainer workflows, examination
          processes, industrial attachment tracking, clearance, and administrative oversight in a
          single secure platform.
        </p>
        <p>
          Our motto — <em>Digitize the Journey. Verify the Competence. Celebrate the Graduate.</em>{' '}
          — reflects our commitment to transparent, verifiable academic outcomes.
        </p>
        <p style={{ marginTop: 24 }}>
          <Link to="/apply" style={{ color: '#2563eb', fontWeight: 700 }}>
            Apply for a course →
          </Link>
          {' · '}
          <Link to="/login" style={{ color: '#2563eb', fontWeight: 700 }}>
            Sign in to your portal
          </Link>
        </p>
      </article>
    </PublicLayout>
  )
}
