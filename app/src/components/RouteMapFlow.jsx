import { useMemo } from 'react'
import { ReactFlow, Background, BackgroundVariant, Handle, Position, getStraightPath } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Check } from 'lucide-react'
import { Avatar } from './ui.jsx'
import { subjectMeta, PLACES } from '../subjects.jsx'

const COLOR = { entree:'#7C8698', class:'#6C5CE7', cour:'#22C55E', cantine:'#F59E0B' }
// each stop renders as an icon badge from the shared subject/place icon system
function metaFor(kind, label){
  if(kind==='entree') return PLACES[label==='Sortie'?'sortie':'arrivee']
  if(kind==='cour')    return PLACES.recre
  if(kind==='cantine') return PLACES.cantine
  if(label==='Étude')  return PLACES.etude
  return subjectMeta(label)
}
const H = { opacity:0, width:1, height:1, minWidth:0, minHeight:0, border:0 }
const HC = { ...H, top:54 } // align L/R handles to the badge centre

// ── a clean path segment ──
function RoadEdge({ sourceX, sourceY, targetX, targetY, data }){
  const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY })
  const s = data?.state // 'done' | 'current' | 'future'
  const center = s==='future' ? '#C7D0DE' : data.color
  return (
    <g>
      <path d={path} fill="none" stroke="#EAEDF3" strokeWidth={11} strokeLinecap="round"/>
      <path d={path} fill="none" stroke={center} strokeWidth={s==='future'?2.4:3.4} strokeLinecap="round"
        strokeDasharray={s==='current'?'9 7':s==='future'?'2 9':undefined} opacity={s==='future'?.9:.95}>
        {s==='current' && <animate attributeName="stroke-dashoffset" from="16" to="0" dur="0.7s" repeatCount="indefinite"/>}
      </path>
    </g>
  )
}
const edgeTypes = { road: RoadEdge }

function StationNode({ data }){
  const { color, Icon, iconColor, label, time, sub, state, name, seed } = data
  const isDone=state==='done', isCur=state==='current', isFut=state==='future'
  const ring = isCur?`0 0 0 3.5px ${color}` : isDone?`0 0 0 3px ${color}` : '0 0 0 2px #E4E8F0'
  return (
    <div className="relative flex flex-col items-center" style={{width:132}}>
      <div className="text-[10px] font-extrabold mb-1" style={{color:'#AAB3C2',opacity:isCur?0:1}}>{time}</div>
      <div className="relative grid place-items-center">
        {isCur && <span className="absolute w-20 h-20 rounded-full animate-ping" style={{background:color,opacity:.25}}/>}
        {/* the pupil, marked at her current stop */}
        {isCur && name && (
          <div className="absolute z-30 pointer-events-none" style={{left:'64px', bottom:'2px'}}>
            <Avatar name={name} seed={seed} size={34} ring="#fff" className="shadow-lg"/>
          </div>
        )}
        <div className="w-20 h-20 rounded-full bg-white relative grid place-items-center" style={{boxShadow:`${ring}, 0 6px 15px rgba(30,36,51,.16)`}}>
          <span className="w-14 h-14 rounded-full grid place-items-center" style={{background:isFut?'#EEF1F6':iconColor+'16'}}>
            <Icon size={26} strokeWidth={2.2} style={{color:isFut?'#B2BAC8':iconColor}}/>
          </span>
          {isDone && <div className="absolute inset-0 rounded-full grid place-items-center" style={{background:color+'9E'}}><Check size={28} strokeWidth={3.6} className="text-white"/></div>}
        </div>
      </div>
      <div className={`text-[11px] mt-1.5 text-center leading-tight ${isCur?'font-extrabold':'font-semibold'}`}
        style={{color:isFut?'#B2BAC8':'#333B4C'}}>{label}</div>
      {sub && !isFut && <div className="text-[9px]" style={{color:'#A6AFBE'}}>{sub}</div>}
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

export default function RouteMapFlow({ stops, curIndex, done=0, remain, name='', seed }){
  const COLS=4, COLW=214, ROWH=182
  const curColor=COLOR[stops[curIndex]?.kind]||COLOR.class
  const P = useMemo(()=> stops.map((_,i)=>{ const row=Math.floor(i/COLS), inRow=i%COLS, col=row%2===0?inRow:(COLS-1-inRow); return {x:col*COLW, y:row*ROWH} }),[stops.length])

  const nodes = stops.map((s,i)=>{ const m=metaFor(s.kind,s.label); return { id:String(i), type:'station', position:P[i], draggable:false, selectable:false,
    data:{ ...s, color:COLOR[s.kind]||COLOR.class, Icon:m.Icon, iconColor:m.color,
      state: i<curIndex?'done':i===curIndex?'current':'future', name, seed } } })

  const edges = stops.slice(0,-1).map((_,i)=>{ const a=P[i], b=P[i+1]
    let sh,th; if(a.y===b.y){ if(b.x>a.x){sh='r';th='l'} else {sh='l2';th='r2'} } else { sh='b'; th='t' }
    const state = (i+1)<=curIndex ? 'done' : i===curIndex ? 'current' : 'future'
    const col = state==='current' ? curColor : COLOR[stops[i].kind]||COLOR.class
    return { id:'e'+i, source:String(i), target:String(i+1), sourceHandle:sh, targetHandle:th, type:'road',
      data:{ state, color:col } }
  })

  const rows=Math.ceil(stops.length/COLS)
  return (
    <div className="relative rounded-b-2xl overflow-hidden" style={{height:Math.max(320,rows*ROWH+40),
      background:'radial-gradient(130% 95% at 50% -10%, #FAFBFE, #F1F4F9 60%, #ECEFF5)'}}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView fitViewOptions={{padding:0.15}}
        nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} nodesFocusable={false} edgesFocusable={false}
        panOnDrag={false} panOnScroll={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false}
        preventScrolling={false} minZoom={0.2} maxZoom={1.4} proOptions={{hideAttribution:true}} style={{background:'transparent'}}>
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.3} color="#E5E9F1"/>
      </ReactFlow>
    </div>
  )
}
