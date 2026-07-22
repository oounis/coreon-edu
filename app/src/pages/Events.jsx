import { useState, useMemo } from 'react'
import { current } from '@core/auth.js'
import { db, mutate, uid } from '@core/db.js'
import { notify } from '@core/notify.js'
import { PageHead, Card, Btn, Modal, Field, Input, Select, Textarea, EmptyState, STATUS } from '../components/ui.jsx'
import { CalendarDays, Plus, ChevronLeft, ChevronRight, Clock, Users, Trash2, MapPin } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, subMonths, isSameMonth, isToday, parseISO
} from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

const TYPES=[
  {k:'Événement',c:'#7539E4'}, {k:'Réunion',c:STATUS.info}, {k:'Examen',c:STATUS.danger},
  {k:'Vacances',c:STATUS.ok}, {k:'Sortie',c:STATUS.warn},
]
const tint=t=>(TYPES.find(x=>x.k===t)||TYPES[0]).c
const AUD={all:'Toute l’école',parent:'Parents',teacher:'Enseignants',supervisor:'Surveillants'}
const emptyForm=d=>({date:d||'',time:'',title:'',type:'Événement',desc:'',place:'',audience:'all'})

export default function Events(){
  const u=current()
  const canAdd=['owner','schooladmin','admin','teacher','supervisor'].includes(u.role)
  // Un enseignant ou un surveillant pouvait supprimer, en un clic et sans confirmation,
  // les événements officiels de la Direction (dates d'examens, réunion de parents).
  // On ne supprime que ses propres événements ; la Direction peut tout supprimer.
  const isDirection=['owner','schooladmin','admin'].includes(u.role)
  const canDelete=e=> isDirection || e.by===u.name
  const [,force]=useState(0); const bump=()=>force(x=>x+1)
  const [confirmDel,setConfirmDel]=useState(null)
  const [cursor,setCursor]=useState(startOfMonth(new Date()))
  const [sel,setSel]=useState(format(new Date(),'yyyy-MM-dd'))
  const [open,setOpen]=useState(false); const [f,setF]=useState(emptyForm())

  const events=db().events
  const byDay=useMemo(()=>{const m={};events.forEach(e=>{(m[e.date]=m[e.date]||[]).push(e)});return m},[events])
  const days=useMemo(()=>eachDayOfInterval({
    start:startOfWeek(startOfMonth(cursor),{weekStartsOn:1}),
    end:endOfWeek(endOfMonth(cursor),{weekStartsOn:1}),
  }),[cursor])

  const openCreate=(dateStr)=>{ setF(emptyForm(dateStr||sel)); setOpen(true) }
  const add=()=>{
    if(!f.title.trim()||!f.date){ toast.error('Titre et date requis'); return }
    const ev={id:uid('e'),date:f.date,time:f.time,title:f.title.trim(),type:f.type,desc:f.desc.trim(),place:f.place.trim(),audience:f.audience,by:u.name}
    mutate(d=>{ d.events.push(ev) })
    const roles = f.audience==='all' ? ['parent','teacher','supervisor'] : [f.audience]
    roles.forEach(r=>notify({role:r,kind:'notice',actor:u.name,title:'Nouvel événement · '+f.title.trim(),body:`${format(parseISO(f.date),'d MMM',{locale:fr})}${f.time?' à '+f.time:''}`,link:'/app/events'}))
    toast.success('Événement ajouté au calendrier'); setOpen(false); setSel(f.date); setCursor(startOfMonth(parseISO(f.date))); bump()
  }
  const del=(ev)=>{
    if(!canDelete(ev)) return toast.error("Vous ne pouvez supprimer que vos propres événements")
    mutate(d=>{ d.events=d.events.filter(e=>e.id!==ev.id) })
    toast.success('Événement supprimé'); setConfirmDel(null); bump() }

  const selList=(byDay[sel]||[]).slice().sort((a,b)=>(a.time||'').localeCompare(b.time||''))
  const upcoming=events.filter(e=>e.date>=format(new Date(),'yyyy-MM-dd')).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5)

  return (<>
    <PageHead title="Calendrier & événements" sub="Réunions, examens, sorties et vacances : au même endroit."
      action={canAdd&&<Btn onClick={()=>openCreate(sel)}><Plus size={16}/> Nouvel événement</Btn>}/>

    <div className="grid lg:grid-cols-[1fr_320px] gap-5">
      {/* Calendar */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-extrabold capitalize">{format(cursor,'MMMM yyyy',{locale:fr})}</div>
          <div className="flex items-center gap-1">
            <button onClick={()=>setCursor(subMonths(cursor,1))} className="w-9 h-9 grid place-items-center rounded-lg hover:bg-canvas"><ChevronLeft size={18}/></button>
            <button onClick={()=>{setCursor(startOfMonth(new Date()));setSel(format(new Date(),'yyyy-MM-dd'))}} className="px-3 h-9 rounded-lg text-sm font-semibold hover:bg-canvas">Aujourd’hui</button>
            <button onClick={()=>setCursor(addMonths(cursor,1))} className="w-9 h-9 grid place-items-center rounded-lg hover:bg-canvas"><ChevronRight size={18}/></button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center text-[12px] font-semibold text-muted mb-1">
          {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d=><div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(day=>{
            const ds=format(day,'yyyy-MM-dd'); const evs=byDay[ds]||[]
            const out=!isSameMonth(day,cursor); const active=ds===sel
            return (
              <button key={ds} onClick={()=>setSel(ds)} onDoubleClick={()=>canAdd&&openCreate(ds)}
                className={`min-h-[76px] rounded-xl border p-1.5 text-left transition relative ${active?'border-transparent':'border-line hover:bg-canvas'} ${out?'opacity-40':''}`}
                style={active?{boxShadow:'inset 0 0 0 2px var(--accent)',background:'var(--accent-soft)'}:{}}>
                <div className={`text-xs font-bold w-6 h-6 grid place-items-center rounded-full ${isToday(day)?'text-white':''}`} style={isToday(day)?{background:'var(--accent)'}:{}}>{format(day,'d')}</div>
                <div className="mt-1 space-y-0.5">
                  {evs.slice(0,3).map(e=>(
                    <div key={e.id} className="text-[11px] font-semibold truncate px-1 py-0.5 rounded" style={{background:tint(e.type)+'22',color:tint(e.type)}}>{e.time?e.time+' ':''}{e.title}</div>
                  ))}
                  {evs.length>3&&<div className="text-[11px] text-muted px-1">+{evs.length-3}</div>}
                </div>
              </button>
            )
          })}
        </div>
        {canAdd&&<div className="text-[12px] text-muted mt-3">Astuce : double-cliquez sur un jour pour y ajouter un événement.</div>}
      </Card>

      {/* Side: selected day + upcoming */}
      <div className="space-y-5">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold capitalize">{format(parseISO(sel),'EEEE d MMMM',{locale:fr})}</div>
            {canAdd&&<button onClick={()=>openCreate(sel)} className="w-8 h-8 grid place-items-center rounded-lg accent-soft accent-text"><Plus size={16}/></button>}
          </div>
          {selList.length? <div className="space-y-2">
            {selList.map(e=>(
              <div key={e.id} className="rounded-xl border border-line p-3 group">
                <div className="flex items-start gap-2">
                  <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{background:tint(e.type)}}/>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{e.title}</div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-muted mt-0.5">
                      {e.time&&<span className="flex items-center gap-1"><Clock size={11}/>{e.time}</span>}
                      {e.place&&<span className="flex items-center gap-1"><MapPin size={11}/>{e.place}</span>}
                      <span className="flex items-center gap-1"><Users size={11}/>{AUD[e.audience]||'Toute l’école'}</span>
                    </div>
                    {e.desc&&<div className="text-xs text-muted mt-1">{e.desc}</div>}
                  </div>
                  {canDelete(e)&&<button onClick={()=>setConfirmDel(e)} aria-label={`Supprimer ${e.title}`} className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted hover:text-coral"><Trash2 size={14}/></button>}
                </div>
              </div>
            ))}
          </div> : <EmptyState icon={<CalendarDays size={22}/>} title="Aucun événement ce jour" sub={canAdd?'Double-cliquez sur un jour du calendrier pour en ajouter un.':'Sélectionnez un autre jour du calendrier.'}/>}
        </Card>

        <Card className="p-4">
          <div className="font-bold mb-3 flex items-center gap-2"><CalendarDays size={16} className="accent-text"/> À venir</div>
          <div className="space-y-2">
            {upcoming.length? upcoming.map(e=>(
              <button key={e.id} onClick={()=>{setSel(e.date);setCursor(startOfMonth(parseISO(e.date)))}} className="w-full flex items-center gap-3 text-left rounded-lg p-2 hover:bg-canvas">
                <div className="w-11 text-center shrink-0"><div className="text-lg font-extrabold" style={{color:tint(e.type)}}>{e.date.slice(8,10)}</div><div className="text-[11px] text-muted uppercase">{format(parseISO(e.date),'MMM',{locale:fr})}</div></div>
                <div className="min-w-0"><div className="text-sm font-semibold truncate">{e.title}</div><div className="text-[12px] text-muted">{e.type}{e.time?' · '+e.time:''}</div></div>
              </button>
            )) : <EmptyState icon={<CalendarDays size={22}/>} title="Rien de prévu" sub="Les prochains événements apparaîtront ici."/>}
          </div>
        </Card>
      </div>
    </div>

    <Modal open={open} onClose={()=>setOpen(false)} title="Nouvel événement"
      footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Annuler</Btn><Btn onClick={add}>Ajouter au calendrier</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Titre"><Input value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="ex. Réunion parents"/></Field>
        <Field label="Type"><Select value={f.type} onChange={e=>setF({...f,type:e.target.value})}>{TYPES.map(t=><option key={t.k}>{t.k}</option>)}</Select></Field>
        <Field label="Date"><Input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></Field>
        <Field label="Heure (optionnel)"><Input type="time" value={f.time} onChange={e=>setF({...f,time:e.target.value})}/></Field>
        <Field label="Lieu (optionnel)"><Input value={f.place} onChange={e=>setF({...f,place:e.target.value})} placeholder="ex. Salle des fêtes"/></Field>
        <Field label="Destinataires"><Select value={f.audience} onChange={e=>setF({...f,audience:e.target.value})}>{Object.entries(AUD).map(([k,v])=><option key={k} value={k}>{v}</option>)}</Select></Field>
        <div className="sm:col-span-2"><Field label="Description (optionnel)"><Textarea rows={3} value={f.desc} onChange={e=>setF({...f,desc:e.target.value})} placeholder="Détails de l’événement…"/></Field></div>
      </div>
    </Modal>

    <Modal open={!!confirmDel} onClose={()=>setConfirmDel(null)} title="Supprimer cet événement ?" size="sm"
      footer={<><Btn variant="ghost" onClick={()=>setConfirmDel(null)}>Annuler</Btn><Btn onClick={()=>del(confirmDel)}><Trash2 size={15}/> Supprimer</Btn></>}>
      <p className="text-sm text-muted">« {confirmDel?.title} » sera retiré du calendrier de l'école. Cette action est définitive.</p>
    </Modal>
  </>)
}
