import { useState } from 'react'
import { current } from '../auth.js'
import { db, mutate, uid, classById, userById, CYCLES } from '../db.js'
import { PageHead, Table, Avatar, Btn, Modal, Field, Input, Select, Section } from '../components/ui.jsx'
import { studentColor } from '../data.js'
import { UserPlus, Eye, Droplet, Search } from 'lucide-react'
import toast from 'react-hot-toast'
const BLANK={name:'',gender:'Garçon',dob:'',bloodGroup:'O+',nationality:'Tunisienne',grade:'5ème année',section:'A',rollNo:'',admissionDate:'',prevSchool:'',fatherName:'',motherName:'',guardianPhone:'',parentId:'',address:'',phone:'',email:'',medical:'Aucune',allergies:'Aucune',emergencyName:'',emergencyPhone:''}
const cycleOf=g=>CYCLES.find(c=>c.grades.includes(g))?.cycle||'Primaire'
export default function Students(){
  const u=current(); const canEdit=['schooladmin','admin'].includes(u.role)
  const [,force]=useState(0); const refresh=()=>force(x=>x+1)
  const [open,setOpen]=useState(false); const [view,setView]=useState(null); const [q,setQ]=useState(''); const [f,setF]=useState(BLANK)
  const d=db(); const parents=d.users.filter(x=>x.role==='parent')
  const list=d.students.filter(s=>s.name.toLowerCase().includes(q.toLowerCase()))
  const add=()=>{ if(!f.name.trim())return toast.error('Le nom est requis')
    const className=`${f.grade.replace(/ /g,'').slice(0,6)} ${f.section}`
    let cid
    mutate(db=>{ let cls=db.classes.find(c=>c.grade===f.grade && c.name.endsWith(' '+f.section))
      if(!cls){ cls={id:uid('c'),name:`${f.grade} ${f.section}`,grade:f.grade,cycle:cycleOf(f.grade)}; db.classes.push(cls) }
      cid=cls.id
      const sid=uid('s')
      db.students.push({...f,id:sid,name:f.name.trim(),initials:f.name.trim().split(' ').map(w=>w[0]).slice(0,2).join(''),classId:cid,parentId:f.parentId||null})
      db.payments[sid]=["Sep","Oct","Nov","Déc","Jan","Fév","Mar","Avr","Mai","Juin"].map(m=>({month:m,status:'due'})) })
    toast.success('Élève inscrit'); setOpen(false); setF(BLANK); refresh() }
  return (<>
    <PageHead title="Élèves" sub={`${d.students.length} inscrits · ${d.classes.length} classes`} action={canEdit&&<Btn onClick={()=>{setF(BLANK);setOpen(true)}}><UserPlus size={16}/> Inscrire un élève</Btn>}/>
    <div className="card flex items-center gap-2 px-3 py-2 mb-4 max-w-sm"><Search size={16} className="text-muted"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher un élève…" className="bg-transparent outline-none text-sm w-full"/></div>
    <Table head={['Élève','Classe','Tuteur','Groupe sanguin','Statut','']}>
      {list.map(s=>(<tr key={s.id} className="hover:bg-canvas">
        <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={s.name} color={studentColor(s.id)}/><div><div className="font-medium">{s.name}</div><div className="text-xs text-muted">{s.gender} · N° {s.rollNo}</div></div></div></td>
        <td className="px-4 py-3">{classById(s.classId)?.name}</td>
        <td className="px-4 py-3 text-muted">{userById(s.parentId)?.name||s.fatherName||'—'}</td>
        <td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-xs"><Droplet size={12} className="text-coral"/>{s.bloodGroup}</span></td>
        <td className="px-4 py-3"><span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:'#E2FBF3',color:'#10B981'}}>Actif</span></td>
        <td className="px-4 py-3"><button onClick={()=>setView(s)} className="text-muted hover:accent-text"><Eye size={17}/></button></td>
      </tr>))}
    </Table>
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
    </Modal>
    <Modal open={!!view} onClose={()=>setView(null)} title="Fiche élève" size="xl">
      {view&&(<div><div className="flex items-center gap-4 mb-5"><Avatar name={view.name} color={studentColor(view.id)} size={56}/><div><div className="text-xl font-extrabold">{view.name}</div><div className="text-muted text-sm">{classById(view.classId)?.name} · N° {view.rollNo} · {view.gender}</div></div></div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">{[['Naissance',view.dob],['Groupe sanguin',view.bloodGroup],['Nationalité',view.nationality],['Inscription',view.admissionDate],['École préc.',view.prevSchool],['Père',view.fatherName],['Mère',view.motherName],['Tél. tuteur',view.guardianPhone],['Compte parent',userById(view.parentId)?.name||'—'],['Adresse',view.address],['Téléphone',view.phone],['E-mail',view.email||'—'],['Médical',view.medical],['Allergies',view.allergies],['Urgence',`${view.emergencyName} · ${view.emergencyPhone}`]].map(([k,v])=><div key={k} className="flex justify-between border-b border-line py-1.5"><span className="text-muted">{k}</span><span className="font-medium text-right">{v||'—'}</span></div>)}</div></div>)}
    </Modal>
  </>)
}
