import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { current } from '@core/auth.js'
import { db, mutate, uid, classById, userById, CYCLES, studentsOfClass, setStudentParent } from '@core/db.js'
import { PageHead, Avatar, Btn, Modal, Field, Input, Select, Section, SearchInput, EmptyState, Card } from '../components/ui.jsx'
import { GOVERNORATES, DOC_TYPES, LEGAL } from '@core/tunisia.js'
import Attach from '../components/Attach.jsx'
import DataTable from '../components/DataTable.jsx'
import { UserPlus, ShieldCheck } from 'lucide-react'
import { attParts } from '@core/db.js'
import { Badge, STATUS } from '../components/ui.jsx'
import toast from 'react-hot-toast'
import { notify } from '@core/notify.js'
const BLANK={name:'',gender:'Garçon',dob:'',bloodGroup:'O+',nationality:'Tunisienne',grade:'5ème année',section:'A',rollNo:'',admissionDate:'',prevSchool:'',fatherName:'',motherName:'',guardianPhone:'',parentId:'',address:'',phone:'',email:'',medical:'Aucune',allergies:'Aucune',emergencyName:'',emergencyPhone:'',cin:'',governorate:'Tunis',attachments:[],consent:false}
const cycleOf=g=>CYCLES.find(c=>c.grades.includes(g))?.cycle||'Primaire'
import { BRAND } from '@core/tokens.js'
const CYCLE_COLOR={Primaire:BRAND.indigo}

export default function Students(){
  const u=current(); const canEdit=['schooladmin','admin'].includes(u.role)
  const [,force]=useState(0); const refresh=()=>force(x=>x+1)
  const [open,setOpen]=useState(false); const [f,setF]=useState(BLANK)
  const [cycle,setCycle]=useState('all'); const [classe,setClasse]=useState('all')
  const navigate=useNavigate()
  const d=db(); const parents=d.users.filter(x=>x.role==='parent')
  const loc=useLocation()
  useEffect(()=>{ const id=loc.state?.openStudent; if(id) navigate(`/app/eleve/${id}`,{replace:true}) },[loc.state])

  const add=()=>{ if(!f.name.trim())return toast.error('Le nom est requis'); if(!f.consent)return toast.error('Veuillez accepter le consentement (loi 2004-63)')
    let cid; mutate(db=>{ let cls=db.classes.find(c=>c.grade===f.grade && c.name.endsWith(' '+f.section))
      if(!cls){ cls={id:uid('c'),name:`${f.grade} ${f.section}`,grade:f.grade,cycle:cycleOf(f.grade)}; db.classes.push(cls) }
      cid=cls.id; const sid=uid('s')
      db.students.push({...f,id:sid,name:f.name.trim(),initials:f.name.trim().split(' ').map(w=>w[0]).slice(0,2).join(''),classId:cid,parentId:null})
      setStudentParent(db,sid,f.parentId||null)   // écrit aussi user.childIds
      db.payments[sid]=["Sep","Oct","Nov","Déc","Jan","Fév","Mar","Avr","Mai","Juin"].map(m=>({month:m,status:'due'})) })
    toast.success('Élève inscrit'); setOpen(false); setF(BLANK); refresh() }

  // ── Le répertoire : présence 30 j et impayés calculés une fois ──
  const enrich = (() => {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const att = {}
    for (const key in (d.attendance || {})) {
      const { iso } = attParts(key)
      if (iso < cutoff) continue
      for (const [sid, st] of Object.entries(d.attendance[key])) {
        const a = att[sid] = att[sid] || { p: 0, t: 0 }
        a.t++; if (st === 'present') a.p++
      }
    }
    return d.students.map(s => {
      const a = att[s.id]
      const unpaid = (d.payments[s.id] || []).filter(m => m.status === 'due' || m.status === 'overdue').length
      return { ...s, _classe: classById(s.classId)?.name || '—', _cycle: classById(s.classId)?.cycle || '—',
        _parent: userById(s.parentId)?.name || '', _tel: s.guardianPhone || s.phone || '',
        _presence: a ? Math.round(a.p / a.t * 100) : null, _impayes: unpaid,
        _allerg: s.allergies && s.allergies !== 'Aucune' ? s.allergies : '' }
    })
  })()
  const rows = enrich.filter(s =>
    (cycle === 'all' || s._cycle === cycle) && (classe === 'all' || s.classId === classe) && !s.archived)
  const archived = enrich.filter(s => s.archived).length

  const columns = [
    { key: 'name', label: 'Élève', value: r => r.name, render: r => (
        <span className="flex items-center gap-2.5 min-w-[180px]"><Avatar name={r.name} seed={r.id} size={30}/>
          <span className="font-semibold">{r.name}</span>
          {r._allerg && <span title={`Allergie : ${r._allerg}`} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{background:STATUS.warnSoft,color:STATUS.warn}}>ALLERGIE</span>}</span>) },
    { key: '_classe', label: 'Classe' },
    { key: '_cycle', label: 'Cycle' },
    { key: '_parent', label: 'Parent', render: r => r._parent || <span className="text-muted">— non lié</span> },
    { key: '_tel', label: 'Téléphone', hide: true },
    { key: 'gender', label: 'Genre', hide: true },
    { key: 'dob', label: 'Naissance', hide: true },
    { key: '_presence', label: 'Présence 30 j', value: r => r._presence ?? -1, render: r => r._presence == null ? <span className="text-muted">—</span> :
        <span className="font-bold" style={{color: r._presence >= 90 ? STATUS.ok : r._presence >= 75 ? STATUS.warn : STATUS.danger}}>{r._presence}%</span> },
    { key: '_impayes', label: 'Impayés', value: r => r._impayes, render: r => r._impayes === 0 ? <span style={{color:STATUS.ok}}>✓</span> :
        <span className="font-bold" style={{color:STATUS.danger}}>{r._impayes} mois</span> },
    { key: 'bloodGroup', label: 'Sang', hide: true },
  ]

  return (<>
    <PageHead title="Élèves" sub={`${rows.length} actifs · ${d.classes.length} classes${archived ? ` · ${archived} archivé(s)` : ''}`}
      action={canEdit&&<Btn onClick={()=>{setF(BLANK);setOpen(true)}}><UserPlus size={16}/> Inscrire un élève</Btn>}/>

    <DataTable
      columns={columns} rows={rows} csvName="eleves"
      searchPlaceholder="Rechercher un élève, un parent, une classe…"
      initialSort={{ key: 'name', dir: 1 }}
      onRow={r => navigate(`/app/eleve/${r.id}`)}
      empty={{ title: 'Aucun élève', sub: 'Inscrivez le premier élève ou ajustez les filtres.' }}
      toolbar={<div className="flex gap-2">
        <select aria-label="Filtrer par cycle" value={cycle} onChange={e=>{setCycle(e.target.value);setClasse('all')}}
          className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold">
          <option value="all">Tous les cycles</option>
          {[...new Set(d.classes.map(c=>c.cycle))].map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select aria-label="Filtrer par classe" value={classe} onChange={e=>setClasse(e.target.value)}
          className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold">
          <option value="all">Toutes les classes</option>
          {d.classes.filter(c=>cycle==='all'||c.cycle===cycle).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>}
      bulkActions={canEdit ? [{ label: 'Prévenir les parents', run: ids => {
        let sent = 0
        ids.forEach(sid => { const st = d.students.find(x => x.id === sid)
          if (st?.parentId) { notify({ to: st.parentId, kind: 'info', actor: u.name, title: 'Message de l\'école', body: 'La direction souhaite vous contacter — merci de passer ou d\'appeler l\'école.' }); sent++ } })
        toast.success(`${sent} parent(s) prévenu(s)`)
      } }] : []}
    />

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

  </>)
}
