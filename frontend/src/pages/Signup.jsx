import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async e => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setError('')
    setLoading(true)
    try {
      await signup(form.full_name, form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-layout">
        <section className="auth-brand">
          <div className="brand-mark">ApplyWise</div>
          <h1>Build a sharper job search.</h1>
          <p>
            Use Resume Match for target roles and Perfect Fit for resume-only
            recommendations powered by cached live jobs and pgvector retrieval.
          </p>
          <div className="auth-feature-grid">
            <div className="auth-feature">
              <strong>Target a JD</strong>
              <span>See exactly where your resume matches.</span>
            </div>
            <div className="auth-feature">
              <strong>Explore roles</strong>
              <span>Discover suitable openings from your resume.</span>
            </div>
          </div>
        </section>

        <section className="auth-panel-wrap">
          <form className="auth-panel" onSubmit={submit}>
            <div className="eyebrow">Get started</div>
            <h2>Create account</h2>
            <p className="helper-text">No payment details needed.</p>

            <div className="form-stack">
              {error && <div className="alert alert-error">{error}</div>}

              <div className="field">
                <label>Full name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Your name"
                  value={form.full_name}
                  required
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                />
              </div>

              <div className="field">
                <label>Email</label>
                <input
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  required
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="password-grid">
                <div className="field">
                  <label>Password</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="8+ characters"
                    value={form.password}
                    required
                    onChange={e => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Confirm</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Repeat"
                    value={form.confirm}
                    required
                    onChange={e => setForm({ ...form, confirm: e.target.value })}
                  />
                </div>
              </div>

              <button className="btn btn-success" type="submit" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </div>

            <p className="helper-text" style={{ marginTop: 20, textAlign: 'center' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--green)', fontWeight: 800, textDecoration: 'none' }}>
                Sign in
              </Link>
            </p>
          </form>
        </section>
      </div>
    </div>
  )
}
