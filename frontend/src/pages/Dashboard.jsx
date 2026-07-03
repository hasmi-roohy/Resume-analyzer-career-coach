import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import UploadPanel from '../components/UploadPanel'
import AnalysisPanel from '../components/AnalysisPanel'
import ChatPanel from '../components/ChatPanel'
import PerfectFitPanel from '../components/PerfectFitPanel'

function scoreClass(score = 0) {
  if (score >= 75) return 'chip-green'
  if (score >= 50) return 'chip-amber'
  return 'chip-red'
}

function NavButton({ active, title, subtitle, onClick }) {
  return (
    <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}>
      <strong>{title}</strong>
      <span>{subtitle}</span>
    </button>
  )
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [activeData, setActiveData] = useState(null)
  const [showUpload, setShowUpload] = useState(true)
  const [loadingSession, setLoadingSession] = useState(false)
  const [activeView, setActiveView] = useState('resume')

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const { data } = await api.get('/resume/sessions')
      setSessions(data)
    } catch {}
  }

  const handleUploadSuccess = data => {
    setActiveView('resume')
    fetchSessions()
    setActiveId(data.session_id)
    setActiveData({
      analysis: data.analysis,
      messages: [{ role: 'assistant', content: data.ai_intro, id: 0 }],
      filename: data.filename || 'Resume',
    })
    setShowUpload(false)
  }

  const loadSession = async s => {
    setActiveView('resume')
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
        setActiveId(null)
        setActiveData(null)
        setShowUpload(true)
      }
    } catch {}
  }

  const startNew = () => {
    setActiveView('resume')
    setActiveId(null)
    setActiveData(null)
    setShowUpload(true)
  }

  const openPerfectFit = () => {
    setActiveView('perfect')
  }

  const initials = user?.full_name
    ?.split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand-mark">ApplyWise</div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={startNew}>
            New Resume Match
          </button>
        </div>

        <div className="nav-section">
          <NavButton
            active={activeView === 'resume'}
            title="Resume Match"
            subtitle="Resume + JD + AI chat"
            onClick={() => setActiveView('resume')}
          />
          <NavButton
            active={activeView === 'perfect'}
            title="Perfect Fit"
            subtitle="Resume-only job discovery"
            onClick={openPerfectFit}
          />
        </div>

        <div className="history-list">
          <div className="history-title">Resume Match History</div>
          {sessions.length === 0 && (
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.6, padding: 8 }}>
              Upload a resume to create your first analysis.
            </p>
          )}
          {sessions.map(s => (
            <div
              className={`history-item ${activeId === s.id && !showUpload && activeView === 'resume' ? 'active' : ''}`}
              key={s.id}
              onClick={() => loadSession(s)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="history-name">{s.filename}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 7, flexWrap: 'wrap' }}>
                  <span className={`chip ${scoreClass(s.ats_score)}`}>{s.ats_score}</span>
                  {s.has_jd && <span className="chip chip-blue">JD</span>}
                  <span style={{ color: 'rgba(255,255,255,0.42)', fontSize: 11 }}>
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button
                onClick={e => deleteSession(e, s.id)}
                style={{
                  border: 0,
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.44)',
                  cursor: 'pointer',
                  fontSize: 18,
                  lineHeight: 1,
                }}
                aria-label="Delete session"
              >
                x
              </button>
            </div>
          ))}
        </div>

        <div className="user-row">
          <div className="avatar">{initials}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.full_name}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Signed in</div>
          </div>
          <button
            className="btn"
            onClick={() => { logout(); navigate('/login') }}
            style={{ padding: '7px 9px', background: 'rgba(255,255,255,0.08)', color: '#fff' }}
          >
            Exit
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1>
              {activeView === 'perfect'
                ? 'Perfect Fit'
                : showUpload ? 'New Resume Match' : activeData?.filename || 'Resume Analysis'}
            </h1>
            <div className="helper-text">
              {activeView === 'perfect'
                ? 'Resume-only job recommendations using cached live jobs.'
                : 'Analyze a resume, match it to a JD, and chat with your AI coach.'}
            </div>
          </div>
          {activeView === 'resume' && activeData && !showUpload && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`chip ${scoreClass(activeData.analysis?.ats_score)}`}>
                ATS {activeData.analysis?.ats_score ?? 0}/100
              </span>
              <span className="chip chip-blue">
                {activeData.analysis?.resume_skills?.length ?? 0} skills
              </span>
            </div>
          )}
        </div>

        {loadingSession && (
          <div className="content-scroll" style={{ display: 'grid', placeItems: 'center' }}>
            <div className="helper-text">Loading session...</div>
          </div>
        )}

        {activeView === 'perfect' && !loadingSession && (
          <PerfectFitPanel />
        )}

        {activeView === 'resume' && !loadingSession && showUpload && (
          <div className="content-scroll">
            <UploadPanel onSuccess={handleUploadSuccess} />
          </div>
        )}

        {activeView === 'resume' && !loadingSession && !showUpload && activeData && (
          <div className="workspace-split">
            <div className="split-pane">
              <AnalysisPanel analysis={activeData.analysis} />
            </div>
            <div className="split-pane">
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
