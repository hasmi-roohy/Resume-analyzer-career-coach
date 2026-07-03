import { useRef, useState } from 'react'
import api from '../api/client'

export default function UploadPanel({ onSuccess }) {
  const [file, setFile] = useState(null)
  const [jd, setJd] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const fileRef = useRef(null)

  const handleFile = f => {
    if (!f) return
    const ext = '.' + f.name.split('.').pop().toLowerCase()
    if (!['.pdf', '.docx', '.txt'].includes(ext)) {
      setError('Unsupported file type. Please use PDF, DOCX, or TXT.')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5 MB.')
      return
    }
    setFile(f)
    setError('')
  }

  const submit = async () => {
    if (!file) {
      setError('Please select a resume file.')
      return
    }
    setLoading(true)
    setError('')
    setProgress('Extracting resume text')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('jd_text', jd)
      setProgress('Running resume analysis')
      const { data } = await api.post('/resume/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setProgress('Preparing AI coaching')
      onSuccess(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Make sure the backend is running on port 8000.')
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 0.9fr) minmax(420px, 1.1fr)', gap: 18 }}>
        <section className="panel panel-pad">
          <div className="eyebrow">Resume Match</div>
          <h2 className="section-title">Upload resume</h2>
          <p className="helper-text">
            Use this workflow when you already have a job description and want a targeted gap analysis.
          </p>

          <div
            className={`dropzone ${dragOver ? 'active' : ''} ${file ? 'ready' : ''}`}
            style={{ marginTop: 22 }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
          >
            <div className="drop-title">{file ? file.name : 'Choose or drop a resume'}</div>
            <div className="drop-subtitle">
              {file ? `${Math.round(file.size / 1024)} KB selected` : 'PDF, DOCX, or TXT. Maximum 5 MB.'}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])}
            />
          </div>

          {error && <div className="alert alert-error" style={{ marginTop: 14 }}>{error}</div>}
          {loading && progress && <div className="alert" style={{ marginTop: 14, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>{progress}...</div>}

          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={loading || !file}
            style={{ width: '100%', marginTop: 16 }}
          >
            {loading ? 'Analyzing...' : 'Analyze Resume'}
          </button>
        </section>

        <section className="panel panel-pad">
          <div className="eyebrow">Target job</div>
          <h2 className="section-title">Job description</h2>
          <p className="helper-text">
            Optional, but recommended for accurate JD match score, missing skills, and chat coaching.
          </p>
          <textarea
            className="textarea"
            value={jd}
            onChange={e => setJd(e.target.value)}
            placeholder="Paste the job description here..."
            style={{ marginTop: 18, minHeight: 270 }}
          />
        </section>
      </div>
    </div>
  )
}
