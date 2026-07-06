// Fully hand-drawn SVG school rooms with the child drawn IN the same flat style,
// so the pupil is really part of the scene (no pasted photo + floating avatar).
// viewBox 400x230 (≈16:9). One consistent cartoon style across all rooms.

// ---- the child, drawn as a reusable group (feet at origin 0,0) ----
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
export function KidG({ gender, x, y, s=1 }){
  return <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="0" cy="1" rx="14" ry="3.4" fill="#1e243322"/>
    {kidShapes(gender)}
  </g>
}
// standalone avatar (used in cards / lists)
export function Kid({ gender, size=64 }){
  return <svg viewBox="-16 -80 32 84" width={size*32/84} height={size} style={{overflow:'visible',filter:'drop-shadow(0 3px 3px rgba(30,36,51,.18))'}}>{kidShapes(gender)}</svg>
}

// ---- reusable furniture ----
const Desk=({x,y,s=1,c='#C68B57'})=>(<g transform={`translate(${x} ${y}) scale(${s})`}>
  <ellipse cx="0" cy="2" rx="24" ry="4" fill="#1e243318"/>
  <rect x="-18" y="-10" width="4" height="12" rx="1.5" fill={c}/><rect x="14" y="-10" width="4" height="12" rx="1.5" fill={c}/>
  <path d="M-22 -14 L20 -14 L22 -9 L-20 -9 Z" fill="#EAD9B8"/><rect x="-22" y="-14" width="44" height="2.4" fill="#d8c19a"/>
  <rect x="-14" y="-17.5" width="12" height="8" rx="1" fill="#F4A6A0"/><rect x="2" y="-16.5" width="9" height="6.5" rx="1" fill="#8FC1E6"/>
</g>)
const Plant=({x,y,s=1})=>(<g transform={`translate(${x} ${y}) scale(${s})`}>
  <ellipse cx="0" cy="1" rx="12" ry="3" fill="#1e243318"/>
  <path d="M-9 0 L9 0 L7 -14 L-7 -14 Z" fill="#D98A5A"/><rect x="-8" y="-16" width="16" height="3" rx="1.5" fill="#C2743F"/>
  <ellipse cx="0" cy="-24" rx="7" ry="12" fill="#5FA36A"/><ellipse cx="-8" cy="-20" rx="6" ry="10" fill="#6FB47A"/><ellipse cx="8" cy="-20" rx="6" ry="10" fill="#569560"/>
</g>)
const Window=({x,y,w=66,h=62})=>(<g><rect x={x-3} y={y-3} width={w+6} height={h+6} rx="5" fill="#9DBBD0"/>
  <rect x={x} y={y} width={w} height={h} rx="3" fill="url(#sky)"/>
  <circle cx={x+w-14} cy={y+15} r="9" fill="#FFD86B"/>
  <line x1={x+w/2} y1={y} x2={x+w/2} y2={y+h} stroke="#9DBBD0" strokeWidth="3"/><line x1={x} y1={y+h/2} x2={x+w} y2={y+h/2} stroke="#9DBBD0" strokeWidth="3"/>
  <rect x={x-5} y={y+h} width={w+10} height="5" rx="2" fill="#C7D2DD"/></g>)

const DEFS=(<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#BFE6FF"/><stop offset="1" stopColor="#E9F7FF"/></linearGradient>
  <linearGradient id="wallM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#DEEFE9"/><stop offset="1" stopColor="#CDE7DD"/></linearGradient>
  <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E6C193"/><stop offset="1" stopColor="#D3A971"/></linearGradient>
  <linearGradient id="skyBig" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8FD0F5"/><stop offset="1" stopColor="#CFEFFB"/></linearGradient>
  <linearGradient id="wallP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F6E7D4"/><stop offset="1" stopColor="#EFD8BE"/></linearGradient>
  <linearGradient id="wallInf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E9F1FB"/><stop offset="1" stopColor="#DCEAF6"/></linearGradient>
</defs>)

function Classroom({gender}){return(<>
  <rect width="400" height="170" fill="url(#wallM)"/>
  <rect width="400" height="22" fill="#E8F3EE"/><rect x="92" y="7" width="58" height="7" rx="3.5" fill="#FFF7DC"/><rect x="250" y="7" width="58" height="7" rx="3.5" fill="#FFF7DC"/>
  <rect y="150" width="400" height="20" fill="#A9D2C6"/>
  <rect y="170" width="400" height="60" fill="url(#wood)"/>
  {[60,140,220,300,380].map(x=><line key={x} x1={x} y1="170" x2={x} y2="230" stroke="#c49a63" strokeWidth="1.5"/>)}
  {/* chalkboard */}
  <rect x="120" y="34" width="150" height="78" rx="6" fill="#7A5230"/><rect x="127" y="41" width="136" height="64" rx="3" fill="#3E6E5A"/>
  <text x="150" y="70" fill="#EAF6EF" fontSize="15" fontFamily="Comic Sans MS, sans-serif">8 + 5 = 13</text>
  <path d="M150 84 q10 -9 20 0" stroke="#EAF6EF" strokeWidth="2" fill="none"/><circle cx="228" cy="66" r="9" fill="none" stroke="#FFE08A" strokeWidth="2"/><g stroke="#FFE08A" strokeWidth="2">{[0,45,90,135,180,225,270,315].map(a=><line key={a} x1={228+Math.cos(a*Math.PI/180)*12} y1={66+Math.sin(a*Math.PI/180)*12} x2={228+Math.cos(a*Math.PI/180)*15} y2={66+Math.sin(a*Math.PI/180)*15}/>)}</g>
  <rect x="127" y="103" width="136" height="4" rx="2" fill="#6E4A2C"/>
  <Window x={312} y={40}/>
  <circle cx="58" cy="52" r="13" fill="#fff" stroke="#C7D2DD" strokeWidth="2"/><line x1="58" y1="52" x2="58" y2="45" stroke="#334" strokeWidth="1.6"/><line x1="58" y1="52" x2="63" y2="54" stroke="#334" strokeWidth="1.6"/>
  <rect x="30" y="74" width="34" height="26" rx="3" fill="#F5C36B"/><text x="34" y="92" fontSize="11" fill="#8a5a17" fontFamily="Comic Sans MS">Abc</text>
  <Plant x={30} y={170} s={1}/>
  {/* back desks */}
  <Desk x={150} y={158} s={0.8}/><Desk x={250} y={158} s={0.8}/>
  {/* the pupil, standing in the aisle */}
  <KidG gender={gender} x={200} y={210} s={1.45}/>
  {/* foreground desks flanking */}
  <Desk x={70} y={214} s={1.15}/><Desk x={330} y={214} s={1.15}/>
</>)}

function Playground({gender}){return(<>
  <rect width="400" height="150" fill="url(#skyBig)"/>
  <circle cx="60" cy="42" r="20" fill="#FFDE7A"/><g stroke="#FFDE7A" strokeWidth="3" strokeLinecap="round">{[0,45,90,135,180,225,270,315].map(a=><line key={a} x1={60+Math.cos(a*Math.PI/180)*26} y1={42+Math.sin(a*Math.PI/180)*26} x2={60+Math.cos(a*Math.PI/180)*33} y2={42+Math.sin(a*Math.PI/180)*33}/>)}</g>
  <ellipse cx="300" cy="40" rx="34" ry="16" fill="#fff"/><ellipse cx="325" cy="46" rx="26" ry="13" fill="#fff"/><ellipse cx="150" cy="28" rx="24" ry="11" fill="#ffffffcc"/>
  <rect y="150" width="400" height="80" fill="#8FCB5A"/><path d="M0 150 Q200 138 400 150 L400 160 L0 160 Z" fill="#7FBE4C"/>
  {/* tree */}
  <g transform="translate(58 150)"><rect x="-6" y="-46" width="12" height="46" rx="3" fill="#8A5A34"/><circle cx="0" cy="-56" r="30" fill="#5FA36A"/><circle cx="-22" cy="-44" r="20" fill="#6FB47A"/><circle cx="22" cy="-44" r="20" fill="#569560"/></g>
  {/* slide */}
  <g transform="translate(300 150)"><rect x="18" y="-60" width="8" height="60" fill="#B9772F"/><path d="M22 -60 L-26 -6 L-14 2 L34 -52 Z" fill="#EF6B6B"/><rect x="10" y="-66" width="24" height="8" rx="3" fill="#3FA79C"/><line x1="-2" y1="-30" x2="26" y2="-30" stroke="#f7c948" strokeWidth="3"/></g>
  {/* hopscotch */}
  <g stroke="#ffffffcc" strokeWidth="2" fill="none">{[[140,196],[140,178],[126,196],[154,196]].map(([x,y],i)=><rect key={i} x={x-13} y={y-8} width="26" height="16"/>)}</g>
  {/* ball */}
  <circle cx="250" cy="206" r="11" fill="#fff" stroke="#e5e9f0"/><path d="M241 206 h18 M250 197 v18" stroke="#5B8DEF" strokeWidth="2"/>
  <KidG gender={gender} x={185} y={210} s={1.5}/>
</>)}

function Cantine({gender}){return(<>
  <rect width="400" height="170" fill="#F3E4D8"/><rect width="400" height="22" fill="#F8EFE6"/>
  <rect y="150" width="400" height="20" fill="#E0C3AC"/>
  <rect y="170" width="400" height="60" fill="url(#wood)"/>
  <Window x={40} y={44}/><Window x={300} y={44}/>
  {/* long table + benches */}
  <g transform="translate(200 196)"><ellipse cx="0" cy="18" rx="150" ry="12" fill="#1e243315"/>
    <rect x="-140" y="-2" width="280" height="12" rx="3" fill="#C68B57"/><rect x="-140" y="-16" width="280" height="16" rx="4" fill="#EAD9B8"/>
    <rect x="-150" y="16" width="300" height="9" rx="3" fill="#B9772F"/>
    {/* trays */}
    <ellipse cx="-70" cy="-9" rx="18" ry="6" fill="#fff"/><circle cx="-70" cy="-10" r="6" fill="#F4A6A0"/>
    <ellipse cx="70" cy="-9" rx="18" ry="6" fill="#fff"/><circle cx="70" cy="-10" r="6" fill="#8FC98A"/>
    <rect x="8" y="-20" width="7" height="12" rx="2" fill="#F5C36B"/>
  </g>
  <Plant x={362} y={170}/>
  <KidG gender={gender} x={150} y={192} s={1.3}/>
</>)}

function Entree({gender}){return(<>
  <rect width="400" height="170" fill="url(#wallP)"/><rect width="400" height="22" fill="#F8EFE6"/>
  {/* checkered floor */}
  <rect y="170" width="400" height="60" fill="#EFE3D3"/>
  {Array.from({length:14}).map((_,i)=>Array.from({length:3}).map((__,j)=>((i+j)%2)?<rect key={i+'-'+j} x={i*30} y={170+j*20} width="30" height="20" fill="#DcCcb5"/>:null))}
  {/* door with arch sign */}
  <g transform="translate(200 0)"><rect x="-42" y="60" width="84" height="110" rx="4" fill="#B9772F"/><rect x="-36" y="66" width="34" height="104" rx="3" fill="#9C6428"/><rect x="2" y="66" width="34" height="104" rx="3" fill="#9C6428"/><circle cx="-6" cy="120" r="2.5" fill="#f7c948"/><circle cx="6" cy="120" r="2.5" fill="#f7c948"/>
    <path d="M-52 60 A52 34 0 0 1 52 60 Z" fill="#6C5CE7"/><text x="0" y="46" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="bold" fontFamily="Comic Sans MS, sans-serif">ÉCOLE</text></g>
  {/* welcome mat */}
  <ellipse cx="200" cy="210" rx="46" ry="10" fill="#59A83C" opacity=".55"/>
  {/* bench + coat hooks left */}
  <g transform="translate(64 176)"><rect x="-30" y="-6" width="60" height="8" rx="3" fill="#C68B57"/><rect x="-26" y="2" width="6" height="14" fill="#9C6428"/><rect x="20" y="2" width="6" height="14" fill="#9C6428"/></g>
  <g transform="translate(64 70)"><rect x="-34" y="0" width="68" height="8" rx="3" fill="#8A93A6"/>{[-22,0,22].map(x=><circle key={x} cx={x} cy="14" r="3" fill="#6C5CE7"/>)}</g>
  <Plant x={344} y={170}/>
  <KidG gender={gender} x={200} y={208} s={1.4}/>
</>)}

function Infirmerie({gender}){return(<>
  <rect width="400" height="170" fill="url(#wallInf)"/><rect width="400" height="22" fill="#F1F6FC"/>
  <rect y="150" width="400" height="20" fill="#C7D8EA"/><rect y="170" width="400" height="60" fill="#EAE2D6"/>
  {/* red cross sign */}
  <g transform="translate(70 60)"><rect x="-20" y="-20" width="40" height="40" rx="6" fill="#fff" stroke="#E7EDF5" strokeWidth="2"/><rect x="-5" y="-15" width="10" height="30" rx="2" fill="#FF5A5F"/><rect x="-15" y="-5" width="30" height="10" rx="2" fill="#FF5A5F"/></g>
  <Window x={300} y={44}/>
  {/* bed */}
  <g transform="translate(150 200)"><ellipse cx="0" cy="20" rx="115" ry="12" fill="#1e243315"/>
    <rect x="-100" y="-2" width="200" height="24" rx="5" fill="#9FB6CE"/><rect x="-100" y="-14" width="200" height="14" rx="6" fill="#EEF3F8"/>
    <rect x="-100" y="-46" width="10" height="46" rx="3" fill="#8399B2"/><rect x="90" y="-40" width="10" height="40" rx="3" fill="#8399B2"/>
    <rect x="-92" y="-26" width="50" height="14" rx="6" fill="#fff"/>
    <path d="M-40 -14 h100 v14 h-100 z" fill="#F4A6A0"/><path d="M-40 -14 h100 v6 h-100 z" fill="#F7C0BC"/>
  </g>
  {/* cabinet */}
  <g transform="translate(348 120)"><rect x="-16" y="0" width="32" height="50" rx="3" fill="#Dfe8f2"/><line x1="-16" y1="25" x2="16" y2="25" stroke="#c2cfdd"/><rect x="-8" y="6" width="16" height="6" rx="2" fill="#FF5A5F"/></g>
  <KidG gender={gender} x={250} y={206} s={1.35}/>
</>)}

const SCENES={ class:Classroom, cour:Playground, cantine:Cantine, entree:Entree, infirmerie:Infirmerie }
export default function RoomArt({ place, gender, className='w-full h-full block' }){
  const S=SCENES[place]||Classroom
  return <svg viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice" className={className}>{DEFS}<S gender={gender}/></svg>
}
