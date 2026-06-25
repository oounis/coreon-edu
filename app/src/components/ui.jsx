import { Dialog } from '@headlessui/react'
import { X } from 'lucide-react'

export function Card({ className='', children }){ return <div className={`card ${className}`}>{children}</div> }

export function StatCard({ label, value, sub, tint='brand', icon }){
  const map={ brand:['#EEEBFF','#6C5CE7'], sky:['#E4F7FE','#0BA5D8'], butter:['#FFF4DD','#E59A12'],
    mint:['#E2FBF3','#10B981'], coral:['#FFE8EC','#FF6B81'], grape:['#F1ECFE','#8B5CF6'] }
  const [bg,fg]=map[tint]||map.brand
  return (
    <div className="card p-4 flex items-center gap-3">
      <span className="w-12 h-12 rounded-2xl grid place-items-center shrink-0" style={{background:bg,color:fg}}>{icon}</span>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold leading-none">{value}</div>
        <div className="text-xs text-muted mt-1 truncate">{label}{sub&&<span className="ml-1">· {sub}</span>}</div>
      </div>
    </div>
  )
}

export function Badge({ status }){
  const m={ paid:['#E2FBF3','#10B981','Paid'], pending:['#FFF4DD','#E59A12','Pending'], overdue:['#FFE8EC','#EF4444','Overdue'],
    due:['#EEF1F6','#8A93A6','Unpaid'], open:['#FFF4DD','#E59A12','Open'], resolved:['#E2FBF3','#10B981','Resolved'],
    approved:['#E2FBF3','#10B981','Approved'], rejected:['#FFE8EC','#EF4444','Rejected'] }
  const [bg,fg,label]=m[status]||['#EEF1F6','#8A93A6',status]
  return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{background:bg,color:fg}}>{label}</span>
}

export function Avatar({ name, initials, color='#94A3B8', size=36 }){
  const i = initials || (name? name.split(' ').map(w=>w[0]).slice(0,2).join('') : '?')
  return <span className="rounded-full grid place-items-center text-white font-bold shrink-0"
    style={{width:size,height:size,fontSize:size*0.36,background:color}}>{i}</span>
}

export function Btn({ children, variant='primary', className='', ...p }){
  const base="inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold text-sm px-4 py-2.5 transition disabled:opacity-50"
  const v = variant==='primary' ? "text-white accent-bg hover:opacity-90"
        : variant==='soft' ? "accent-soft accent-text"
        : "bg-white border border-line hover:bg-canvas"
  return <button className={`${base} ${v} ${className}`} {...p}>{children}</button>
}

export function Field({ label, children }){
  return <label className="block"><span className="text-xs font-semibold text-muted">{label}</span><div className="mt-1">{children}</div></label>
}
export function Input(p){ return <input {...p} className={`w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm accent-ring ${p.className||''}`}/> }
export function Select(p){ return <select {...p} className={`w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm accent-ring ${p.className||''}`}/> }

export function Modal({ open, onClose, title, children, footer }){
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm" aria-hidden="true"/>
      <div className="fixed inset-0 grid place-items-center p-4">
        <Dialog.Panel className="card w-full max-w-lg p-6 pop">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-bold">{title}</Dialog.Title>
            <button onClick={onClose} className="text-muted hover:text-ink"><X size={18}/></button>
          </div>
          {children}
          {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

export function Table({ head, children }){
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-wide text-muted bg-canvas">
            {head.map((h,i)=><th key={i} className="px-4 py-3 font-semibold">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-line">{children}</tbody>
        </table>
      </div>
    </div>
  )
}
export function PageHead({ title, sub, action }){
  return <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
    <div><h1 className="text-2xl font-extrabold">{title}</h1>{sub&&<p className="text-muted mt-0.5">{sub}</p>}</div>
    {action}
  </div>
}
