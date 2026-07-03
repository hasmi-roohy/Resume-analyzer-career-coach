import { useMemo, useRef, useState } from 'react'
import api from '../api/client'
import SkillPill from './SkillPill'

function fitClass(score = 0) {
  if (score >= 75) return 'chip-green'
  if (score >= 55) return 'chip-amber'
  return 'chip-red'
}

export default function PerfectFitPanel() {
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [selected, setSelected] = useState(null)
  const [filters, setFilters] = useState({ location: '', remote: 'Any' })
  const fileRef = useRef(null)

  const jobs = result?.recommendations || []
  const topJob = selected || jobs[0]
  const avgFit = useMemo(() => {
    if (!jobs.length) return 0
    return Math.round(jobs.reduce((sum, job) => sum + job.fit_score, 0) / jobs.length)
  }, [jobs])

  const handleFile = f => {
    if (!f) return
    const ext = '.' + f.name.split('.').pop().toLowerCase()
    if (!['.pdf', '.docx', '.txt'].includes(ext)) {
      setError('Please upload PDF, DOCX, or TXT.')
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
      setError('Upload a resume first.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('location', filters.location)
      form.append('remote', filters.remote)
      const { data } = await api.post('/perfect-fit/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
      setSelected(data.recommendations?.[0] || null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Perfect Fit search failed. Check backend and try again.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setFile(null)
    setResult(null)
    setSelected(null)
    setError('')
  }

  const openJob = job => {
    if (job?.url) window.open(job.url, '_blank', 'noopener,noreferrer')
  }

  const selectJob = job => {
    setSelected(job)
    document.getElementById('perfect-fit-details')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  if (!result) {
    return (
      <div className="content-scroll">
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1fr) 360px', gap: 18 }}>
            <section className="panel panel-pad">
              <div className="eyebrow">Perfect Fit</div>
              <h2 className="section-title">Find jobs from your resume</h2>
              <p className="helper-text">
                Upload your resume and ApplyWise will infer your strongest role direction, retrieve cached live jobs, and rank them with pgvector.
              </p>

              <div
                className={`dropzone ${dragOver ? 'active' : ''} ${file ? 'ready' : ''}`}
                style={{ marginTop: 22 }}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
              >
                <div className="drop-title">{file ? file.name : 'Upload resume for discovery'}</div>
                <div className="drop-subtitle">
                  {file ? `${Math.round(file.size / 1024)} KB selected` : 'PDF, DOCX, or TXT. No job description needed.'}
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
              {loading && <div className="alert" style={{ marginTop: 14, background: '#ecfdf3', color: '#047857', border: '1px solid #bbf7d0' }}>Refreshing job cache and ranking matches...</div>}

              <button
                className="btn btn-success"
                onClick={submit}
                disabled={!file || loading}
                style={{ width: '100%', marginTop: 16 }}
              >
                {loading ? 'Finding jobs...' : 'Find Perfect Fit Jobs'}
              </button>
            </section>

            <section className="panel panel-pad">
              <div className="eyebrow">Refinement</div>
              <h2 className="section-title">Optional filters</h2>
              <p className="helper-text">
                Role, skills, and experience are inferred from your resume. Use these only to narrow the search.
              </p>

              <div className="form-stack">
                <div className="field">
                  <label>Location</label>
                  <input
                    className="input"
                    value={filters.location}
                    onChange={e => setFilters({ ...filters, location: e.target.value })}
                    placeholder="Any location"
                  />
                </div>
                <div className="field">
                  <label>Remote</label>
                  <select
                    className="select"
                    value={filters.remote}
                    onChange={e => setFilters({ ...filters, remote: e.target.value })}
                  >
                    <option>Any</option>
                    <option>Remote</option>
                    <option>On-site</option>
                  </select>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="content-scroll">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h2 className="section-title" style={{ marginTop: 0 }}>Recommended jobs</h2>
          <p className="helper-text">Search query: {result.query}</p>
        </div>
        <button className="btn btn-ghost" onClick={reset}>Upload another resume</button>
      </div>

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-label">Top role</div>
          <div className="stat-value">{result.career_matches?.[0]?.title || 'Discovery'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Jobs found</div>
          <div className="stat-value">{jobs.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Average fit</div>
          <div className="stat-value">{avgFit}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Retrieval</div>
          <div className="stat-value">{result.cache_enabled ? 'pgvector RAG' : 'Live'}</div>
        </div>
      </div>

      {result.fetch_errors?.length > 0 && (
        <div className="alert alert-warn" style={{ marginBottom: 16 }}>
          Some job sources were unavailable, so results may be fewer than usual.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1fr) 360px', gap: 16 }}>
        <section className="panel panel-pad">
          <div className="card-grid">
            {jobs.length === 0 && (
              <div className="alert alert-warn">No strong jobs found yet. Try again later or clear the optional filters.</div>
            )}
            {jobs.map(job => (
              <article
                key={job.id}
                className={`job-card ${selected?.id === job.id ? 'active' : ''}`}
                onClick={() => selectJob(job)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="job-title">{job.title}</div>
                    <div className="job-meta">{job.company} | {job.location} | {job.source}</div>
                  </div>
                  <span className={`chip ${fitClass(job.fit_score)}`}>{job.fit_score}%</span>
                </div>

                {job.matched_skills?.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    {job.matched_skills.slice(0, 6).map(s => (
                      <SkillPill key={`${job.id}-${s}`} label={s} color="var(--green)" />
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-primary" style={{ padding: '7px 10px' }} onClick={e => { e.stopPropagation(); openJob(job) }}>
                    Open job
                  </button>
                  <button className="btn btn-subtle" style={{ padding: '7px 10px' }} onClick={e => { e.stopPropagation(); selectJob(job) }}>
                    Why this fits
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="card-grid">
          <section className="panel panel-pad">
            <div className="eyebrow">Career direction</div>
            {(result.career_matches || []).map(role => (
              <div key={role.title} style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <strong style={{ fontSize: 13 }}>{role.title}</strong>
                  <span style={{ color: 'var(--green)', fontWeight: 800, fontSize: 13 }}>{role.score}%</span>
                </div>
                <div style={{ height: 6, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden', marginTop: 7 }}>
                  <div style={{ width: `${role.score}%`, height: '100%', background: 'var(--green)' }} />
                </div>
              </div>
            ))}
          </section>

          {topJob && (
            <section className="panel panel-pad" id="perfect-fit-details">
              <div className="eyebrow">Why it fits</div>
              <h3 style={{ margin: '8px 0 4px', fontSize: 16 }}>{topJob.title}</h3>
              <div className="job-meta" style={{ marginBottom: 12 }}>
                {topJob.company} | {topJob.location} | {topJob.source}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                <span className={`chip ${fitClass(topJob.fit_score)}`}>{topJob.fit_score}% fit</span>
                {typeof topJob.vector_score === 'number' && (
                  <span className="chip chip-blue">Vector {Math.round(topJob.vector_score * 100)}%</span>
                )}
              </div>
              <p className="helper-text" style={{ marginBottom: 14 }}>{topJob.explanation || 'This job was selected based on resume similarity and skill overlap.'}</p>
              <div style={{ marginTop: 12 }}>
                <div className="field-label">Matched resume skills</div>
                {topJob.matched_skills?.length > 0
                  ? topJob.matched_skills.map(s => <SkillPill key={`match-${topJob.id}-${s}`} label={s} color="var(--green)" />)
                  : <p className="helper-text">No direct skill keywords were found, but pgvector still ranked this role as similar to your resume.</p>}
              </div>
              {topJob.missing_skills?.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div className="field-label">Improve next</div>
                  {topJob.missing_skills.slice(0, 5).map(s => (
                    <SkillPill key={`gap-${s}`} label={s} color="var(--amber)" />
                  ))}
                </div>
              )}
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={() => openJob(topJob)}>
                Open selected job
              </button>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
