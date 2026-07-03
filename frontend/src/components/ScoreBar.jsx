export default function ScoreBar({ label, score = 0, color }) {
  const s = Math.min(Math.max(score, 0), 100)
  const c = color || (s >= 75 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444')
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:13, color:'#344054', fontWeight:700 }}>{label}</span>
        <span style={{ fontSize:13, fontWeight:700, color:c }}>{s}/100</span>
      </div>
      <div style={{ height:6, background:'#e5e7eb', borderRadius:999, overflow:'hidden' }}>
        <div style={{
          height:'100%', width:`${s}%`, background:c,
          borderRadius:3, transition:'width 0.7s ease',
        }}/>
      </div>
    </div>
  )
}
