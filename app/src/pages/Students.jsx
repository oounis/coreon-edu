import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { current } from '../auth.js'
import { db, mutate, uid, classById, userById, CYCLES, studentsOfClass } from '../db.js'
import { PageHead, Avatar, Btn, Modal, Field, Input, Select, Section, Card } from '../components/ui.jsx'
import { studentColor } from '../data.js'
import { studentAvatar, avatarBg } from '../people.js'
import { GOVERNORATES, DOC_TYPES, LEGAL } from '../tunisia.js'
import Attach from '../components/Attach.jsx'
import Bulletin from '../components/Bulletin.jsx'
import GradeHistory from '../components/GradeHistory.jsx'
import { UserPlus, Eye, Droplet, Search, ShieldCheck, FileText, ChevronRight, ArrowLeft, Users, GraduationCap } from 'lucide-react'
import toast from 'react-hot-toast'
const BLANK={name:'',gender:'Garçon',dob:'',bloodGroup:'O+',nationality:'Tunisienne',grade:'5ème année',section:'A',rollNo:'',admissionDate:'',prevSchool:'',fatherName:'',motherName:'',guardianPhone:'',parentId:'',address:'',phone:'',email:'',medical:'Aucune',allergies:'Aucune',emergencyName:'',emergencyPhone:'',cin:'',governorate:'Tunis',attachments:[],consent:false}
const cycleOf=g=>CYCLES.find(c=>c.grades.includes(g))?.cycle||'Primaire'
const CYCLE_COLOR={Primaire:'#6C5CE7',Collège:'#36C5F0',Lycée:'#FFA62B'}
const face=s=>s.gender==='Fille'?'👧':s.gender==='Garçon'?'👦':'🧑'

export default function Students(){
  const u=current(); const canEdit=['schooladmin','admin'].includes(u.role)
  const [,force]=useState(0); const refresh=()=>force(x=>x+1)
  const [open,setOpen]=useState(false); const [viewS,setViewS]=useState(null); const [bulletin,setBulletin]=useState(null)
  const [q,setQ]=useState(''); const [sel,setSel]=useState(null); const [f,setF]=useState(BLANK)
  const d=db(); const parents=d.users.filter(x=>x.role==='parent')
  const loc=useLocation()
  useEffect(()=>{ const id=loc.state?.openStudent; if(id){ const s=d.students.find(x=>x.id===id); if(s) setViewS(s) } },[loc.state])

  const add=()=>{ if(!f.name.trim())return toast.error('Le nom est requis'); if(!f.consent)return toast.error('Veuillez accepter le consentement (loi 2004-63)')
    let cid; mutate(db=>{ let cls=db.classes.find(c=>c.grade===f.grade && c.name.endsWith(' '+f.section))
      if(!cls){ cls={id:uid('c'),name:`${f.grade} ${f.section}`,grade:f.grade,cycle:cycleOf(f.grade)}; db.classes.push(cls) }
      cid=cls.id; const sid=uid('s')
      db.students.push({...f,id:sid,name:f.name.trim(),initials:f.name.trim().split(' ').map(w=>w[0]).slice(0,2).join(''),classId:cid,parentId:f.parentId||null})
      db.payments[sid]=["Sep","Oct","Nov","Déc","Jan","Fév","Mar","Avr","Mai","Juin"].map(m=>({month:m,status:'due'})) })
    toast.success('Élève inscrit'); setOpen(false); setF(BLANK); refresh() }

  const query=q.trim().toLowerCase()
  const matches= query? d.students.filter(s=>s.name.toLowerCase().includes(query)) : null
  const byCycle=CYCLES.map(c=>({cycle:c.cycle,classes:d.classes.filter(cl=>cl.cycle===c.cycle)})).filter(g=>g.classes.length)

  const StudentCard=({s})=>(
    <button onClick={()=>setViewS(s)} className="card p-3 flex items-center gap-3 text-left hover:shadow-lg hover:-translate-y-0.5 transition w-full">
      <span className="w-11 h-11 rounded-2xl overflow-hidden grid place-items-center shrink-0" style={{background:avatarBg(s.id)}}><img src={studentAvatar(s.gender,s.id)} alt="" className="w-full h-full object-contain"/></span>
      <div className="min-w-0 flex-1"><div className="font-semibold truncate">{s.name}</div><div className="text-xs text-muted">{s.gender} · {classById(s.classId)?.name}</div></div>
      <span className="inline-flex items-center gap-1 text-[11px] text-muted"><Droplet size={11} className="text-coral"/>{s.bloodGroup}</span>
    </button>
  )

  return (<>
    <PageHead title="Élèves" sub={`${d.students.length} inscrits · ${d.classes.length} classes`}
      action={canEdit&&<Btn onClick={()=>{setF(BLANK);setOpen(true)}}><UserPlus size={16}/> Inscrire un élève</Btn>}/>
    <div className="card flex items-center gap-2 px-3 py-2 mb-5 max-w-sm"><Search size={16} className="text-muted"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher un élève par nom…" className="bg-transparent outline-none text-sm w-full"/></div>

    {matches ? (
      <div><div className="text-sm text-muted mb-3">{matches.length} résultat(s) pour « {q} »</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{matches.map(s=><StudentCard key={s.id} s={s}/>)}</div>
        {matches.length===0&&<Card className="p-10 text-center text-muted">Aucun élève ne correspond.</Card>}
      </div>
    ) : sel ? (
      <div>
        <button onClick={()=>setSel(null)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink mb-4"><ArrowLeft size={16}/> Toutes les classes</button>
        <div className="flex items-center gap-3 mb-4">
          <span className="w-11 h-11 rounded-2xl grid place-items-center text-white font-bold" style={{background:CYCLE_COLOR[classById(sel)?.cycle]}}><GraduationCap size={20}/></span>
          <div><div className="text-xl font-extrabold">{classById(sel)?.name}</div><div className="text-sm text-muted">{classById(sel)?.cycle} · {studentsOfClass(sel).length} élèves</div></div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{studentsOfClass(sel).map(s=><StudentCard key={s.id} s={s}/>)}</div>
      </div>
    ) : (
      <div className="space-y-7">
        {byCycle.map(g=>(
          <div key={g.cycle}>
            <div className="flex items-center gap-2 mb-3"><span className="w-2.5 h-2.5 rounded-full" style={{background:CYCLE_COLOR[g.cycle]}}/><h2 className="font-bold">{g.cycle}</h2><span className="text-xs text-muted">· {g.classes.length} classe(s)</span></div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {g.classes.map(cl=>{const n=studentsOfClass(cl.id).length; const c=CYCLE_COLOR[g.cycle]; return(
                <button key={cl.id} onClick={()=>setSel(cl.id)} className="card p-5 text-left hover:shadow-xl hover:-translate-y-0.5 transition relative overflow-hidden">
                  <span className="absolute right-0 top-0 w-20 h-20 rounded-full -mr-6 -mt-6" style={{background:c+'14'}}/>
                  <span className="relative w-12 h-12 rounded-2xl grid place-items-center text-white" style={{background:c}}><GraduationCap size={22}/></span>
                  <div className="relative font-extrabold text-lg mt-3">{cl.name}</div>
                  <div className="relative text-sm text-muted flex items-center gap-1.5 mt-0.5"><Users size={14}/> {n} élève{n>1?'s':''}</div>
                  <div className="relative flex items-center gap-1 text-xs font-semibold mt-3" style={{color:c}}>Voir la classe <ChevronRight size={14}/></div>
                </button>
              )})}
            </div>
          </div>
        ))}
      </div>
    )}

    <Modal open={open} onClose={()=>setOpen(false)} title="Inscrire un nouvel élève" size="2xl" footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Annuler</Btn><Btn onClick={add}>Inscrire</Btn></>}>
      <Section title="Informations personnelles">
        <Field label="Nom complet *"><Input value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Amira Ben Salah"/></Field>
        <Field label="Genre"><Select value={f.gender} onChange={e=>setF({...f,gender:e.target.value})}><option>Garçon</option><option>Fille</option></Select></Field>
        <Field label="Date de naissance"><Input type="date" value={f.dob} onChange={e=>setF({...f,dob:e.target.value})}/></Field>
        <Field label="Groupe sanguin"><Select value={f.bloodGroup} onChange={e=>setF({...f,bloodGroup:e.target.value})}>{['O+','O-','A+','A-','B+','B-','AB+','AB-'].map(b=><option key={b}>{b}</option>)}</Select></Field>
        <Field label="Nationalité"><Input value={f.nationality} onChange={e=>setF({...f,nationality:e.target.value})}/></Field>
      </Section>
      <Section title="Scolarité">
        <Field label="Niveau"><Select value={f.grade} onChange={e=>setF({...f,grade:e.target.value})}>{CYCLES.map(c=><optgroup key={c.cycle} label={c.cycle}>{c.grades.map(g=><option key={g} value={g}>{g}</option>)}</optgroup>)}</Select></Field>
        <Field label="Section"><Select value={f.section} onChange={e=>setF({...f,section:e.target.value})}>{['A','B','C','D'].map(s=><option key={s}>{s}</option>)}</Select></Field>
        <Field label="N° d'inscription"><Input value={f.rollNo} onChange={e=>setF({...f,rollNo:e.target.value})}/></Field>
        <Field label="Date d'inscription"><Input type="date" value={f.admissionDate} onChange={e=>setF({...f,admissionDate:e.target.value})}/></Field>
        <Field label="École précédente"><Input value={f.prevSchool} onChange={e=>setF({...f,prevSchool:e.target.value})}/></Field>
        <Field label="N° acte de naissance"><Input value={f.cin} onChange={e=>setF({...f,cin:e.target.value})} placeholder="ACTE-..."/></Field>
        <Field label="Gouvernorat"><Select value={f.governorate} onChange={e=>setF({...f,governorate:e.target.value})}>{GOVERNORATES.map(g=><option key={g}>{g}</option>)}</Select></Field>
      </Section>
      <Section title="Tuteur / parent">
        <Field label="Nom du père"><Input value={f.fatherName} onChange={e=>setF({...f,fatherName:e.target.value})}/></Field>
        <Field label="Nom de la mère"><Input value={f.motherName} onChange={e=>setF({...f,motherName:e.target.value})}/></Field>
        <Field label="Téléphone tuteur"><Input value={f.guardianPhone} onChange={e=>setF({...f,guardianPhone:e.target.value})}/></Field>
        <Field label="Lier à un compte parent"><Select value={f.parentId} onChange={e=>setF({...f,parentId:e.target.value})}><option value="">— aucun —</option>{parents.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
      </Section>
      <Section title="Contact & adresse">
        <Field label="Téléphone"><Input value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></Field>
        <Field label="E-mail"><Input value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></Field>
        <Field label="Adresse"><Input value={f.address} onChange={e=>setF({...f,address:e.target.value})}/></Field>
      </Section>
      <Section title="Médical & urgence">
        <Field label="Conditions médicales"><Input value={f.medical} onChange={e=>setF({...f,medical:e.target.value})}/></Field>
        <Field label="Allergies"><Input value={f.allergies} onChange={e=>setF({...f,allergies:e.target.value})}/></Field>
        <Field label="Contact d'urgence"><Input value={f.emergencyName} onChange={e=>setF({...f,emergencyName:e.target.value})}/></Field>
        <Field label="Téléphone d'urgence"><Input value={f.emergencyPhone} onChange={e=>setF({...f,emergencyPhone:e.target.value})}/></Field>
      </Section>
      <div className="mb-3"><div className="text-xs font-bold uppercase tracking-wide accent-text mb-2">Pièces à fournir</div>
        <Attach types={DOC_TYPES.student} value={f.attachments} onChange={a=>setF({...f,attachments:a})}/></div>
      <label className="flex items-start gap-2 text-xs text-muted bg-canvas rounded-xl p-3"><input type="checkbox" checked={f.consent} onChange={e=>setF({...f,consent:e.target.checked})} className="mt-0.5"/><span><ShieldCheck size={13} className="inline accent-text"/> {LEGAL.consent}</span></label>
    </Modal>

    <Modal open={!!viewS} onClose={()=>setViewS(null)} title="Fiche élève" size="xl">
      {viewS&&(<div><div className="flex items-center gap-4 mb-5"><span className="w-14 h-14 rounded-2xl overflow-hidden grid place-items-center" style={{background:avatarBg(viewS.id)}}><img src={studentAvatar(viewS.gender,viewS.id)} alt="" className="w-full h-full object-contain"/></span><div className="flex-1"><div className="text-xl font-extrabold">{viewS.name}</div><div className="text-muted text-sm">{classById(viewS.classId)?.name} · N° {viewS.rollNo} · {viewS.gender}</div></div><Btn variant="soft" onClick={()=>{const v=viewS;setViewS(null);setBulletin(v)}}><FileText size={15}/> Bulletin</Btn></div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">{[['Naissance',viewS.dob],['Groupe sanguin',viewS.bloodGroup],['Nationalité',viewS.nationality],['Inscription',viewS.admissionDate],['École préc.',viewS.prevSchool],['Père',viewS.fatherName],['Mère',viewS.motherName],['Tél. tuteur',viewS.guardianPhone],['Compte parent',userById(viewS.parentId)?.name||'—'],['Adresse',viewS.address],['Téléphone',viewS.phone],['E-mail',viewS.email||'—'],['Médical',viewS.medical],['Allergies',viewS.allergies],['CIN/Acte',viewS.cin],['Gouvernorat',viewS.governorate],['Urgence',`${viewS.emergencyName} · ${viewS.emergencyPhone}`]].map(([k,v])=><div key={k} className="flex justify-between border-b border-line py-1.5"><span className="text-muted">{k}</span><span className="font-medium text-right">{v||'—'}</span></div>)}</div>
        <div className="mt-6 pt-5 border-t border-line"><GradeHistory studentId={viewS.id}/></div></div>)}
    </Modal>
    <Bulletin student={bulletin} onClose={()=>setBulletin(null)}/>
  </>)
}
