import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const features = [
  ['Resume Match', 'Target one job description.'],
  ['AI Coach', 'Improve sections with context.'],
  ['Perfect Fit', 'Discover jobs from your resume.'],
  ['Job RAG', 'Rank cached live jobs with pgvector.'],
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-layout">
        <section className="auth-brand">
          <div className="brand-mark">ApplyWise</div>
          <h1>Match better. Apply smarter.</h1>
          <p>
            Improve your resume for a target job, then discover roles that fit
            your skills using cached live jobs and vector search.
          </p>
          <div className="auth-feature-grid">
            {features.map(([title, text]) => (
              <div className="auth-feature" key={title}>
                <strong>{title}</strong>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="auth-panel-wrap">
          <form className="auth-panel" onSubmit={submit}>
            <div className="eyebrow">Welcome back</div>
            <h2>Sign in</h2>
            <p className="helper-text">Continue to your ApplyWise dashboard.</p>

            <div className="form-stack">
              {error && <div className="alert alert-error">{error}</div>}

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

              <div className="field">
                <label>Password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Enter password"
                  value={form.password}
                  required
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
              </div>

              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

            <p className="helper-text" style={{ marginTop: 20, textAlign: 'center' }}>
              New here?{' '}
              <Link to="/signup" style={{ color: 'var(--blue)', fontWeight: 800, textDecoration: 'none' }}>
                Create an account
              </Link>
            </p>
          </form>
        </section>
      </div>
    </div>
  )
}
