import { Paperclip, Check, Upload } from 'lucide-react'
export default function Attach({ types, value=[], onChange }){
  const has=t=>value.find(a=>a.type===t)
  const pick=(t)=>(e)=>{ const f=e.target.files?.[0]; if(!f)return; const next=[...value.filter(a=>a.type!==t),{type:t,name:f.name}]; onChange(next) }
  return (
    <div className="space-y-1.5">
      {types.map(t=>{ const a=has(t); return (
        <div key={t} className="flex items-center justify-between border border-line rounded-xl px-3 py-2 text-sm">
          <span className="flex items-center gap-2">{a?<Check size={15} className="text-mint"/>:<Paperclip size={15} className="text-muted"/>} {t}</span>
          <label className="cursor-pointer text-xs font-semibold accent-text inline-flex items-center gap-1">
            <Upload size={13}/> {a? a.name : 'Joindre'}
            <input type="file" className="hidden" onChange={pick(t)}/>
          </label>
        </div>) })}
    </div>
  )
}
