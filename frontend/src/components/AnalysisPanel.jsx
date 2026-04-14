import ScoreRing from './ScoreRing'
import ScoreBar  from './ScoreBar'
import SkillPill from './SkillPill'

const C = {
  border:  'rgba(255,255,255,0.07)',
  muted:   'rgba(255,255,255,0.4)',
  surface: 'rgba(255,255,255,0.03)',
  indigo:  '#6366f1',
  green:   '#10b981',
  red:     '#ef4444',
  amber:   '#f59e0b',
}

function Card({ title, color = C.indigo, children, style = {} }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: '18px 20px',
      marginBottom: 14,
      ...style,
    }}>
      {title && (
        <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.08em',
                      textTransform:'uppercase', color, marginBottom:12 }}>
          {title}
        </div>
      )}
      {children}
    </div>
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

      {/* Scores */}
      <div style={{ display:'flex', gap:14, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
                      padding:'20px 24px', display:'flex', flexDirection:'column',
                      alignItems:'center', gap:4 }}>
          <ScoreRing score={ats_score} size={108} label="ATS Score"/>
        </div>

        {hasJD && (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12,
                        padding:'20px 24px', display:'flex', flexDirection:'column',
                        alignItems:'center', gap:4 }}>
            <ScoreRing score={jd_score} size={108} label="JD Match" color={C.indigo}/>
          </div>
        )}

        <div style={{ flex:1, background:C.surface, border:`1px solid ${C.border}`,
                      borderRadius:12, padding:'18px 20px', minWidth:180 }}>
          <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.08em',
                        textTransform:'uppercase', color:C.muted, marginBottom:14 }}>
            Score Breakdown
          </div>
          <ScoreBar label="Contact Info"  score={contact_score}  />
          <ScoreBar label="Summary"       score={summary_score}  />
          <ScoreBar label="Skills"        score={skills_score}   />
          <ScoreBar label="Experience"    score={experience_score}/>
          <ScoreBar label="Formatting"    score={format_score}   />
        </div>
      </div>

      {/* Contact info */}
      {(personal.email || personal.phone || personal.linkedin) && (
        <Card title="Detected Contact Info" color={C.green}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 20px' }}>
            {personal.name     && <span style={{ fontSize:13, color:'#fff', fontWeight:600 }}>{personal.name}</span>}
            {personal.email    && <span style={{ fontSize:12, color:C.muted }}>✉ {personal.email}</span>}
            {personal.phone    && <span style={{ fontSize:12, color:C.muted }}>📞 {personal.phone}</span>}
            {personal.linkedin && <span style={{ fontSize:12, color:C.indigo }}>🔗 {personal.linkedin}</span>}
            {personal.github   && <span style={{ fontSize:12, color:C.muted }}>⚡ {personal.github}</span>}
          </div>
        </Card>
      )}

      {/* JD skill match */}
      {hasJD && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
          <Card title={`✓ Matched Skills (${matched.length})`} color={C.green} style={{ marginBottom:0 }}>
            {matched.length === 0
              ? <span style={{ fontSize:13, color:C.muted }}>None matched</span>
              : matched.map(s => <SkillPill key={s} label={s} color={C.green}/>)
            }
          </Card>
          <Card title={`✗ Missing from Resume (${missing.length})`} color={C.red} style={{ marginBottom:0 }}>
            {missing.length === 0
              ? <span style={{ fontSize:13, color:C.green }}>All JD skills present!</span>
              : missing.map(s => <SkillPill key={s} label={s} color={C.red}/>)
            }
          </Card>
        </div>
      )}

      {/* All skills */}
      {resume_skills.length > 0 && (
        <Card title={`All Detected Skills (${resume_skills.length})`} color={C.indigo}>
          {resume_skills.map(s => <SkillPill key={s} label={s} color={C.indigo}/>)}
        </Card>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Card title="Suggestions" color={C.amber}>
          {suggestions.map((s, i) => (
            <div key={i} style={{ display:'flex', gap:10, marginBottom:10 }}>
              <span style={{ color:C.amber, flexShrink:0 }}>→</span>
              <span style={{ fontSize:13, color:'rgba(255,255,255,0.75)', lineHeight:1.55 }}>{s}</span>
            </div>
          ))}
        </Card>
      )}

      {/* Format issues */}
      {format_issues.length > 0 && (
        <Card title="Format Issues" color={C.red}>
          {format_issues.map((f, i) => (
            <div key={i} style={{ display:'flex', gap:10, marginBottom:8 }}>
              <span style={{ color:C.red, flexShrink:0 }}>!</span>
              <span style={{ fontSize:13, color:'rgba(255,255,255,0.65)' }}>{f}</span>
            </div>
          ))}
        </Card>
      )}

      {/* Stats */}
      <Card>
        <div style={{ display:'flex', gap:28, flexWrap:'wrap' }}>
          {[
            ['Word Count',   word_count],
            ['Skills Found', resume_skills.length],
            ['JD Skills',    jd_skills.length || '—'],
            ['Format Score', `${format_score}%`],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize:22, fontWeight:700, color:'#fff' }}>{val}</div>
              <div style={{ fontSize:11, color:C.muted, textTransform:'uppercase', letterSpacing:'0.07em' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
