import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const C = {
  indigo:  '#6366f1',
  green:   '#10b981',
  border:  'rgba(255,255,255,0.08)',
  muted:   'rgba(255,255,255,0.4)',
  bg:      '#080811',
  surface: 'rgba(255,255,255,0.03)',
}

export default function Login() {
  const { login }  = useAuth()
  const navigate   = useNavigate()
  const [form, setForm]       = useState({ email: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState('')

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

  const inputStyle = name => ({
    width: '100%', padding: '13px 16px',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${focused === name ? C.indigo : C.border}`,
    borderRadius: 10, fontSize: 14, color: '#fff',
    outline: 'none', boxSizing: 'border-box',
    fontFamily: "'DM Sans',sans-serif",
    transition: 'border-color 0.2s',
  })

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex',
                  fontFamily: "'DM Sans',sans-serif", overflow: 'hidden', position: 'relative' }}>
      {/* Glow blobs */}
      <div style={{ position:'absolute', top:-200, left:-200, width:600, height:600,
                    background:'radial-gradient(circle,rgba(99,102,241,0.13) 0%,transparent 70%)',
                    pointerEvents:'none' }}/>
      <div style={{ position:'absolute', bottom:-200, right:-100, width:500, height:500,
                    background:'radial-gradient(circle,rgba(16,185,129,0.08) 0%,transparent 70%)',
                    pointerEvents:'none' }}/>

      {/* Left branding */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center',
                    padding:'80px', position:'relative', zIndex:1 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700,
                      letterSpacing:'0.12em', textTransform:'uppercase',
                      color:C.indigo, marginBottom:56,
                      display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:C.indigo }}/>
          ResumeAI
        </div>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:50, fontWeight:800,
                     color:'#fff', lineHeight:1.1, marginBottom:16 }}>
          Your resume,<br/><span style={{ color:C.indigo }}>analyzed.</span>
        </h1>
        <p style={{ fontSize:16, color:C.muted, lineHeight:1.7, maxWidth:380, marginBottom:44 }}>
          NLP-powered resume analysis. Match against job descriptions. Chat with AI that knows your resume inside out.
        </p>
        {[
          'Resume ↔ JD skill gap analysis',
          'AI chat with full resume context',
          'ATS score + section-by-section breakdown',
          'Instant actionable suggestions',
        ].map(f => (
          <div key={f} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <span style={{ color:C.green, fontSize:13 }}>✓</span>
            <span style={{ fontSize:14, color:'rgba(255,255,255,0.55)' }}>{f}</span>
          </div>
        ))}
      </div>

      {/* Right form */}
      <div style={{ width:460, display:'flex', alignItems:'center', justifyContent:'center',
                    padding:'48px 56px', background:C.surface,
                    borderLeft:`1px solid ${C.border}`, position:'relative', zIndex:1 }}>
        <form style={{ width:'100%' }} onSubmit={submit}>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:700,
                       color:'#fff', marginBottom:6 }}>Welcome back</h2>
          <p style={{ fontSize:13, color:C.muted, marginBottom:36 }}>Sign in to your account</p>

          {error && (
            <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)',
                          borderRadius:8, padding:'11px 14px', fontSize:13,
                          color:'#f87171', marginBottom:20 }}>
              {error}
            </div>
          )}

          {[
            ['email',    'Email',    'you@example.com', 'email'],
            ['password', 'Password', '••••••••',        'password'],
          ].map(([name, label, ph, type]) => (
            <div key={name} style={{ marginBottom:18 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:500,
                              letterSpacing:'0.08em', textTransform:'uppercase',
                              color:C.muted, marginBottom:7 }}>
                {label}
              </label>
              <input
                type={type} placeholder={ph}
                value={form[name]} required
                onChange={e => setForm({ ...form, [name]: e.target.value })}
                onFocus={() => setFocused(name)}
                onBlur={() => setFocused('')}
                style={inputStyle(name)}
              />
            </div>
          ))}

          <button type="submit" disabled={loading} style={{
            width:'100%', padding:14, background:C.indigo, border:'none',
            borderRadius:10, fontSize:15, fontWeight:600, color:'#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            fontFamily:"'DM Sans',sans-serif", marginTop:4,
            transition:'opacity 0.2s',
          }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div style={{ textAlign:'center', marginTop:24, fontSize:13, color:C.muted }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color:C.indigo, textDecoration:'none', fontWeight:500 }}>
              Create one
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
