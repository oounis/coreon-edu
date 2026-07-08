import { Dialog } from '@headlessui/react'
import { X, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

const TINTS={brand:['#EEEBFF','#6C5CE7'],sky:['#E4F7FE','#0BA5D8'],butter:['#FFF4DD','#E59A12'],mint:['#E2FBF3','#10B981'],coral:['#FFE8EC','#FF6B81'],grape:['#F1ECFE','#8B5CF6'],slate:['#EEF1F6','#64748B']}
// ── Semantic status colours — the ONLY hexes pages may use for state. ──
export const STATUS={ ok:'#10B981', okSoft:'#E2FBF3', warn:'#E59A12', warnSoft:'#FFF4DD', danger:'#EF4444', dangerSoft:'#FFE8EC', info:'#0BA5D8', infoSoft:'#E4F7FE', neutral:'#8A93A6', neutralSoft:'#EEF1F6', live:'#FF3B5C' }

export function Card({ className='', children }){ return <div className={`card ${className}`}>{children}</div> }
export function StatCard({ label, value, sub, tint='brand', icon, to }){
  const map={brand:['#EEEBFF','#6C5CE7'],sky:['#E4F7FE','#0BA5D8'],butter:['#FFF4DD','#E59A12'],mint:['#E2FBF3','#10B981'],coral:['#FFE8EC','#FF6B81'],grape:['#F1ECFE','#8B5CF6']}
  const [bg,fg]=map[tint]||map.brand
  const inner=<><span className="w-12 h-12 rounded-2xl grid place-items-center shrink-0" style={{background:bg,color:fg}}>{icon}</span>
    <div className="min-w-0"><div className="text-2xl font-extrabold leading-none">{value}</div><div className="text-xs text-muted mt-1 truncate">{label}{sub&&<span className="ml-1">· {sub}</span>}</div></div></>
  if(to) return <Link to={to} className="card p-4 flex items-center gap-3 hover:shadow-lg hover:-translate-y-0.5 transition">{inner}</Link>
  return <div className="card p-4 flex items-center gap-3">{inner}</div>
}
export function Badge({ status }){
  const m={paid:['#E2FBF3','#10B981','Payé'],pending:['#FFF4DD','#E59A12','En attente'],overdue:['#FFE8EC','#EF4444','En retard'],due:['#EEF1F6','#8A93A6','Impayé'],open:['#FFF4DD','#E59A12','Ouvert'],resolved:['#E2FBF3','#10B981','Résolu'],approved:['#E2FBF3','#10B981','Approuvé'],rejected:['#FFE8EC','#EF4444','Rejeté'],present:['#E2FBF3','#10B981','Présent'],absent:['#FFE8EC','#EF4444','Absent'],late:['#FFF4DD','#E59A12','Retard']}
  const [bg,fg,label]=m[status]||['#EEF1F6','#8A93A6',status]
  return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{background:bg,color:fg}}>{label}</span>
}
// ── Initials avatar: THE one avatar style of the product. Deterministic soft
// tint + matching text colour from the person's id/name — no raster images. ──
const AVATAR_TINTS=[['#EEEBFF','#6C5CE7'],['#E4F7FE','#0BA5D8'],['#FFF4DD','#E59A12'],['#E2FBF3','#10B981'],['#FFE8EC','#F43F5E'],['#F1ECFE','#8B5CF6'],['#DFF4F3','#0D9488'],['#E8F0FF','#4F84E0'],['#FDECF3','#DB2777']]
const hashSeed=s=>{let x=0;for(const c of String(s))x=(x*31+c.charCodeAt(0))>>>0;return x}
export const avatarTint=seed=>AVATAR_TINTS[hashSeed(seed)%AVATAR_TINTS.length]
export function Avatar({ name, initials, seed, size=36, ring, className='' }){
  const [bg,fg]=avatarTint(seed||name||'?')
  const i=initials||((name||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase())
  return <span aria-hidden="true" className={`rounded-full grid place-items-center font-bold shrink-0 select-none ${className}`}
    style={{width:size,height:size,fontSize:Math.max(10,Math.round(size*0.36)),background:bg,color:fg,boxShadow:ring?`0 0 0 2px ${ring}`:undefined}}>{i}</span>
}
export function Btn({ children, variant='primary', size='md', className='', ...p }){
  const base="inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition disabled:opacity-50 disabled:pointer-events-none"
  const s=size==='sm'?"text-[13px] px-3 py-2":size==='lg'?"text-sm px-5 py-3":"text-sm px-4 py-2.5"
  const v=variant==='primary'?"text-white accent-bg shadow-sm hover:opacity-90 active:scale-[.98]":variant==='soft'?"accent-soft accent-text hover:brightness-95":variant==='danger'?"bg-white border border-line text-coral hover:bg-coral-soft":variant==='ghost'?"text-muted hover:text-ink hover:bg-canvas":"bg-white border border-line hover:bg-canvas active:scale-[.98]"
  return <button className={`${base} ${s} ${v} ${className}`} {...p}>{children}</button>
}
export function Field({ label, children, hint }){ return <label className="block"><span className="text-xs font-semibold text-muted">{label}</span><div className="mt-1">{children}</div>{hint&&<span className="text-[10px] text-muted">{hint}</span>}</label> }
export function Input(p){ return <input {...p} className={`w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm accent-ring ${p.className||''}`}/> }
export function Textarea(p){ return <textarea {...p} className={`w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm accent-ring ${p.className||''}`}/> }
export function Select(p){ return <select {...p} className={`w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm accent-ring ${p.className||''}`}/> }
export function Section({ title, children, cols=2 }){
  return <div className="mb-4"><div className="text-xs font-bold uppercase tracking-wide accent-text mb-2">{title}</div>
    <div className={`grid gap-3 ${cols===2?'sm:grid-cols-2':cols===3?'sm:grid-cols-3':''}`}>{children}</div></div>
}
export function Modal({ open, onClose, title, children, footer, size='lg' }){
  const w={lg:'max-w-lg',xl:'max-w-2xl','2xl':'max-w-3xl'}[size]
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm" aria-hidden="true"/>
      <div className="fixed inset-0 grid place-items-center p-4">
        <Dialog.Panel className={`card w-full ${w} pop flex flex-col max-h-[90vh]`}>
          <div className="flex items-center justify-between p-5 border-b border-line"><Dialog.Title className="text-lg font-bold">{title}</Dialog.Title><button onClick={onClose} className="text-muted hover:text-ink"><X size={18}/></button></div>
          <div className="p-5 overflow-y-auto scroll-thin">{children}</div>
          {footer&&<div className="p-4 border-t border-line flex justify-end gap-2">{footer}</div>}
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
export function Table({ head, children }){
  return <div className="card overflow-hidden"><div className="overflow-x-auto scroll-thin"><table className="w-full text-sm">
    <thead><tr className="text-left text-[11px] uppercase tracking-wide text-muted bg-canvas">{head.map((h,i)=><th key={i} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
    <tbody className="divide-y divide-line">{children}</tbody></table></div></div>
}
export function PageHead({ title, sub, action }){
  return <div className="flex items-end justify-between gap-3 mb-5 flex-wrap"><div><h1 className="text-2xl font-extrabold">{title}</h1>{sub&&<p className="text-muted mt-0.5">{sub}</p>}</div>{action}</div>
}
// ── Colored rounded icon container (stat cards, list rows, section headers) ──
export function IconTile({ icon, tint='brand', size=44, radius='rounded-2xl', className='' }){
  const [bg,fg]=TINTS[tint]||TINTS.brand
  return <span className={`${radius} grid place-items-center shrink-0 ${className}`} style={{width:size,height:size,background:bg,color:fg}}>{icon}</span>
}
// ── Card with a standard header (icon + title/sub + action) and padded body ──
export function SectionCard({ title, sub, action, icon, tint='brand', children, className='', bodyClass='p-5', headless=false }){
  return <div className={`card overflow-hidden ${className}`}>
    {!headless && (title||action) && <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && <IconTile icon={icon} tint={tint} size={34} radius="rounded-xl"/>}
        <div className="min-w-0"><h3 className="font-bold text-[15px] truncate">{title}</h3>{sub&&<p className="text-xs text-muted truncate">{sub}</p>}</div>
      </div>
      {action}
    </div>}
    {children!=null && <div className={bodyClass}>{children}</div>}
  </div>
}
// ── Consistent empty state with optional CTA ──
export function EmptyState({ icon, title, sub, action, className='' }){
  return <div className={`flex flex-col items-center text-center py-14 px-6 ${className}`}>
    {icon && <div className="w-14 h-14 rounded-2xl grid place-items-center mb-3.5 accent-soft accent-text">{icon}</div>}
    <div className="font-bold text-ink">{title}</div>
    {sub && <p className="text-sm text-muted mt-1 max-w-sm">{sub}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
}
// ── Loading skeletons ──
export function Skeleton({ className='', w, h }){ return <div className={`skeleton ${className}`} style={{width:w,height:h}}/> }
export function SkeletonList({ rows=4 }){ return <div className="space-y-2.5">{Array.from({length:rows}).map((_,i)=><div key={i} className="card p-4 flex items-center gap-3"><Skeleton w={40} h={40} className="rounded-xl"/><div className="flex-1 space-y-2"><Skeleton h={12} className="w-1/3"/><Skeleton h={10} className="w-1/2"/></div></div>)}</div> }
// ── Search input with leading icon ──
export function SearchInput({ value, onChange, placeholder='Rechercher…', className='' }){
  return <div className={`relative ${className}`}>
    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"/>
    <input value={value} onChange={onChange} placeholder={placeholder} aria-label={placeholder}
      className="w-full rounded-xl border border-line bg-white pl-9 pr-3 py-2.5 text-sm accent-ring"/>
  </div>
}
// ── Toolbar row for search + filters + actions ──
export function Toolbar({ children, className='' }){ return <div className={`flex items-center gap-2 flex-wrap mb-4 ${className}`}>{children}</div> }
// ── Segmented tabs ──
export function Tabs({ tabs, value, onChange, className='' }){
  return <div className={`inline-flex items-center gap-1 p-1 rounded-xl bg-canvas border border-line ${className}`} role="tablist">
    {tabs.map(t=>{ const on=t.value===value
      return <button key={t.value} role="tab" aria-selected={on} onClick={()=>onChange(t.value)}
        className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition ${on?'bg-white shadow-sm text-ink':'text-muted hover:text-ink'}`}>{t.label}{t.count!=null&&<span className={`ml-1.5 ${on?'accent-text':'text-muted'}`}>{t.count}</span>}</button>
    })}
  </div>
}
// ── Filter pill ──
export function Chip({ children, active, onClick, className='' }){
  return <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${active?'accent-bg text-white border-transparent':'bg-white border-line text-muted hover:text-ink'} ${className}`}>{children}</button>
}
// ── Avatar + name/meta block, standardized everywhere a person is shown ──
export function UserCard({ name, seed, meta, size=44, action, className='' }){
  return <div className={`flex items-center gap-3 min-w-0 ${className}`}>
    <Avatar name={name} seed={seed} size={size}/>
    <div className="min-w-0 flex-1"><div className="font-bold truncate leading-tight">{name}</div>{meta&&<div className="text-xs text-muted truncate">{meta}</div>}</div>
    {action}
  </div>
}
export function Mark({ size=34 }){
  return (<svg viewBox="0 0 68 72" width={size} height={size} aria-hidden="true">
    <defs><linearGradient id="kmark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6C5CE7"/><stop offset="1" stopColor="#36C5F0"/></linearGradient></defs>
    <path d="M34 62 C31 52 28 47 22 43 C15 38 10 31 7 22 C18 27 28 33 31 41 L34 46 L37 41 C40 33 50 27 61 22 C58 31 53 38 46 43 C40 47 37 52 34 62 Z" fill="url(#kmark)"/>
  </svg>)
}
