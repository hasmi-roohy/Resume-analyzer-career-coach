export default function SkillPill({ label, color = '#6366f1' }) {
  const palette = {
    'var(--blue)': ['#1d4ed8', '#dbeafe', '#bfdbfe'],
    'var(--green)': ['#047857', '#d1fae5', '#a7f3d0'],
    'var(--amber)': ['#b45309', '#fef3c7', '#fde68a'],
    'var(--red)': ['#b91c1c', '#fee2e2', '#fecaca'],
  }
  const [fg, bg, border] = palette[color] || [color, `${color}18`, `${color}28`]
  return (
    <span style={{
      display:'inline-block', margin:'3px 4px 3px 0',
      padding:'4px 11px', borderRadius:100,
      fontSize:12, fontWeight:700,
      color: fg, background:bg,
      border:`1px solid ${border}`,
    }}>
      {label}
    </span>
  )
}
