import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { current } from '@core/auth.js'
import { db, mutate, uid } from '@core/db.js'
import { currency } from '@core/currency.js'
import { PageHead, Avatar, Btn, Modal, Field, Input, Select, Section, SearchInput, EmptyState, Card } from '../components/ui.jsx'
import { SubjectDot } from '../subjects.jsx'
import { GOVERNORATES, DOC_TYPES, validCIN } from '@core/tunisia.js'
import Attach from '../components/Attach.jsx'
import { UserPlus, Search, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
const BLANK={name:'',gender:'Homme',dob:'',subject:'',qualification:'',experience:'',joiningDate:'',designation:'Professeur',phone:'',email:'',address:'',salary:'',cin:'',governorate:'Tunis',attachments:[]}
export default function Teachers(){
  const u=current(); const canEdit=['schooladmin','admin'].includes(u.role)
  const [,force]=useState(0); const [open,setOpen]=useState(false); const [view,setView]=useState(null); const [f,setF]=useState(BLANK); const [q,setQ]=useState('')
  const d=db(); const loc=useLocation()
  useEffect(()=>{ const id=loc.state?.openTeacher; if(id){ const t=d.teachers.find(x=>x.id===id); if(t) setView(t) } },[loc.state])
  const add=()=>{ if(!f.name.trim())return toast.error('Le nom est requis')
    // le champ annonce « CIN (8 chiffres) » : on le vérifie vraiment (validCIN était importé sans être utilisé)
    if(f.cin && !validCIN(f.cin)) return toast.error('Le CIN doit comporter exactement 8 chiffres')
    mutate(db=>{db.teachers.push({...f,id:uid('t'),classes:[],experience:Number(f.experience)||0,salary:Number(f.salary)||0})})
    toast.success('Enseignant ajouté'); setOpen(false); setF(BLANK); force(x=>x+1) }
  const query=q.trim().toLowerCase()
  const list=query? d.teachers.filter(t=>t.name.toLowerCase().includes(query)||(t.subject||'').toLowerCase().includes(query)) : d.teachers
  // group by subject
  const subjects=[...new Set(list.map(t=>t.subject||'Autre'))].sort()
  const TCard=({t})=>(
    <button onClick={()=>setView(t)} className="card p-4 flex items-center gap-3 text-left hover:shadow-lg hover:-translate-y-0.5 transition w-full">
      <Avatar name={t.name} seed={t.id} size={44}/>
      <div className="min-w-0 flex-1"><div className="font-semibold truncate">{t.name}</div><div className="text-xs text-muted truncate">{t.designation} · {t.experience} ans</div></div>
      <ChevronRight size={16} className="text-muted"/>
    </button>
  )
  return (<>
    <PageHead title="Enseignants & personnel" sub={`${d.teachers.length} membres · ${subjects.length} matières`} action={canEdit&&<Btn onClick={()=>{setF(BLANK);setOpen(true)}}><UserPlus size={16}/> Ajouter un enseignant</Btn>}/>
    <SearchInput value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher (nom ou matière)…" className="max-w-sm mb-5"/>
    {list.length===0&&<Card><EmptyState icon={<Search size={26}/>} title="Aucun résultat" sub="Aucun membre du personnel ne correspond à cette recherche."/></Card>}
    <div className="space-y-6">
      {subjects.map(sub=>(
        <div key={sub}>
          <div className="flex items-center gap-2 mb-3"><SubjectDot label={sub} size={26} iconSize={14} radius="rounded-lg"/><h2 className="font-bold">{sub}</h2><span className="text-xs text-muted"> {list.filter(t=>(t.subject||'Autre')===sub).length}</span></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{list.filter(t=>(t.subject||'Autre')===sub).map(t=><TCard key={t.id} t={t}/>)}</div>
        </div>
      ))}
    </div>
    <Modal open={open} onClose={()=>setOpen(false)} title="Ajouter un enseignant / membre" size="2xl" footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Annuler</Btn><Btn onClick={add}>Ajouter</Btn></>}>
      <Section title="Informations personnelles">
        <Field label="Nom complet *"><Input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></Field>
        {/* adulte : civilité Homme/Femme (« Garçon/Fille » est réservé aux élèves) */}
        <Field label="Civilité"><Select value={f.gender} onChange={e=>setF({...f,gender:e.target.value})}><option>Homme</option><option>Femme</option></Select></Field>
        <Field label="Date de naissance"><Input type="date" value={f.dob} onChange={e=>setF({...f,dob:e.target.value})}/></Field>
        <Field label="CIN (8 chiffres)"><Input value={f.cin} onChange={e=>setF({...f,cin:e.target.value})} maxLength={8}/></Field>
        <Field label="Gouvernorat"><Select value={f.governorate} onChange={e=>setF({...f,governorate:e.target.value})}>{GOVERNORATES.map(g=><option key={g}>{g}</option>)}</Select></Field>
      </Section>
      <Section title="Informations professionnelles">
        <Field label="Matière"><Input value={f.subject} onChange={e=>setF({...f,subject:e.target.value})} placeholder="Mathématiques"/></Field>
        <Field label="Fonction"><Select value={f.designation} onChange={e=>setF({...f,designation:e.target.value})}>{['Professeur','Instituteur principal','Chef de département','Coordinateur','Assistant de laboratoire'].map(x=><option key={x}>{x}</option>)}</Select></Field>
        <Field label="Diplôme"><Input value={f.qualification} onChange={e=>setF({...f,qualification:e.target.value})} placeholder="Maîtrise"/></Field>
        <Field label="Expérience (années)"><Input type="number" value={f.experience} onChange={e=>setF({...f,experience:e.target.value})}/></Field>
        <Field label="Date d'embauche"><Input type="date" value={f.joiningDate} onChange={e=>setF({...f,joiningDate:e.target.value})}/></Field>
      </Section>
      <Section title="Contact & salaire">
        <Field label="Téléphone"><Input value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></Field>
        <Field label="E-mail"><Input value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></Field>
        <Field label="Adresse"><Input value={f.address} onChange={e=>setF({...f,address:e.target.value})}/></Field>
        <Field label={`Salaire mensuel (${currency()})`}><Input type="number" value={f.salary} onChange={e=>setF({...f,salary:e.target.value})}/></Field>
      </Section>
      <div className="mt-1"><div className="text-xs font-bold uppercase tracking-wide accent-text mb-2">Pièces à fournir</div>
        <Attach types={DOC_TYPES.teacher} value={f.attachments} onChange={a=>setF({...f,attachments:a})}/></div>
    </Modal>
    <Modal open={!!view} onClose={()=>setView(null)} title="Profil du personnel" size="xl">
      {view&&(<div><div className="flex items-center gap-4 mb-5"><Avatar name={view.name} seed={view.id} size={56}/><div><div className="text-xl font-extrabold">{view.name}</div><div className="text-muted text-sm">{view.designation} · {view.subject}</div></div></div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">{[['Genre',view.gender],['CIN',view.cin],['Gouvernorat',view.governorate],['Date de naissance',view.dob],['Diplôme',view.qualification],['Expérience',`${view.experience} ans`],['Date d\'embauche',view.joiningDate],['Téléphone',view.phone],['E-mail',view.email],['Adresse',view.address],['Salaire',view.salary?`${view.salary} DT`:'·']].map(([k,v])=><div key={k} className="flex justify-between border-b border-line py-1.5"><span className="text-muted">{k}</span><span className="font-medium text-right">{v||'·'}</span></div>)}</div></div>)}
    </Modal>
  </>)
}
