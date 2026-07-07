import { useMemo } from 'react'
import { ReactFlow, Background, BackgroundVariant, Handle, Position, BaseEdge, getStraightPath } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Check } from 'lucide-react'

const COLOR = { entree:'#7C8698', class:'#6C5CE7', cour:'#22C55E', cantine:'#F59E0B' }
const rmap = s => `${import.meta.env.BASE_URL}rmap/${s}.png`
// map a stop to one of the isometric facility illustrations
function slugFor(kind, label){
  if(kind==='entree') return label==='Sortie' ? 'sortie' : 'arrivee'
  if(kind==='cour') return 'recre'
  if(kind==='cantine') return 'cantine'
  const l=(label||'').toLowerCase()
  if(l.includes('sport')) return 'sport'
  if(l.includes('musi')) return 'musique'
  if(l.includes('art')) return 'arts'
  if(l.includes('info')) return 'informatique'
  if(l.includes('arabe')) return 'arabe'
  if(l.includes('fran')) return 'francais'
  if(l.includes('angl')) return 'anglais'
  if(l.includes('math')) return 'maths'
  if(l.includes('scien')||l.includes('éveil')||l.includes('eveil')) return 'sciences'
  if(l.includes('islam')) return 'prayer'
  if(l.includes('civi')) return 'civic'
  return 'arabe'
}
const H = { opacity:0, width:1, height:1, minWidth:0, minHeight:0, border:0 }
const HC = { ...H, top:49 } // align L/R handles to the badge centre

// ── a winding cream road segment ──
function RoadEdge({ sourceX, sourceY, targetX, targetY, data }){
  const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY })
  const trav = data?.state // 'done' | 'current' | 'future'
  const center = trav==='done' ? data.color : trav==='current' ? data.color : '#FFFFFF'
  return (
    <g>
      <path d={path} fill="none" stroke="#CBB891" strokeWidth={16} strokeLinecap="round"/>
      <path d={path} fill="none" stroke="#F2E7CC" strokeWidth={11} strokeLinecap="round"/>
      <path d={path} fill="none" stroke={center} strokeWidth={trav==='future'?2.4:3} strokeLinecap="round"
        strokeDasharray={trav==='current'?'9 7':'2 9'} opacity={trav==='future'?.85:.95}>
        {trav==='current' && <animate attributeName="stroke-dashoffset" from="16" to="0" dur="0.7s" repeatCount="indefinite"/>}
      </path>
    </g>
  )
}
const edgeTypes = { road: RoadEdge }

function Tree({ x, y, s=1, k='t' }){
  return <div className="absolute pointer-events-none select-none" style={{left:x,top:y,transform:`scale(${s})`,opacity:.9,zIndex:0}}>
    {k==='t' ? (
      <svg width="46" height="56" viewBox="0 0 46 56"><rect x="20" y="34" width="6" height="18" rx="2" fill="#9A7B4F"/><ellipse cx="23" cy="24" rx="19" ry="20" fill="#63B562"/><ellipse cx="23" cy="18" rx="13" ry="13" fill="#7AC873"/></svg>
    ) : k==='b' ? (
      <svg width="40" height="30" viewBox="0 0 40 30"><ellipse cx="12" cy="20" rx="12" ry="10" fill="#7AC873"/><ellipse cx="26" cy="18" rx="13" ry="11" fill="#63B562"/></svg>
    ) : (
      <svg width="42" height="52" viewBox="0 0 42 52"><rect x="18" y="32" width="6" height="18" rx="2" fill="#9A7B4F"/><path d="M21 2 L38 34 L4 34 Z" fill="#5FAE5C"/><path d="M21 12 L34 34 L8 34 Z" fill="#74C46F"/></svg>
    )}
  </div>
}

function StationNode({ data }){
  const { color, img, label, time, sub, state, name, remain } = data
  const isDone=state==='done', isCur=state==='current', isFut=state==='future'
  const ring = isCur?`0 0 0 3.5px ${color}` : isDone?`0 0 0 3px ${color}` : '0 0 0 2.5px #FFFFFF'
  return (
    <div className="relative flex flex-col items-center" style={{width:118}}>
      <div className="text-[10px] font-extrabold mb-1 px-1.5 rounded-full" style={{color:'#5C6B4E',background:'rgba(255,255,255,.6)'}}>{time}</div>
      <div className="relative grid place-items-center">
        {isCur && <span className="absolute w-16 h-16 rounded-full animate-ping" style={{background:color,opacity:.28}}/>}
        <div className="w-16 h-16 rounded-full overflow-hidden bg-white relative grid place-items-center" style={{boxShadow:`${ring}, 0 6px 14px rgba(30,50,20,.22)`}}>
          <img src={img} alt="" className="w-full h-full object-contain p-1" style={{filter:isFut?'grayscale(.55) opacity(.7)':'none'}}/>
          {isDone && <div className="absolute inset-0 grid place-items-center" style={{background:color+'9E'}}><Check size={22} strokeWidth={3.6} className="text-white"/></div>}
        </div>
        {isCur && <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white rounded-full shadow-lg px-2.5 py-1 flex items-center gap-1.5 z-10" style={{boxShadow:`0 0 0 2px ${color}55, 0 6px 14px rgba(30,50,20,.2)`}}>
          <span className="w-2 h-2 rounded-full" style={{background:color}}/>
          <span className="text-[11px] font-extrabold text-ink">{name}{remain>0?` · ${remain}m`:''}</span>
        </div>}
      </div>
      <div className={`text-[11px] mt-1.5 text-center leading-tight px-1.5 rounded-md ${isCur?'font-extrabold':'font-bold'}`}
        style={{color:isFut?'#6E7C60':'#33402A',background:'rgba(255,255,255,.55)'}}>{label}</div>
      {sub && !isFut && <div className="text-[9px] mt-0.5" style={{color:'#6E7C60'}}>{sub}</div>}
      <Handle id="r" type="source" position={Position.Right} style={HC}/>
      <Handle id="l" type="target" position={Position.Left} style={HC}/>
      <Handle id="l2" type="source" position={Position.Left} style={HC}/>
      <Handle id="r2" type="target" position={Position.Right} style={HC}/>
      <Handle id="b" type="source" position={Position.Bottom} style={H}/>
      <Handle id="t" type="target" position={Position.Top} style={H}/>
    </div>
  )
}
const nodeTypes = { station: StationNode }

export default function RouteMapFlow({ stops, curIndex, done=0, remain, name='' }){
  const COLS=4, COLW=205, ROWH=170
  const curColor=COLOR[stops[curIndex]?.kind]||COLOR.class
  const P = useMemo(()=> stops.map((_,i)=>{ const row=Math.floor(i/COLS), inRow=i%COLS, col=row%2===0?inRow:(COLS-1-inRow); return {x:col*COLW, y:row*ROWH} }),[stops.length])

  const nodes = stops.map((s,i)=>({ id:String(i), type:'station', position:P[i], draggable:false, selectable:false,
    data:{ ...s, color:COLOR[s.kind]||COLOR.class, img:rmap(slugFor(s.kind,s.label)),
      state: i<curIndex?'done':i===curIndex?'current':'future', name, remain, done } }))

  const edges = stops.slice(0,-1).map((_,i)=>{ const a=P[i], b=P[i+1]
    let sh,th; if(a.y===b.y){ if(b.x>a.x){sh='r';th='l'} else {sh='l2';th='r2'} } else { sh='b'; th='t' }
    const state = (i+1)<=curIndex ? 'done' : i===curIndex ? 'current' : 'future'
    const col = state==='current' ? curColor : COLOR[stops[i].kind]||COLOR.class
    return { id:'e'+i, source:String(i), target:String(i+1), sourceHandle:sh, targetHandle:th, type:'road',
      data:{ state, color:col } }
  })

  const rows=Math.ceil(stops.length/COLS)
  return (
    <div className="relative rounded-b-2xl overflow-hidden" style={{height:Math.max(320,rows*ROWH+44),
      background:'radial-gradient(130% 95% at 50% -8%, #EEF8E4, #D3ECC2 52%, #BFE4AC)'}}>
      {/* ambient nature decorations */}
      <Tree x="2%"  y="8"   s={0.9} k="p"/>
      <Tree x="93%" y="20"  s={1.0} k="t"/>
      <Tree x="46%" y="6"   s={0.7} k="b"/>
      <Tree x="1%"  y="55%" s={1.1} k="t"/>
      <Tree x="90%" y="74%" s={0.9} k="p"/>
      <Tree x="62%" y="80%" s={0.75} k="b"/>
      <Tree x="55%" y="90%" s={0.8} k="b"/>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView fitViewOptions={{padding:0.15}}
        nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} nodesFocusable={false} edgesFocusable={false}
        panOnDrag={false} panOnScroll={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false}
        preventScrolling={false} minZoom={0.2} maxZoom={1.4} proOptions={{hideAttribution:true}} style={{background:'transparent'}}>
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.6} color="#A9D492"/>
      </ReactFlow>
    </div>
  )
}
