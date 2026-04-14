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

export default function Signup() {
  const { signup } = useAuth()
  const navigate   = useNavigate()
  const [form, setForm]       = useState({ full_name:'', email:'', password:'', confirm:'' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState('')

  const submit = async e => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    if (form.password.length < 8)       { setError('Password must be at least 8 characters'); return }
    setError('')
    setLoading(true)
    try {
      await signup(form.full_name, form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed — please try again')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = name => ({
    width:'100%', padding:'13px 16px',
    background:'rgba(255,255,255,0.04)',
    border:`1px solid ${focused === name ? C.green : C.border}`,
    borderRadius:10, fontSize:14, color:'#fff',
    outline:'none', boxSizing:'border-box',
    fontFamily:"'DM Sans',sans-serif",
    transition:'border-color 0.2s',
  })

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex',
                  fontFamily:"'DM Sans',sans-serif", overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', top:-150, right:200, width:500, height:500,
                    background:'radial-gradient(circle,rgba(16,185,129,0.1) 0%,transparent 70%)',
                    pointerEvents:'none' }}/>
      <div style={{ position:'absolute', bottom:-200, left:-100, width:500, height:500,
                    background:'radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 70%)',
                    pointerEvents:'none' }}/>

      {/* Left branding */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center',
                    padding:'80px', position:'relative', zIndex:1 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700,
                      letterSpacing:'0.12em', textTransform:'uppercase',
                      color:C.green, marginBottom:56,
                      display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:C.green }}/>
          ResumeAI
        </div>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:50, fontWeight:800,
                     color:'#fff', lineHeight:1.1, marginBottom:16 }}>
          Land your<br/><span style={{ color:C.green }}>dream role.</span>
        </h1>
        <p style={{ fontSize:16, color:C.muted, lineHeight:1.7, maxWidth:380 }}>
          Upload your resume, match it against any job description, and chat with an AI that knows every word of your resume.
        </p>
      </div>

      {/* Right form */}
      <div style={{ width:460, display:'flex', alignItems:'center', justifyContent:'center',
                    padding:'48px 56px', background:C.surface,
                    borderLeft:`1px solid ${C.border}`, position:'relative', zIndex:1 }}>
        <form style={{ width:'100%' }} onSubmit={submit}>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:700,
                       color:'#fff', marginBottom:6 }}>Create account</h2>
          <p style={{ fontSize:13, color:C.muted, marginBottom:32 }}>Free — no credit card needed</p>

          {error && (
            <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)',
                          borderRadius:8, padding:'11px 14px', fontSize:13,
                          color:'#f87171', marginBottom:18 }}>
              {error}
            </div>
          )}

          {[
            ['full_name', 'Full name', 'Your Name',        'text'],
            ['email',     'Email',    'you@example.com',   'email'],
          ].map(([name, label, ph, type]) => (
            <div key={name} style={{ marginBottom:16 }}>
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

          <div style={{ display:'flex', gap:12, marginBottom:8 }}>
            {[['password','Password','••••••••'],['confirm','Confirm','••••••••']].map(([name,label,ph]) => (
              <div key={name} style={{ flex:1 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:500,
                                letterSpacing:'0.08em', textTransform:'uppercase',
                                color:C.muted, marginBottom:7 }}>
                  {label}
                </label>
                <input
                  type="password" placeholder={ph}
                  value={form[name]} required
                  onChange={e => setForm({ ...form, [name]: e.target.value })}
                  onFocus={() => setFocused(name)}
                  onBlur={() => setFocused('')}
                  style={{
                    ...inputStyle(name),
                    borderColor: name === 'confirm' && form.confirm && form.confirm !== form.password
                      ? '#ef4444'
                      : focused === name ? C.green : C.border,
                  }}
                />
              </div>
            ))}
          </div>
          <p style={{ fontSize:11, color:C.muted, marginBottom:20 }}>Minimum 8 characters</p>

          <button type="submit" disabled={loading} style={{
            width:'100%', padding:14, background:C.green, border:'none',
            borderRadius:10, fontSize:15, fontWeight:600, color:'#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            fontFamily:"'DM Sans',sans-serif",
            transition:'opacity 0.2s',
          }}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <div style={{ textAlign:'center', marginTop:24, fontSize:13, color:C.muted }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color:C.green, textDecoration:'none', fontWeight:500 }}>
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
