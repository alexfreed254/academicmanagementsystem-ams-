import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { fetchDepartments, submitApplication } from '@/api/public'
import { getApiErrorMessage } from '@/lib/apiClient'
import { PublicLayout } from '@/pages/main/LandingPage'
import './PublicPages.css'

const LOGO_URL = '/THIKATTILOGO.jpg'

export default function ApplyPage() {
  const deptQ = useQuery({ queryKey: ['public', 'departments'], queryFn: fetchDepartments })
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [courseName, setCourseName] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [fileLabel, setFileLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function onFilesChange(list: FileList | null) {
    setFiles(list)
    if (!list?.length) {
      setFileLabel('')
      return
    }
    setFileLabel(
      Array.from(list)
        .map((f) => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`)
        .join(', '),
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSuccess(null)

    const fd = new FormData()
    fd.append('full_name', fullName.trim())
    fd.append('email', email.trim())
    fd.append('phone', phone.trim())
    fd.append('department_id', departmentId)
    fd.append('course_name', courseName.trim())
    if (files) {
      Array.from(files).forEach((f) => fd.append('documents', f))
    }

    try {
      const result = await submitApplication(fd)
      setSuccess(result.message)
      setFullName('')
      setEmail('')
      setPhone('')
      setDepartmentId('')
      setCourseName('')
      setFiles(null)
      setFileLabel('')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error submitting application.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PublicLayout>
      <div className="apply-shell">
        <div className="apply-header">
          <div className="logo">
            <img src={LOGO_URL} alt="TTTI logo" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, textTransform: 'uppercase' }}>
            Apply for a Course
          </h1>
          <p style={{ fontSize: '0.92rem', color: 'rgba(248,250,252,0.8)', marginTop: 8 }}>
            Submit your details and documents to apply for admission.
          </p>
        </div>

        <form className="apply-form" onSubmit={onSubmit}>
          {error ? <div className="alert alert-error" role="alert">{error}</div> : null}
          {success ? <div className="alert alert-success" role="status">{success}</div> : null}

          <div className="field">
            <label htmlFor="full_name">
              Full Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="full_name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="email">
              Email Address <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+254 7XX XXX XXX"
            />
          </div>
          <div className="field">
            <label htmlFor="department_id">
              Department <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              id="department_id"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              required
              disabled={deptQ.isLoading}
            >
              <option value="">-- Select Department --</option>
              {(deptQ.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="course_name">
              Course Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              id="course_name"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g. Diploma in Information Technology"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="documents">Upload Documents (KCSE Cert, ID, etc.)</label>
            <label className="field-file" htmlFor="documents">
              <div style={{ fontSize: '2rem', color: '#2563eb', marginBottom: 8 }}>↑</div>
              <p>
                <strong>Click to upload</strong> or drag and drop
              </p>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>PDF, JPG, PNG — Max 5MB each</p>
            </label>
            <input
              id="documents"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              style={{ display: 'none' }}
              onChange={(e) => onFilesChange(e.target.files)}
            />
            {fileLabel ? (
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                Selected: {fileLabel}
              </div>
            ) : null}
          </div>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit Application'}
          </button>
        </form>

        <div style={{ textAlign: 'center', padding: '16px 40px 32px', fontSize: '0.9rem', color: '#64748b' }}>
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </PublicLayout>
  )
}
