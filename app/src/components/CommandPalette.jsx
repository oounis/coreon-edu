import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog } from '@headlessui/react'
import { db, classById } from '@core/db.js'
import { NAV } from '@core/nav.js'
import { featureEnabled } from '@core/features.js'
import { Avatar } from './ui.jsx'
import { Search, CornerDownLeft } from 'lucide-react'
import { Ic } from '../icons.jsx'
import { t } from '@core/i18n.js'

const Kbd=({children})=><span className="text-[11px] font-bold text-muted border border-line rounded-md px-1.5 py-0.5 bg-canvas">{children}</span>

// Ctrl+K — jump anywhere, find anyone. One consistent way to move through the product.
export default function CommandPalette({ open, onClose, user }){
  const navigate=useNavigate()
  const [q,setQ]=useState(''); const [idx,setIdx]=useState(0)
  useEffect(()=>{ if(open){ setQ(''); setIdx(0) } },[open])
  useEffect(()=>setIdx(0),[q])
  const d=db()
  const query=q.trim().toLowerCase()

  const items=useMemo(()=>{
    const out=[]
    // Un module éteint (features.js) ne doit pas apparaître ici : le proposer puis
    // rebondir en silence vers l'accueil = « le clic ne marche pas » pour l'utilisateur.
    NAV.filter(n=>n.roles.includes(user.role)&&featureEnabled(n.to)&&(!query||n.label.toLowerCase().includes(query)||t(n.labelFor?.[user.role]||n.label).toLowerCase().includes(query)))
      .slice(0,query?6:9)
      .forEach(n=>out.push({group:t('Pages'),label:t(n.labelFor?.[user.role]||n.label),icon:n.icon,run:()=>navigate(n.to)}))
    const canStudents=['schooladmin','admin','supervisor','teacher'].includes(user.role)
    const canTeachers=['schooladmin','admin'].includes(user.role)
    if(query&&canStudents) d.students.filter(s=>s.name.toLowerCase().includes(query)).slice(0,5)
      .forEach(s=>out.push({group:'Élèves',label:s.name,sub:classById(s.classId)?.name,seed:s.id,run:()=>navigate('/app/students',{state:{openStudent:s.id}})}))
    if(query&&canTeachers) d.teachers.filter(v=>v.name.toLowerCase().includes(query)||(v.subject||'').toLowerCase().includes(query)).slice(0,3)
      .forEach(v=>out.push({group:'Enseignants',label:v.name,sub:v.subject,seed:v.id,run:()=>navigate('/app/teachers',{state:{openTeacher:v.id}})}))
    return out
  },[query,user.role,open]) // eslint-disable-line

  const go=it=>{ onClose(); it.run() }
  const onKey=e=>{
    if(e.key==='ArrowDown'){ e.preventDefault(); setIdx(i=>Math.min(items.length-1,i+1)) }
    else if(e.key==='ArrowUp'){ e.preventDefault(); setIdx(i=>Math.max(0,i-1)) }
    else if(e.key==='Enter'&&items[idx]) go(items[idx])
  }

  let lastGroup=null
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm" aria-hidden="true"/>
      <div className="fixed inset-0 flex items-start justify-center p-4 pt-[10vh]">
        <Dialog.Panel className="card w-full max-w-xl overflow-hidden pop flex flex-col max-h-[70vh]">
          <div className="flex items-center gap-2.5 px-4 border-b border-line shrink-0">
            <Search size={17} className="text-muted"/>
            <input autoFocus value={q} onChange={e=>setQ(e.target.value)} onKeyDown={onKey} aria-label="Recherche globale"
              placeholder={t('Rechercher une page, un élève, un enseignant…')} className="flex-1 py-3.5 text-sm outline-none bg-transparent"/>
            <Kbd>esc</Kbd>
          </div>
          <div className="overflow-y-auto scroll-thin p-2 flex-1">
            {items.length===0 && <div className="px-3 py-10 text-center text-sm text-muted">{t('Aucun résultat pour')} « {q} »</div>}
            {items.map((it,i)=>{ const head=it.group!==lastGroup?it.group:null; lastGroup=it.group
              return (<div key={it.group+it.label}>
                {head&&<div className="text-[11px] font-extrabold uppercase tracking-wide text-muted px-2.5 pt-2 pb-1">{head}</div>}
                <button onMouseEnter={()=>setIdx(i)} onClick={()=>go(it)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition ${i===idx?'accent-soft':''}`}>
                  {it.seed!=null? <Avatar name={it.label} seed={it.seed} size={28}/>
                    : <span className={`w-7 h-7 grid place-items-center rounded-lg bg-canvas ${i===idx?'accent-text':'text-muted'}`}><Ic n={it.icon} size={15}/></span>}
                  <span className="flex-1 min-w-0"><span className="block text-sm font-semibold truncate">{it.label}</span>
                    {it.sub&&<span className="block text-[12px] text-muted truncate">{it.sub}</span>}</span>
                  {i===idx&&<CornerDownLeft size={13} className="text-muted shrink-0"/>}
                </button>
              </div>)})}
          </div>
          <div className="flex items-center gap-3 px-4 py-2.5 border-t border-line text-[12px] text-muted shrink-0">
            <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> naviguer</span>
            <span className="flex items-center gap-1"><Kbd>↵</Kbd> ouvrir</span>
            <span className="flex items-center gap-1 ml-auto"><Kbd>Ctrl</Kbd><Kbd>K</Kbd> {t("depuis n'importe où")}</span>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
