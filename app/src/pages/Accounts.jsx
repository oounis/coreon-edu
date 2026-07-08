import { useState } from 'react'
import { db, mutate, uid } from '../db.js'
import { ROLE } from '../theme.js'
import { notify } from '../notify.js'
import { STAFF_POSITIONS, GOVERNORATES, docTypesFor, validCIN } from '../tunisia.js'
import { PageHead, Table, Avatar, Btn, Modal, Field, Input, Select, Section } from '../components/ui.jsx'
import Attach from '../components/Attach.jsx'
import { UserPlus, ShieldCheck, KeyRound, Ban, Check, Paperclip } from 'lucide-react'
import toast from 'react-hot-toast'
const BLANK={role:'teacher',name:'',email:'',pw:'',cin:'',gender:'Garçon',governorate:'Tunis',position:'Instituteur',phone:'',address:'',occupation:'',subject:'',childIds:[],attachments:[]}
export default function Accounts(){
  const [,force]=useState(0); const [open,setOpen]=useState(false); const [view,setView]=useState(null); const [f,setF]=useState(BLANK)
  const d=db()
  const create=()=>{
    if(!f.name.trim()||!f.email.trim())return toast.error('Nom et e-mail requis')
    if(f.cin && !validCIN(f.cin))return toast.error('CIN invalide (8 chiffres)')
    const id=uid('u')
    mutate(db=>{
      const user={id,role:f.role,name:f.name.trim(),email:f.email.trim(),pw:f.pw||'1234',cin:f.cin,gender:f.gender,governorate:f.governorate,phone:f.phone,address:f.address,attachments:f.attachments}
      if(f.role==='parent'){ user.occupation=f.occupation; user.childIds=f.childIds }
      else { user.position=f.position }
      if(f.role==='teacher'){ const tid=uid('t'); db.teachers.push({id:tid,name:user.name,subject:f.subject||'—',designation:f.position,classes:[],experience:0,phone:f.phone,email:user.email,cin:f.cin,governorate:f.governorate,position:f.position,attachments:f.attachments}); user.teacherId=tid }
      db.users.push(user)
    })
    notify({to:id,kind:'info',actor:'Direction',title:'compte créé',body:`Bienvenue — rôle ${ROLE[f.role].label}.`,link:'/app'})
    toast.success(`Compte ${ROLE[f.role].label} créé`); setOpen(false); setF(BLANK); force(x=>x+1)
  }
  const resetPw=(usr)=>{ const tmp=Math.random().toString(36).slice(2,8); mutate(db=>{const x=db.users.find(y=>y.id===usr.id); if(x)x.pw=tmp}); notify({to:usr.id,kind:'info',actor:'Direction',title:'mot de passe réinitialisé',body:'Un nouveau mot de passe temporaire vous a été attribué.'}); toast.success(`Nouveau mot de passe : ${tmp}`); setView({...usr,pw:tmp}); force(x=>x+1) }
  const toggleActive=(usr)=>{ const now=!usr.disabled; mutate(db=>{const x=db.users.find(y=>y.id===usr.id); if(x)x.disabled=now}); toast.success(now?'Compte désactivé':'Compte réactivé'); setView({...usr,disabled:now}); force(x=>x+1) }
  const toggleChild=sid=>setF(p=>({...p,childIds:p.childIds.includes(sid)?p.childIds.filter(x=>x!==sid):[...p.childIds,sid]}))
  const isStaff=['teacher','admin','supervisor'].includes(f.role)
  return (<>
    <PageHead title="Comptes & personnel" sub="Créez les accès et les profils (avec pièces jointes)." action={<Btn onClick={()=>{setF(BLANK);setOpen(true)}}><UserPlus size={16}/> Créer un compte</Btn>}/>
    <div className="space-y-6">
      {['schooladmin','admin','teacher','supervisor','parent'].filter(r=>d.users.some(u=>u.role===r)).map(r=>{const R=ROLE[r];const us=d.users.filter(u=>u.role===r);return(
        <div key={r}>
          <div className="flex items-center gap-2 mb-3"><span className="w-2.5 h-2.5 rounded-full" style={{background:R.color}}/><h2 className="font-bold">{R.label}</h2><span className="text-xs text-muted">· {us.length} compte(s)</span></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {us.map(u=>(
              <button key={u.id} onClick={()=>setView(u)} className={`card p-4 flex items-center gap-3 text-left hover:shadow-lg hover:-translate-y-0.5 transition w-full ${u.disabled?'opacity-60':''}`}>
                <Avatar name={u.name} seed={u.id} size={44} className={u.disabled?'opacity-50':''}/>
                <div className="min-w-0 flex-1"><div className="font-semibold truncate flex items-center gap-2">{u.name}{u.disabled&&<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-canvas text-muted">Désactivé</span>}</div><div className="text-xs text-muted truncate">{u.position||u.occupation||u.email}</div></div>
                {(u.attachments||[]).length>0&&<span className="inline-flex items-center gap-0.5 text-[11px] text-muted shrink-0"><Paperclip size={11}/>{u.attachments.length}</span>}
              </button>
            ))}
          </div>
        </div>
      )})}
    </div>
    <Modal open={open} onClose={()=>setOpen(false)} title="Créer un compte / profil" size="2xl" footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Annuler</Btn><Btn onClick={create}>Créer le compte</Btn></>}>
      <Section title="Compte">
        <Field label="Rôle"><Select value={f.role} onChange={e=>setF({...f,role:e.target.value})}>{['admin','teacher','supervisor','parent'].map(r=><option key={r} value={r}>{ROLE[r].label}</option>)}</Select></Field>
        <Field label="Nom complet *"><Input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></Field>
        <Field label="E-mail *"><Input value={f.email} onChange={e=>setF({...f,email:e.target.value})} placeholder="nom@alnour.tn"/></Field>
        <Field label="Mot de passe temporaire"><Input value={f.pw} onChange={e=>setF({...f,pw:e.target.value})} placeholder="défaut 1234"/></Field>
      </Section>
      <Section title="Identité (Tunisie)">
        <Field label="CIN (8 chiffres)"><Input value={f.cin} onChange={e=>setF({...f,cin:e.target.value})} placeholder="12345678" maxLength={8}/></Field>
        <Field label="Genre"><Select value={f.gender} onChange={e=>setF({...f,gender:e.target.value})}><option>Garçon</option><option>Fille</option></Select></Field>
        <Field label="Gouvernorat"><Select value={f.governorate} onChange={e=>setF({...f,governorate:e.target.value})}>{GOVERNORATES.map(g=><option key={g}>{g}</option>)}</Select></Field>
      </Section>
      {isStaff && <Section title="Fonction" cols={2}>
        <Field label="Poste / fonction"><Select value={f.position} onChange={e=>setF({...f,position:e.target.value})}>{STAFF_POSITIONS.map(g=><optgroup key={g.group} label={g.group}>{g.items.map(p=><option key={p}>{p}</option>)}</optgroup>)}</Select></Field>
        {f.role==='teacher'&&<Field label="Matière"><Input value={f.subject} onChange={e=>setF({...f,subject:e.target.value})} placeholder="Mathématiques"/></Field>}
      </Section>}
      <Section title="Contact"><Field label="Téléphone"><Input value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></Field><Field label="Adresse"><Input value={f.address} onChange={e=>setF({...f,address:e.target.value})}/></Field>
        {f.role==='parent'&&<Field label="Profession"><Input value={f.occupation} onChange={e=>setF({...f,occupation:e.target.value})}/></Field>}</Section>
      {f.role==='parent'&&<div className="mb-4"><div className="text-xs font-bold uppercase tracking-wide accent-text mb-2">Enfants</div>
        <div className="flex flex-wrap gap-2">{d.students.filter(s=>!s.parentId).map(s=><button key={s.id} onClick={()=>toggleChild(s.id)} className={`text-sm px-3 py-1.5 rounded-full border ${f.childIds.includes(s.id)?'accent-soft accent-text':'border-line'}`}>{s.name}</button>)}</div></div>}
      <div className="mb-2"><div className="text-xs font-bold uppercase tracking-wide accent-text mb-2">Pièces à fournir</div>
        <Attach types={docTypesFor(f.role)} value={f.attachments} onChange={a=>setF({...f,attachments:a})}/></div>
    </Modal>
    <Modal open={!!view} onClose={()=>setView(null)} title="Profil" size="xl">
      {view&&(<div><div className="flex items-center gap-4 mb-4"><Avatar name={view.name} seed={view.id} size={56}/><div><div className="text-xl font-extrabold">{view.name}</div><div className="text-muted text-sm">{ROLE[view.role]?.label}{view.position&&` · ${view.position}`}</div></div></div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">{[['E-mail',view.email],['CIN',view.cin],['Gouvernorat',view.governorate],['Téléphone',view.phone],['Adresse',view.address],['Profession',view.occupation]].filter(x=>x[1]).map(([k,v])=><div key={k} className="flex justify-between border-b border-line py-1.5"><span className="text-muted">{k}</span><span className="font-medium">{v}</span></div>)}</div>
        <div className="text-xs font-bold uppercase text-muted mb-2">Pièces jointes</div>
        {(view.attachments||[]).length? <div className="space-y-1">{view.attachments.map((a,i)=><div key={i} className="flex justify-between text-sm border border-line rounded-lg px-3 py-1.5"><span className="text-muted">{a.type}</span><span className="font-medium inline-flex items-center gap-1.5"><Paperclip size={13} className="text-muted"/>{a.name}</span></div>)}</div> : <div className="text-sm text-muted">Aucune pièce.</div>}
        {view.role!=='owner' && <div className="mt-5 pt-4 border-t border-line flex flex-wrap gap-2 items-center">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${view.disabled?'bg-canvas text-muted':''}`} style={view.disabled?{}:{background:'#E2FBF3',color:'#10B981'}}>{view.disabled?'● Désactivé':'● Actif'}</span>
          <div className="flex-1"/>
          <Btn variant="ghost" onClick={()=>resetPw(view)}><KeyRound size={15}/> Réinitialiser le mot de passe</Btn>
          {view.disabled? <Btn onClick={()=>toggleActive(view)}><Check size={15}/> Réactiver</Btn> : <Btn variant="danger" onClick={()=>toggleActive(view)}><Ban size={15}/> Désactiver</Btn>}
        </div>}
      </div>)}
    </Modal>
  </>)
}
