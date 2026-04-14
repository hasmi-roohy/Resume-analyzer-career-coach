export default function ScoreRing({ score = 0, size = 100, label = '', color }) {
  const s    = Math.min(Math.max(score, 0), 100)
  const r    = (size / 2) - 8
  const circ = 2 * Math.PI * r
  const dash = (s / 100) * circ
  const c    = color || (s >= 75 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444')

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={7}/>
        <circle cx={size/2} cy={size/2} r={r}
          fill="none" stroke={c} strokeWidth={7}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition:'stroke-dasharray 0.6s ease' }}/>
        <text x={size/2} y={size/2}
          textAnchor="middle" dominantBaseline="central"
          fontSize={size * 0.22} fontWeight={700} fill="#fff">
          {s}
        </text>
      </svg>
      {label && (
        <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)',
                       textTransform:'uppercase', letterSpacing:'0.07em' }}>
          {label}
        </span>
      )}
    </div>
  )
}
