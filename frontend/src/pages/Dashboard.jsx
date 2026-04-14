import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import UploadPanel   from '../components/UploadPanel'
import AnalysisPanel from '../components/AnalysisPanel'
import ChatPanel     from '../components/ChatPanel'

const C = {
  indigo: '#6366f1', green: '#10b981', red: '#ef4444', amber: '#f59e0b',
  border: 'rgba(255,255,255,0.07)', muted: 'rgba(255,255,255,0.4)',
  surface:'rgba(255,255,255,0.025)', bg:'#080811',
}

function AtsChip({ score }) {
  const c = score >= 75 ? C.green : score >= 50 ? C.amber : C.red
  return (
    <span style={{ fontSize:10, fontWeight:700, color:c,
                   background:`${c}18`, padding:'2px 7px',
                   borderRadius:6, flexShrink:0 }}>
      {score}
    </span>
  )
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [sessions, setSessions]             = useState([])
  const [activeId, setActiveId]             = useState(null)
  const [activeData, setActiveData]         = useState(null)
  const [showUpload, setShowUpload]         = useState(true)
  const [loadingSession, setLoadingSession] = useState(false)

  useEffect(() => { fetchSessions() }, [])

  const fetchSessions = async () => {
    try {
      const { data } = await api.get('/resume/sessions')
      setSessions(data)
    } catch {}
  }

  const handleUploadSuccess = data => {
    fetchSessions()
    setActiveId(data.session_id)
    setActiveData({
      analysis: data.analysis,
      messages: [{ role:'assistant', content: data.ai_intro, id: 0 }],
      filename: data.filename || 'Resume',
    })
    setShowUpload(false)
  }

  const loadSession = async s => {
    if (s.id === activeId && !showUpload) return
    setLoadingSession(true)
    setActiveId(s.id)
    try {
      const { data } = await api.get(`/resume/session/${s.id}`)
      setActiveData({
        analysis: data.analysis,
        messages: data.messages,
        filename: data.filename,
      })
      setShowUpload(false)
    } catch {
      alert('Failed to load session')
    } finally {
      setLoadingSession(false)
    }
  }

  const deleteSession = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm('Delete this session?')) return
    try {
      await api.delete(`/resume/session/${id}`)
      setSessions(prev => prev.filter(s => s.id !== id))
      if (activeId === id) {
        setActiveId(null); setActiveData(null); setShowUpload(true)
      }
    } catch {}
  }

  const startNew = () => {
    setActiveId(null); setActiveData(null); setShowUpload(true)
  }

  const initials = user?.full_name
    ?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

  return (
    <div style={{ display:'flex', height:'100vh', background:C.bg,
                  fontFamily:"'DM Sans',sans-serif", color:'#f1f5f9', overflow:'hidden' }}>

      {/* ── Sidebar ── */}
      <aside style={{ width:240, flexShrink:0, display:'flex', flexDirection:'column',
                      background:C.surface, borderRight:`1px solid ${C.border}` }}>
        {/* Brand + new button */}
        <div style={{ padding:'18px 16px 14px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700,
                        color:C.indigo, marginBottom:12 }}>
            ResumeAI
          </div>
          <button onClick={startNew} style={{
            width:'100%', padding:'8px 0', background:C.indigo,
            border:'none', borderRadius:8, fontSize:13, fontWeight:600,
            color:'#fff', cursor:'pointer', fontFamily:"'DM Sans',sans-serif",
          }}>
            + New Analysis
          </button>
        </div>

        {/* Session list */}
        <div style={{ flex:1, overflowY:'auto', padding:'8px' }}>
          <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.1em',
                        textTransform:'uppercase', color:'rgba(255,255,255,0.2)',
                        padding:'6px 8px 8px' }}>
            History
          </div>
          {sessions.length === 0 && (
            <div style={{ padding:'16px 8px', fontSize:12, color:'rgba(255,255,255,0.25)',
                          textAlign:'center', lineHeight:1.7 }}>
              No analyses yet.<br/>Upload a resume to start.
            </div>
          )}
          {sessions.map(s => (
            <div key={s.id} onClick={() => loadSession(s)}
              style={{
                padding:'9px 10px', borderRadius:8, cursor:'pointer', marginBottom:3,
                background: activeId===s.id && !showUpload ? 'rgba(99,102,241,0.12)' : 'transparent',
                border:`1px solid ${activeId===s.id && !showUpload ? 'rgba(99,102,241,0.3)':'transparent'}`,
                transition:'all 0.15s', display:'flex', gap:8, alignItems:'flex-start',
              }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, color:'#fff', marginBottom:3,
                              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {s.filename}
                </div>
                <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                  <AtsChip score={s.ats_score}/>
                  {s.has_jd && (
                    <span style={{ fontSize:9, color:C.indigo,
                                   background:'rgba(99,102,241,0.1)',
                                   padding:'1px 5px', borderRadius:3 }}>JD</span>
                  )}
                  <span style={{ fontSize:10, color:C.muted }}>
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button onClick={e => deleteSession(e, s.id)}
                style={{ background:'none', border:'none', color:C.muted,
                         cursor:'pointer', fontSize:14, padding:'0 2px',
                         flexShrink:0, lineHeight:1 }}>
                ×
              </button>
            </div>
          ))}
        </div>

        {/* User row */}
        <div style={{ padding:'12px 14px', borderTop:`1px solid ${C.border}`,
                      display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:C.indigo,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:11, fontWeight:700, flexShrink:0 }}>
            {initials}
          </div>
          <div style={{ flex:1, minWidth:0, fontSize:12, color:'#fff',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {user?.full_name}
          </div>
          <button onClick={() => { logout(); navigate('/login') }}
            style={{ background:'none', border:'none', color:C.muted,
                     cursor:'pointer', fontSize:11 }}>
            Exit
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Top bar */}
        <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.border}`,
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      flexShrink:0 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:700 }}>
            {showUpload ? 'New Analysis' : activeData?.filename || 'Resume Analysis'}
          </div>
          {activeData && !showUpload && (
            <div style={{ fontSize:12, color:C.muted }}>
              ATS{' '}
              <span style={{
                fontWeight:700,
                color: activeData.analysis?.ats_score >= 75 ? C.green
                      : activeData.analysis?.ats_score >= 50 ? C.amber : C.red,
              }}>
                {activeData.analysis?.ats_score ?? '—'}/100
              </span>
              {' · '}
              {activeData.analysis?.resume_skills?.length ?? 0} skills detected
            </div>
          )}
        </div>

        {/* Loading */}
        {loadingSession && (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ fontSize:13, color:C.muted }}>Loading session…</div>
          </div>
        )}

        {/* Upload screen */}
        {!loadingSession && showUpload && (
          <div style={{ flex:1, overflowY:'auto', padding:'24px 32px' }}>
            <UploadPanel onSuccess={handleUploadSuccess}/>
          </div>
        )}

        {/* Split panel — Analysis LEFT · Chat RIGHT */}
        {!loadingSession && !showUpload && activeData && (
          <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

            {/* Left — scrollable analysis */}
            <div style={{ flex:'0 0 52%', overflowY:'auto',
                          padding:'20px 20px 24px 24px',
                          borderRight:`1px solid ${C.border}` }}>
              <AnalysisPanel analysis={activeData.analysis}/>
            </div>

            {/* Right — chat */}
            <div style={{ flex:1, overflow:'hidden', padding:'12px 20px 16px 16px' }}>
              <ChatPanel
                sessionId={activeId}
                initialMessages={activeData.messages}
                analysis={activeData.analysis}
              />
            </div>

          </div>
        )}
      </main>
    </div>
  )
}
