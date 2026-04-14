export default function SkillPill({ label, color = '#6366f1' }) {
  return (
    <span style={{
      display:'inline-block', margin:'3px 4px 3px 0',
      padding:'4px 11px', borderRadius:100,
      fontSize:12, fontWeight:500,
      color, background:`${color}18`,
      border:`1px solid ${color}28`,
    }}>
      {label}
    </span>
  )
}
