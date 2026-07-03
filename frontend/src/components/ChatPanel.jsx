import { useEffect, useRef, useState } from 'react'
import api from '../api/client'

const BASE_PROMPTS = [
  'What are my biggest resume weaknesses?',
  'Rewrite my professional summary',
  'Rate my resume out of 10',
  'How can I improve my experience section?',
  'What action verbs should I use?',
  'Am I ready to apply for this role?',
]

function buildPrompts(analysis) {
  if (!analysis) return BASE_PROMPTS
  const missing = analysis?.skill_match?.missing?.slice(0, 3) || []
  const score = analysis?.ats_score ?? null
  const extra = []
  if (score !== null && score < 70) extra.push(`My ATS score is ${score}. What is pulling it down?`)
  if (missing.length > 0) extra.push(`How do I quickly improve ${missing[0]}?`)
  if (missing.length > 1) extra.push(`Which missing skill should I prioritize: ${missing.slice(0, 3).join(', ')}?`)
  return [...extra, ...BASE_PROMPTS].slice(0, 7)
}

function MessageContent({ content }) {
  const lines = String(content || '').split('\n')
  const blocks = []
  let bullets = []
  let paragraph = []

  const flushParagraph = () => {
    if (!paragraph.length) return
    blocks.push({ type: 'p', text: paragraph.join(' ') })
    paragraph = []
  }

  const flushBullets = () => {
    if (!bullets.length) return
    blocks.push({ type: 'ul', items: bullets })
    bullets = []
  }

  lines.forEach(raw => {
    const line = raw.trim()
    if (!line) {
      flushParagraph()
      flushBullets()
      return
    }
    const bullet = line.match(/^[-*]\s+(.+)$/)
    if (bullet) {
      flushParagraph()
      bullets.push(bullet[1].replace(/^"|"$/g, ''))
      return
    }
    flushBullets()
    paragraph.push(line)
  })
  flushParagraph()
  flushBullets()

  return (
    <div className="message-content">
      {blocks.map((block, index) => {
        if (block.type === 'ul') {
          return (
            <ul key={index}>
              {block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}
            </ul>
          )
        }
        return <p key={index}>{block.text}</p>
      })}
    </div>
  )
}

function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`message-row ${isUser ? 'user' : ''}`}>
      <div className={`bubble ${isUser ? 'user' : 'assistant'}`}>
        {isUser ? msg.content : <MessageContent content={msg.content} />}
      </div>
    </div>
  )
}

export default function ChatPanel({ sessionId, initialMessages = [], analysis = null }) {
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    setMessages(initialMessages)
  }, [sessionId, initialMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async text => {
    const content = (text || input).trim()
    if (!content || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setMessages(prev => [...prev, { role: 'user', content, id: Date.now() }])
    setLoading(true)
    try {
      const { data } = await api.post('/chat/message', { session_id: sessionId, content })
      setMessages(prev => [...prev, { role: 'assistant', content: data.content, id: data.id }])
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to get response. Check backend is running.'
      setMessages(prev => [...prev, { role: 'assistant', content: msg, id: Date.now() }])
    } finally {
      setLoading(false)
    }
  }

  const prompts = buildPrompts(analysis)

  return (
    <div className="panel chat-shell">
      <div className="chat-header">
        <div style={{ fontWeight: 800 }}>AI Career Coach</div>
        <div className="helper-text">
          Resume-aware coaching{analysis ? ` | ATS ${analysis.ats_score}/100` : ''}
        </div>
      </div>

      <div className="messages">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 32 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Ask about your resume</div>
            <div className="helper-text">Your coach uses the uploaded resume and job description context.</div>
          </div>
        )}
        {messages.map((msg, i) => <Bubble key={msg.id || i} msg={msg} />)}
        {loading && (
          <div className="message-row">
            <div className="bubble assistant">Thinking...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="prompt-strip">
        <div className="prompt-list">
          {prompts.map(q => (
            <button
              key={q}
              className="btn btn-subtle"
              style={{ padding: '6px 10px', fontSize: 12, borderRadius: 999 }}
              onClick={() => send(q)}
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="chat-input-row">
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            disabled={loading}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            className="input"
            placeholder="Ask about your resume..."
            style={{ resize: 'none', minHeight: 44, maxHeight: 120, lineHeight: 1.45 }}
          />
          <button className="btn btn-primary" onClick={() => send()} disabled={loading || !input.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
