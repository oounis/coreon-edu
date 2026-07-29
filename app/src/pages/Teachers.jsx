import { useState, useEffect } from 'react'
import { t } from '@core/i18n.js'
import { useLocation } from 'react-router-dom'
import { current } from '@core/auth.js'
import { db, mutate, uid, assignRef } from '@core/db.js'
import { currency, money } from '@core/currency.js'
import { PageHead, Avatar, Btn, Modal, Field, Input, Select, Section, SearchInput, EmptyState, Card } from '../components/ui.jsx'
import { SubjectDot } from '../subjects.jsx'
import { regionsOf, regionLabel, DOC_TYPES, validCIN, idLabelFor } from '@core/tunisia.js'
import Attach from '../components/Attach.jsx'
import { UserPlus, Search, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
const BLANK={name:'',gender:'Homme',dob:'',subject:'',qualification:'',experience:'',joiningDate:'',designation:'Professeur',phone:'',email:'',address:'',salary:'',cin:'',governorate:'Tunis',attachments:[]}
export default function Teachers(){
  const u=current(); const canEdit=['schooladmin','admin'].includes(u.role)
  const [,force]=useState(0); const [open,setOpen]=useState(false); const [view,setView]=useState(null); const [f,setF]=useState(BLANK); const [q,setQ]=useState('')
  const d=db(); const loc=useLocation()
  useEffect(()=>{ const id=loc.state?.openTeacher; if(id){ const teacher=d.teachers.find(x=>x.id===id); if(teacher) setView(teacher) } },[loc.state])
  const add=()=>{ if(!f.name.trim())return toast.error('Le nom est requis')
    // le champ annonce « CIN (8 chiffres) » : on le vérifie vraiment (validCIN était importé sans être utilisé)
    if(f.cin && !validCIN(f.cin)) return toast.error('Pièce d’identité invalide pour ce pays.')
    mutate(db=>{const tt={...f,id:uid('t'),classes:[],experience:Number(f.experience)||0,salary:Number(f.salary)||0}; assignRef(db,'teacher',tt); db.teachers.push(tt)})
    toast.success('Enseignant ajouté'); setOpen(false); setF(BLANK); force(x=>x+1) }
  const query=q.trim().toLowerCase()
  const list=query? d.teachers.filter(v=>v.name.toLowerCase().includes(query)||(v.subject||'').toLowerCase().includes(query)) : d.teachers
  // group by subject
  const subjects=[...new Set(list.map(v=>v.subject||'Autre'))].sort()
  const TCard=({v})=>(
    <button onClick={()=>setView(v)} className="card p-4 flex items-center gap-3 text-left hover:shadow-lg hover:-translate-y-0.5 transition w-full">
      <Avatar name={v.name} seed={v.id} size={44}/>
      <div className="min-w-0 flex-1"><div className="font-semibold truncate">{v.name}{v.ref && <code className="ms-1.5 text-[10px] font-semibold text-muted tabular-nums">{v.ref}</code>}</div><div className="text-xs text-muted truncate">{v.designation} · {v.experience} ans</div></div>
      <ChevronRight size={16} className="text-muted"/>
    </button>
  )
  return (<>
    <PageHead title="Enseignants & personnel" sub={`${d.teachers.length} membres · ${subjects.length} matières`} action={canEdit&&<Btn onClick={()=>{setF(BLANK);setOpen(true)}}><UserPlus size={16}/> {t('Ajouter un enseignant')}</Btn>}/>
    <SearchInput value={q} onChange={e=>setQ(e.target.value)} placeholder={t('Rechercher (nom ou matière)…')} className="max-w-sm mb-5"/>
    {list.length===0&&<Card><EmptyState icon={<Search size={26}/>} title={t('Aucun résultat')} sub={t('Aucun membre du personnel ne correspond à cette recherche.')}/></Card>}
    <div className="space-y-6">
      {subjects.map(sub=>(
        <div key={sub}>
          <div className="flex items-center gap-2 mb-3"><SubjectDot label={sub} size={26} iconSize={14} radius="rounded-lg"/><h2 className="font-bold">{sub}</h2><span className="text-xs text-muted"> {list.filter(v=>(v.subject||'Autre')===sub).length}</span></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{list.filter(v=>(v.subject||'Autre')===sub).map(v=><TCard key={v.id} v={v}/>)}</div>
        </div>
      ))}
    </div>
    <Modal open={open} onClose={()=>setOpen(false)} title={t('Ajouter un enseignant / membre')} size="2xl" footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Annuler</Btn><Btn onClick={add}>Ajouter</Btn></>}>
      <Section title="Informations personnelles">
        <Field label="Nom complet *"><Input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></Field>
        {/* adulte : civilité Homme/Femme (« Garçon/Fille » est réservé aux élèves) */}
        <Field label={t('Civilité')}><Select value={f.gender} onChange={e=>setF({...f,gender:e.target.value})}><option>Homme</option><option>Femme</option></Select></Field>
        <Field label={t('Date de naissance')}><Input type="date" value={f.dob} onChange={e=>setF({...f,dob:e.target.value})}/></Field>
        <Field label={idLabelFor('staff')}><Input value={f.cin} onChange={e=>setF({...f,cin:e.target.value})}/></Field>
        <Field label={regionLabel()}><Select value={f.governorate} onChange={e=>setF({...f,governorate:e.target.value})}>{regionsOf().length?regionsOf().map(g=><option key={g}>{g}</option>):<option value="">(saisie libre)</option>}</Select></Field>
      </Section>
      <Section title="Informations professionnelles">
        <Field label={t('Matière')}><Input value={f.subject} onChange={e=>setF({...f,subject:e.target.value})} placeholder={t('Mathématiques')}/></Field>
        <Field label="Fonction"><Select value={f.designation} onChange={e=>setF({...f,designation:e.target.value})}>{['Professeur','Instituteur principal','Chef de département','Coordinateur','Assistant de laboratoire'].map(x=><option key={x}>{x}</option>)}</Select></Field>
        <Field label={t('Diplôme')}><Input value={f.qualification} onChange={e=>setF({...f,qualification:e.target.value})} placeholder={t('Maîtrise')}/></Field>
        <Field label={t('Expérience (années)')}><Input type="number" value={f.experience} onChange={e=>setF({...f,experience:e.target.value})}/></Field>
        <Field label="Date d'embauche"><Input type="date" value={f.joiningDate} onChange={e=>setF({...f,joiningDate:e.target.value})}/></Field>
      </Section>
      <Section title="Contact & salaire">
        <Field label={t('Téléphone')}><Input value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></Field>
        <Field label="E-mail"><Input value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></Field>
        <Field label="Adresse"><Input value={f.address} onChange={e=>setF({...f,address:e.target.value})}/></Field>
        <Field label={`Salaire mensuel (${currency()})`}><Input type="number" value={f.salary} onChange={e=>setF({...f,salary:e.target.value})}/></Field>
      </Section>
      <div className="mt-1"><div className="text-xs font-bold uppercase tracking-wide accent-text mb-2">{t('Pièces à fournir')}</div>
        <Attach types={DOC_TYPES.teacher} value={f.attachments} onChange={a=>setF({...f,attachments:a})}/></div>
    </Modal>
    <Modal open={!!view} onClose={()=>setView(null)} title={t('Profil du personnel')} size="xl">
      {view&&(<div><div className="flex items-center gap-4 mb-5"><Avatar name={view.name} seed={view.id} size={56}/><div><div className="text-xl font-extrabold">{view.name}</div><div className="text-muted text-sm">{view.designation} · {view.subject}</div></div></div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">{[['Genre',view.gender],[idLabelFor('teacher'),view.cin],[regionLabel(),view.governorate],['Date de naissance',view.dob],['Diplôme',view.qualification],['Expérience',`${view.experience} ans`],['Date d\'embauche',view.joiningDate],['Téléphone',view.phone],['E-mail',view.email],['Adresse',view.address],['Salaire',view.salary?money(view.salary):'·']].map(([k,v])=><div key={k} className="flex justify-between border-b border-line py-1.5"><span className="text-muted">{k}</span><span className="font-medium text-right">{v||'·'}</span></div>)}</div></div>)}
    </Modal>
  </>)
}
