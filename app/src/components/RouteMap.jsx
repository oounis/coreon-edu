import { motion } from 'framer-motion'

// meta per stop kind
const KM = {
  entree:  { c:'#64748B', e:'🚪' },
  class:   { c:'#6C5CE7', e:'📚' },
  cour:    { c:'#22C55E', e:'⚽' },
  cantine: { c:'#F59E0B', e:'🍽️' },
}
const trunc = (s,n=12)=> s && s.length>n ? s.slice(0,n-1)+'…' : s

// Animated "school-day route": a metro-style line of stops with the pupil
// travelling along it. curIndex = current stop, done = 0..1 within it.
export default function RouteMap({ stops, curIndex, done=0, remain, name='', live }){
  const n=stops.length, COLS=4
  const rows=Math.ceil(n/COLS), MX=46, MY=46, colGap=(400-2*MX)/(COLS-1), rowGap=80
  const VBH=MY+(rows-1)*rowGap+50
  const pos=i=>{ const row=Math.floor(i/COLS), inRow=i%COLS, col=row%2===0?inRow:(COLS-1-inRow); return {x:MX+col*colGap, y:MY+row*rowGap} }
  const P=stops.map((_,i)=>pos(i))
  const cur=P[curIndex]||P[0]
  const curColor=(KM[stops[curIndex]?.kind]||KM.class).c
  const R=15, CIRC=2*Math.PI*R

  return (
    <div className="relative w-full" style={{background:'radial-gradient(120% 90% at 50% 0%, #F4F3FF 0%, #FFFFFF 60%)'}}>
      <svg viewBox={`0 0 400 ${VBH}`} className="w-full h-auto block">
        <style>{`@keyframes df{to{stroke-dashoffset:-14}} .flow{stroke-dasharray:2 6;animation:df .6s linear infinite}`}</style>
        {/* connectors */}
        {stops.slice(0,-1).map((_,i)=>{ const a=P[i], b=P[i+1]
          const doneSeg=(i+1)<=curIndex, flowing=i===curIndex
          const col=(KM[stops[i].kind]||KM.class).c
          return <line key={'c'+i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={doneSeg?col:flowing?curColor:'#E2E6EE'} strokeWidth="5" strokeLinecap="round"
            className={flowing?'flow':''} strokeDasharray={(!doneSeg&&!flowing)?'2 7':undefined}/>
        })}
        {/* stations */}
        {stops.map((s,i)=>{ const p=P[i], m=KM[s.kind]||KM.class
          const done_=i<curIndex, isCur=i===curIndex
          const fill=done_?m.c:isCur?'#fff':'#EDF0F5'
          return <g key={i}>
            {/* time above */}
            <text x={p.x} y={p.y-R-8} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#94A0B4">{s.time}</text>
            <circle cx={p.x} cy={p.y} r={R} fill={fill} stroke={isCur?m.c:done_?m.c:'#D7DDE7'} strokeWidth={isCur?3:2}/>
            <text x={p.x} y={p.y+5} textAnchor="middle" fontSize="15" opacity={i>curIndex?0.45:1}>{done_?'✓':m.e}</text>
            {isCur && <>
              <motion.circle cx={p.x} cy={p.y} r={R} fill="none" stroke={m.c} strokeWidth="2.5"
                animate={{r:[R,R+9],opacity:[.55,0]}} transition={{repeat:Infinity,duration:1.7,ease:'easeOut'}}/>
              <circle cx={p.x} cy={p.y} r={R} fill="none" stroke={m.c} strokeWidth="3.5"
                strokeDasharray={CIRC} strokeDashoffset={CIRC*(1-done)} strokeLinecap="round"
                transform={`rotate(-90 ${p.x} ${p.y})`} opacity="0.9"/>
            </>}
            {/* label below */}
            <text x={p.x} y={p.y+R+13} textAnchor="middle" fontSize="8.6" fontWeight={isCur?'800':'600'} fill={i>curIndex?'#AEB6C4':'#2B3242'}>{trunc(s.label)}</text>
            {s.sub && i<=curIndex && <text x={p.x} y={p.y+R+22} textAnchor="middle" fontSize="7.2" fill="#9AA4B4">{trunc(s.sub,14)}</text>}
          </g>
        })}
        {/* pupil marker, floats above current stop, glides on change */}
        <motion.g initial={false} animate={{x:cur.x, y:cur.y-R-16}} transition={{type:'spring',stiffness:120,damping:16}}>
          <rect x={-30} y={-15} width="60" height="18" rx="9" fill={curColor}/>
          <path d={`M-5 3 L5 3 L0 8 Z`} fill={curColor}/>
          <text x="0" y="-2.5" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#fff">
            {name}{remain>0?` · ${remain}m`:''}
          </text>
        </motion.g>
      </svg>
    </div>
  )
}
