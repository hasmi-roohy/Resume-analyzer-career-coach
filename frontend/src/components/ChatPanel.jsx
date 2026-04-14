import { useState, useRef, useEffect } from 'react'
import api from '../api/client'

const C = {
  indigo: '#6366f1', green: '#10b981',
  border: 'rgba(255,255,255,0.08)',
  muted:  'rgba(255,255,255,0.4)',
  bg:     '#0d0d1a',
}

const BASE_PROMPTS = [
  'What are my biggest weaknesses?',
  'Rewrite my professional summary',
  'Rate my resume out of 10',
  'How can I improve my experience section?',
  'What action verbs should I use?',
  'Am I ready to apply for this role?',
]

function buildPrompts(analysis) {
  if (!analysis) return BASE_PROMPTS
  const missing = analysis?.skill_match?.missing?.slice(0, 3) || []
  const score   = analysis?.ats_score ?? null
  const extra   = []
  if (score !== null && score < 70)
    extra.push(`My ATS score is ${score} — what's pulling it down?`)
  if (missing.length > 0)
    extra.push(`How do I quickly learn ${missing[0]}?`)
  if (missing.length > 1)
    extra.push(`I'm missing ${missing.slice(0, 3).join(', ')} — which is most urgent?`)
  return [...extra, ...BASE_PROMPTS].slice(0, 7)
}

function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display:'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom:14 }}>
      {!isUser && (
        <div style={{
          width:28, height:28, borderRadius:'50%',
          background:'rgba(99,102,241,0.2)',
          border:'1px solid rgba(99,102,241,0.35)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:11, fontWeight:700, color:'#a5b4fc',
          flexShrink:0, marginRight:9, marginTop:2,
        }}>
          AI
        </div>
      )}
      <div style={{
        maxWidth:'80%', padding:'11px 15px',
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isUser ? C.indigo : 'rgba(255,255,255,0.05)',
        border: isUser ? 'none' : `1px solid ${C.border}`,
        fontSize:13, lineHeight:1.7, color:'#f1f5f9',
        whiteSpace:'pre-wrap', wordBreak:'break-word',
      }}>
        {msg.content}
      </div>
    </div>
  )
}

export default function ChatPanel({ sessionId, initialMessages = [], analysis = null }) {
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    setMessages(initialMessages)
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text) => {
    const content = (text || input).trim()
    if (!content || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setMessages(prev => [...prev, { role:'user', content, id: Date.now() }])
    setLoading(true)
    try {
      const { data } = await api.post('/chat/message', { session_id: sessionId, content })
      setMessages(prev => [...prev, { role:'assistant', content: data.content, id: data.id }])
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to get response — check backend is running'
      setMessages(prev => [...prev, { role:'assistant', content:`⚠ ${msg}`, id: Date.now() }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const prompts = buildPrompts(analysis)

  return (
    <div style={{
      display:'flex', flexDirection:'column', height:'100%',
      background:C.bg, borderRadius:12, overflow:'hidden',
      border:`1px solid ${C.border}`,
    }}>
      {/* Header */}
      <div style={{ padding:'13px 16px', borderBottom:`1px solid ${C.border}`,
                    display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:C.green,
                      boxShadow:`0 0 6px ${C.green}` }}/>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>AI Career Coach</div>
          <div style={{ fontSize:11, color:C.muted }}>
            Knows your resume · Groq llama-3.1
            {analysis && (
              <span style={{ marginLeft:8, color: analysis.ats_score >= 75 ? C.green : '#f59e0b' }}>
                · ATS {analysis.ats_score}/100
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 14px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign:'center', paddingTop:32 }}>
            <div style={{ fontSize:26, marginBottom:10 }}>💬</div>
            <div style={{ fontSize:13, color:C.muted, marginBottom:6 }}>
              Ask me anything about your resume
            </div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)' }}>
              I have full context of your resume and job description
            </div>
          </div>
        )}
        {messages.map((msg, i) => <Bubble key={msg.id || i} msg={msg}/>)}
        {loading && (
          <div style={{ display:'flex', gap:9, alignItems:'flex-start', marginBottom:14 }}>
            <div style={{
              width:28, height:28, borderRadius:'50%',
              background:'rgba(99,102,241,0.2)',
              border:'1px solid rgba(99,102,241,0.35)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:700, color:'#a5b4fc', flexShrink:0,
            }}>AI</div>
            <div style={{ padding:'11px 15px', borderRadius:'14px 14px 14px 4px',
                          background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', gap:5 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width:6, height:6, borderRadius:'50%', background:C.indigo,
                    animation:'pulse 1.2s ease-in-out infinite',
                    animationDelay:`${i * 0.2}s`,
                  }}/>
                ))}
              </div>
              <style>{`@keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}`}</style>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Quick prompts */}
      <div style={{ padding:'8px 12px 0', borderTop:`1px solid ${C.border}`, flexShrink:0 }}>
        <div style={{ display:'flex', gap:5, overflowX:'auto', paddingBottom:8, scrollbarWidth:'none' }}>
          {prompts.map(q => (
            <button key={q} onClick={() => send(q)} disabled={loading} style={{
              flexShrink:0, padding:'4px 11px', borderRadius:100, fontSize:11, fontWeight:500,
              border:'1px solid rgba(99,102,241,0.3)', background:'rgba(99,102,241,0.08)',
              color:'rgba(255,255,255,0.65)',
              cursor: loading ? 'not-allowed' : 'pointer',
              whiteSpace:'nowrap', transition:'all 0.15s',
              fontFamily:"'DM Sans',sans-serif",
            }}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ padding:'10px 12px 14px', flexShrink:0 }}>
        <div style={{
          display:'flex', gap:8,
          background:'rgba(255,255,255,0.04)',
          border:`1px solid ${C.border}`,
          borderRadius:12, padding:'9px 12px', alignItems:'flex-end',
        }}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={handleKey}
            placeholder="Ask about your resume… (Enter to send, Shift+Enter for new line)"
            disabled={loading}
            style={{
              flex:1, background:'none', border:'none', outline:'none',
              resize:'none', fontSize:13, color:'#fff',
              fontFamily:"'DM Sans',sans-serif",
              lineHeight:1.5, maxHeight:120, overflow:'auto',
            }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{
              flexShrink:0, width:34, height:34, borderRadius:8,
              background: input.trim() && !loading ? C.indigo : 'rgba(255,255,255,0.07)',
              border:'none',
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              color:'#fff', fontSize:15,
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'background 0.2s',
            }}
          >↑</button>
        </div>
      </div>
    </div>
  )
}
