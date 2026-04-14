import { useState, useRef } from 'react'
import api from '../api/client'

const C = {
  indigo: '#6366f1', green: '#10b981',
  border: 'rgba(255,255,255,0.08)',
  muted:  'rgba(255,255,255,0.4)',
  surface:'rgba(255,255,255,0.03)',
}

export default function UploadPanel({ onSuccess }) {
  const [file, setFile]         = useState(null)
  const [jd, setJd]             = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [progress, setProgress] = useState('')
  const fileRef = useRef(null)

  const handleFile = f => {
    if (!f) return
    const allowed = ['.pdf', '.docx', '.doc', '.txt']
    const ext = '.' + f.name.split('.').pop().toLowerCase()
    if (!allowed.includes(ext)) {
      setError('Unsupported file type. Please use PDF, DOCX, or TXT.')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('File too large — maximum size is 5 MB')
      return
    }
    setFile(f)
    setError('')
  }

  const submit = async () => {
    if (!file) { setError('Please select a resume file'); return }
    setLoading(true)
    setError('')
    setProgress('Extracting text from file…')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('jd_text', jd)
      setProgress('Running NLP analysis…')
      const { data } = await api.post('/resume/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setProgress('Getting AI coaching…')
      onSuccess(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed — make sure backend is running on port 8000')
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  return (
    <div style={{ maxWidth: 580, margin: '0 auto', paddingTop: 24 }}>
      <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:700,
                   color:'#fff', marginBottom:6 }}>
        Analyze Your Resume
      </h2>
      <p style={{ fontSize:14, color:C.muted, marginBottom:28, lineHeight:1.6 }}>
        Upload your resume and optionally paste a job description for a full skill gap analysis and AI coaching.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? C.indigo : file ? C.green : C.border}`,
          borderRadius: 16, padding: '44px 32px', textAlign: 'center',
          cursor: 'pointer', marginBottom: 20,
          background: dragOver ? 'rgba(99,102,241,0.05)' : C.surface,
          transition: 'all 0.2s',
        }}
      >
        <div style={{ fontSize:32, marginBottom:12 }}>{file ? '📄' : '⬆'}</div>
        <div style={{ fontSize:15, color: file ? C.green : '#fff',
                      fontWeight: file ? 600 : 400, marginBottom:5 }}>
          {file ? file.name : 'Drop your resume here'}
        </div>
        <div style={{ fontSize:13, color:C.muted }}>
          {file
            ? `${(file.size / 1024).toFixed(0)} KB · click to change`
            : 'PDF, DOCX, or TXT · max 5 MB · or click to browse'}
        </div>
        <input
          ref={fileRef} type="file"
          accept=".pdf,.docx,.doc,.txt"
          style={{ display:'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
      </div>

      {/* Job description */}
      <div style={{ marginBottom:20 }}>
        <label style={{ display:'block', fontSize:11, fontWeight:500,
                        letterSpacing:'0.08em', textTransform:'uppercase',
                        color:C.muted, marginBottom:8 }}>
          Job Description{' '}
          <span style={{ color:'rgba(255,255,255,0.2)', fontWeight:400,
                         textTransform:'none', letterSpacing:0 }}>
            (optional — enables JD match scoring)
          </span>
        </label>
        <textarea
          rows={6} value={jd}
          onChange={e => setJd(e.target.value)}
          placeholder="Paste the full job description here for skill gap analysis…"
          style={{
            width:'100%', padding:'13px 16px',
            background:'rgba(255,255,255,0.04)',
            border:`1px solid ${C.border}`,
            borderRadius:10, fontSize:14, color:'#fff',
            outline:'none', resize:'vertical', boxSizing:'border-box',
            fontFamily:"'DM Sans',sans-serif", lineHeight:1.6,
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)',
                      borderRadius:8, padding:'11px 14px', fontSize:13,
                      color:'#f87171', marginBottom:16 }}>
          {error}
        </div>
      )}

      {/* Progress */}
      {loading && progress && (
        <div style={{ display:'flex', alignItems:'center', gap:10,
                      padding:'11px 14px', background:'rgba(99,102,241,0.08)',
                      border:'1px solid rgba(99,102,241,0.2)',
                      borderRadius:8, marginBottom:16 }}>
          <div style={{ width:14, height:14, border:'2px solid rgba(99,102,241,0.3)',
                        borderTopColor:C.indigo, borderRadius:'50%',
                        animation:'spin 0.8s linear infinite', flexShrink:0 }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <span style={{ fontSize:13, color:'rgba(255,255,255,0.7)' }}>{progress}</span>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={submit}
        disabled={loading || !file}
        style={{
          width:'100%', padding:15,
          background: file && !loading ? C.indigo : 'rgba(255,255,255,0.06)',
          border:'none', borderRadius:10, fontSize:15, fontWeight:600,
          color: file && !loading ? '#fff' : 'rgba(255,255,255,0.3)',
          cursor: file && !loading ? 'pointer' : 'not-allowed',
          fontFamily:"'DM Sans',sans-serif", transition:'all 0.2s',
        }}
      >
        {loading ? 'Analyzing…' : 'Analyze Resume'}
      </button>

      <div style={{ marginTop:10, fontSize:12, color:C.muted, textAlign:'center' }}>
        NLP section extraction → skill matching → AI coaching
      </div>
    </div>
  )
}
