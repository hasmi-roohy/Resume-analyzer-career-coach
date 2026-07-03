import ScoreRing from './ScoreRing'
import ScoreBar from './ScoreBar'
import SkillPill from './SkillPill'

function Card({ title, color = 'var(--blue)', children }) {
  return (
    <section className="panel panel-pad" style={{ marginBottom: 14 }}>
      {title && (
        <div className="eyebrow" style={{ color, marginBottom: 12 }}>
          {title}
        </div>
      )}
      {children}
    </section>
  )
}

export default function AnalysisPanel({ analysis }) {
  if (!analysis) return null

  const {
    ats_score = 0,
    contact_score = 0,
    summary_score = 0,
    skills_score = 0,
    experience_score = 0,
    format_score = 0,
    resume_skills = [],
    jd_skills = [],
    skill_match = {},
    suggestions = [],
    format_issues = [],
    personal = {},
    word_count = 0,
  } = analysis

  const { matched = [], missing = [], score: jd_score = 0 } = skill_match
  const hasJD = jd_skills.length > 0

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: hasJD ? '140px 140px minmax(220px, 1fr)' : '140px minmax(220px, 1fr)', gap: 14, marginBottom: 14 }}>
        <section className="panel panel-pad" style={{ display: 'grid', placeItems: 'center' }}>
          <ScoreRing score={ats_score} size={98} label="ATS Score" />
        </section>

        {hasJD && (
          <section className="panel panel-pad" style={{ display: 'grid', placeItems: 'center' }}>
            <ScoreRing score={jd_score} size={98} label="JD Match" color="var(--blue)" />
          </section>
        )}

        <section className="panel panel-pad">
          <div className="eyebrow" style={{ color: 'var(--muted)', marginBottom: 14 }}>Score Breakdown</div>
          <ScoreBar label="Contact Info" score={contact_score} />
          <ScoreBar label="Summary" score={summary_score} />
          <ScoreBar label="Skills" score={skills_score} />
          <ScoreBar label="Experience" score={experience_score} />
          <ScoreBar label="Formatting" score={format_score} />
        </section>
      </div>

      {(personal.email || personal.phone || personal.linkedin || personal.github) && (
        <Card title="Detected Contact Info" color="var(--green)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
            {personal.name && <strong style={{ fontSize: 13 }}>{personal.name}</strong>}
            {personal.email && <span className="helper-text">Email: {personal.email}</span>}
            {personal.phone && <span className="helper-text">Phone: {personal.phone}</span>}
            {personal.linkedin && <span className="helper-text">LinkedIn: {personal.linkedin}</span>}
            {personal.github && <span className="helper-text">GitHub: {personal.github}</span>}
          </div>
        </Card>
      )}

      {hasJD && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <Card title={`Matched Skills (${matched.length})`} color="var(--green)">
            {matched.length === 0
              ? <span className="helper-text">No matching skills detected.</span>
              : matched.map(s => <SkillPill key={s} label={s} color="var(--green)" />)}
          </Card>
          <Card title={`Missing from Resume (${missing.length})`} color="var(--red)">
            {missing.length === 0
              ? <span style={{ color: 'var(--green)', fontSize: 13 }}>All JD skills are present.</span>
              : missing.map(s => <SkillPill key={s} label={s} color="var(--red)" />)}
          </Card>
        </div>
      )}

      {resume_skills.length > 0 && (
        <Card title={`All Detected Skills (${resume_skills.length})`}>
          {resume_skills.map(s => <SkillPill key={s} label={s} color="var(--blue)" />)}
        </Card>
      )}

      {suggestions.length > 0 && (
        <Card title="Suggestions" color="var(--amber)">
          <div className="card-grid">
            {suggestions.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, lineHeight: 1.55 }}>
                <span style={{ color: 'var(--amber)', fontWeight: 800 }}>-</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {format_issues.length > 0 && (
        <Card title="Format Issues" color="var(--red)">
          <div className="card-grid">
            {format_issues.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, lineHeight: 1.55 }}>
                <span style={{ color: 'var(--red)', fontWeight: 800 }}>!</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))', gap: 16 }}>
          {[
            ['Word Count', word_count],
            ['Skills Found', resume_skills.length],
            ['JD Skills', jd_skills.length || '-'],
            ['Format Score', `${format_score}%`],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
