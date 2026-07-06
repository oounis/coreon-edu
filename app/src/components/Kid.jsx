// Simple flat child avatar (boy / girl) — used in the side profile card.
function kidShapes(gender){
  const girl=gender==='Fille'
  const skin='#F2C9A0', hair=girl?'#4A2E1E':'#3B2A1E', shirt=girl?'#EC6A86':'#5B8DEF', bottom='#33415C'
  return (<>
    <rect x="-6" y="-26" width="5" height="16" rx="2.5" fill={skin}/><rect x="1" y="-26" width="5" height="16" rx="2.5" fill={skin}/>
    <rect x="-7.5" y="-13" width="8" height="5" rx="2.5" fill="#3a3f4d"/><rect x="-0.5" y="-13" width="8" height="5" rx="2.5" fill="#3a3f4d"/>
    {girl ? <path d="M-8 -48 h16 l5 24 h-26 z" fill={shirt}/> : <><rect x="-8" y="-48" width="16" height="16" rx="3" fill={shirt}/><rect x="-7" y="-33" width="14" height="9" rx="2" fill={bottom}/></>}
    <rect x="-13" y="-47" width="4.5" height="15" rx="2.2" fill={girl?shirt:skin}/><rect x="8.5" y="-47" width="4.5" height="15" rx="2.2" fill={girl?shirt:skin}/>
    <ellipse cx="0" cy="-62" rx="12" ry="11" fill={hair}/>
    {girl && <><circle cx="-12" cy="-57" r="4.5" fill={hair}/><circle cx="12" cy="-57" r="4.5" fill={hair}/></>}
    <circle cx="0" cy="-59" r="9.5" fill={skin}/>
    <circle cx="-3.5" cy="-59" r="1.3" fill="#3a2a20"/><circle cx="3.5" cy="-59" r="1.3" fill="#3a2a20"/>
    <path d="M-3.5 -54.5 q3.5 2.6 7 0" stroke="#3a2a20" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
    <circle cx="-7.5" cy="-57" r="1.6" fill="#F7A9A0" opacity=".55"/><circle cx="7.5" cy="-57" r="1.6" fill="#F7A9A0" opacity=".55"/>
  </>)
}
export function Kid({ gender, size=64 }){
  return <svg viewBox="-16 -80 32 84" width={size*32/84} height={size} style={{overflow:'visible',filter:'drop-shadow(0 3px 3px rgba(30,36,51,.18))'}}>{kidShapes(gender)}</svg>
}
