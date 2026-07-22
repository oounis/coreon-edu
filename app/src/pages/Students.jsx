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
import { t } from '@core/i18n.js'
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

  const add=()=>{ if(!f.name.trim())return toast.error(t('Le nom est requis')); if(!f.consent)return toast.error(t('Veuillez accepter le consentement (loi 2004-63)'))
    let cid; mutate(db=>{ let cls=db.classes.find(c=>c.grade===f.grade && c.name.endsWith(' '+f.section))
      if(!cls){ cls={id:uid('c'),name:`${f.grade} ${f.section}`,grade:f.grade,cycle:cycleOf(f.grade)}; db.classes.push(cls) }
      cid=cls.id; const sid=uid('s')
      db.students.push({...f,id:sid,name:f.name.trim(),initials:f.name.trim().split(' ').map(w=>w[0]).slice(0,2).join(''),classId:cid,parentId:null})
      setStudentParent(db,sid,f.parentId||null)   // écrit aussi user.childIds
      db.payments[sid]=["Sep","Oct","Nov","Déc","Jan","Fév","Mar","Avr","Mai","Juin"].map(m=>({month:m,status:'due'})) })
    toast.success(t('Élève inscrit')); setOpen(false); setF(BLANK); refresh() }

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
    // Index locaux : sur une école pleine (120+ élèves), appeler classById/userById
    // par ligne rappelait db() (donc un JSON.parse du blob entier) des centaines de
    // fois par rendu — ~2 s d'attente. Une Map construite une fois : O(élèves).
    const classMap = new Map(d.classes.map(c => [c.id, c]))
    const userMap = new Map(d.users.map(u => [u.id, u]))
    return d.students.map(s => {
      const a = att[s.id]
      const cls = classMap.get(s.classId)
      const unpaid = (d.payments[s.id] || []).filter(m => m.status === 'due' || m.status === 'overdue').length
      return { ...s, _classe: cls?.name || '·', _cycle: cls?.cycle || '·',
        _parent: userMap.get(s.parentId)?.name || '', _tel: s.guardianPhone || s.phone || '',
        _presence: a ? Math.round(a.p / a.t * 100) : null, _impayes: unpaid,
        _allerg: s.allergies && s.allergies !== 'Aucune' ? s.allergies : '' }
    })
  })()
  const rows = enrich.filter(s =>
    (cycle === 'all' || s._cycle === cycle) && (classe === 'all' || s.classId === classe) && !s.archived)
  const archived = enrich.filter(s => s.archived).length

  const columns = [
    { key: 'name', label: t('Élève'), value: r => r.name, render: r => (
        <span className="flex items-center gap-2.5 min-w-[180px]"><Avatar name={r.name} seed={r.id} size={30}/>
          <span className="font-semibold">{r.name}</span>
          {r._allerg && <span title={`${t('Allergie :')} ${r._allerg}`} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{background:STATUS.warnSoft,color:STATUS.warn}}>{t('ALLERGIE')}</span>}</span>) },
    { key: '_classe', label: t('Classe') },
    { key: '_cycle', label: t('Cycle') },
    { key: '_parent', label: t('Parent'), render: r => r._parent || <span className="text-muted">{t('non lié')}</span> },
    { key: '_tel', label: t('Téléphone'), hide: true },
    { key: 'gender', label: t('Genre'), hide: true },
    { key: 'dob', label: t('Naissance'), hide: true },
    { key: '_presence', label: t('Présence 30 j'), value: r => r._presence ?? -1, render: r => r._presence == null ? <span className="text-muted"> </span> :
        <span className="font-bold" style={{color: r._presence >= 90 ? STATUS.ok : r._presence >= 75 ? STATUS.warn : STATUS.danger}}>{r._presence}%</span> },
    { key: '_impayes', label: t('Impayés'), value: r => r._impayes, render: r => r._impayes === 0 ? <span style={{color:STATUS.ok}}>✓</span> :
        <span className="font-bold" style={{color:STATUS.danger}}>{r._impayes} {t('mois')}</span> },
    { key: 'bloodGroup', label: t('Sang'), hide: true },
  ]

  return (<>
    <PageHead title={t('Élèves')} sub={`${rows.length} ${t('actifs')} · ${d.classes.length} ${t('classes')}${archived ? ` · ${archived} ${t('archivé(s)')}` : ''}`}
      action={canEdit&&<Btn onClick={()=>{setF(BLANK);setOpen(true)}}><UserPlus size={16}/> {t('Inscrire un élève')}</Btn>}/>

    <DataTable
      columns={columns} rows={rows} csvName="eleves"
      searchPlaceholder={t('Rechercher un élève, un parent, une classe…')}
      initialSort={{ key: 'name', dir: 1 }}
      onRow={r => navigate(`/app/eleve/${r.id}`)}
      empty={{ title: t('Aucun élève'), sub: t('Inscrivez le premier élève ou ajustez les filtres.') }}
      toolbar={<div className="flex gap-2">
        <select aria-label={t('Filtrer par cycle')} value={cycle} onChange={e=>{setCycle(e.target.value);setClasse('all')}}
          className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold">
          <option value="all">{t('Tous les cycles')}</option>
          {[...new Set(d.classes.map(c=>c.cycle))].map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select aria-label={t('Filtrer par classe')} value={classe} onChange={e=>setClasse(e.target.value)}
          className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold">
          <option value="all">{t('Toutes les classes')}</option>
          {d.classes.filter(c=>cycle==='all'||c.cycle===cycle).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>}
      bulkActions={canEdit ? [{ label: t('Prévenir les parents'), run: ids => {
        let sent = 0
        ids.forEach(sid => { const st = d.students.find(x => x.id === sid)
          if (st?.parentId) { notify({ to: st.parentId, kind: 'info', actor: u.name, title: t('Message de l\'école'), body: t('La direction souhaite vous contacter : merci de passer ou d\'appeler l\'école.') }); sent++ } })
        toast.success(`${sent} ${t('parent(s) prévenu(s)')}`)
      } }] : []}
    />

    <Modal open={open} onClose={()=>setOpen(false)} title={t('Inscrire un nouvel élève')} size="2xl" footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>{t('Annuler')}</Btn><Btn onClick={add}>{t('Inscrire')}</Btn></>}>
      <Section title={t('Informations personnelles')}>
        <Field label={t('Nom complet *')}><Input value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Amira Ben Salah"/></Field>
        <Field label={t('Genre')}><Select value={f.gender} onChange={e=>setF({...f,gender:e.target.value})}><option>{t('Garçon')}</option><option>{t('Fille')}</option></Select></Field>
        <Field label={t('Date de naissance')}><Input type="date" value={f.dob} onChange={e=>setF({...f,dob:e.target.value})}/></Field>
        <Field label={t('Groupe sanguin')}><Select value={f.bloodGroup} onChange={e=>setF({...f,bloodGroup:e.target.value})}>{['O+','O-','A+','A-','B+','B-','AB+','AB-'].map(b=><option key={b}>{b}</option>)}</Select></Field>
        <Field label={t('Nationalité')}><Input value={f.nationality} onChange={e=>setF({...f,nationality:e.target.value})}/></Field>
      </Section>
      <Section title={t('Scolarité')}>
        <Field label={t('Niveau')}><Select value={f.grade} onChange={e=>setF({...f,grade:e.target.value})}>{CYCLES.map(c=><optgroup key={c.cycle} label={c.cycle}>{c.grades.map(g=><option key={g} value={g}>{g}</option>)}</optgroup>)}</Select></Field>
        <Field label={t('Section')}><Select value={f.section} onChange={e=>setF({...f,section:e.target.value})}>{['A','B','C','D'].map(s=><option key={s}>{s}</option>)}</Select></Field>
        <Field label={t('N° d\'inscription')}><Input value={f.rollNo} onChange={e=>setF({...f,rollNo:e.target.value})}/></Field>
        <Field label={t('Date d\'inscription')}><Input type="date" value={f.admissionDate} onChange={e=>setF({...f,admissionDate:e.target.value})}/></Field>
        <Field label={t('École précédente')}><Input value={f.prevSchool} onChange={e=>setF({...f,prevSchool:e.target.value})}/></Field>
        <Field label={t('N° acte de naissance')}><Input value={f.cin} onChange={e=>setF({...f,cin:e.target.value})} placeholder="ACTE-..."/></Field>
        <Field label={t('Gouvernorat')}><Select value={f.governorate} onChange={e=>setF({...f,governorate:e.target.value})}>{GOVERNORATES.map(g=><option key={g}>{g}</option>)}</Select></Field>
      </Section>
      <Section title={t('Tuteur / parent')}>
        <Field label={t('Nom du père')}><Input value={f.fatherName} onChange={e=>setF({...f,fatherName:e.target.value})}/></Field>
        <Field label={t('Nom de la mère')}><Input value={f.motherName} onChange={e=>setF({...f,motherName:e.target.value})}/></Field>
        <Field label={t('Téléphone tuteur')}><Input value={f.guardianPhone} onChange={e=>setF({...f,guardianPhone:e.target.value})}/></Field>
        <Field label={t('Lier à un compte parent')}><Select value={f.parentId} onChange={e=>setF({...f,parentId:e.target.value})}><option value="">{t(', aucun')}</option>{parents.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
      </Section>
      <Section title={t('Contact & adresse')}>
        <Field label={t('Téléphone')}><Input value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></Field>
        <Field label={t('E-mail')}><Input value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></Field>
        <Field label={t('Adresse')}><Input value={f.address} onChange={e=>setF({...f,address:e.target.value})}/></Field>
      </Section>
      <Section title={t('Médical & urgence')}>
        <Field label={t('Conditions médicales')}><Input value={f.medical} onChange={e=>setF({...f,medical:e.target.value})}/></Field>
        <Field label={t('Allergies')}><Input value={f.allergies} onChange={e=>setF({...f,allergies:e.target.value})}/></Field>
        <Field label={t('Contact d\'urgence')}><Input value={f.emergencyName} onChange={e=>setF({...f,emergencyName:e.target.value})}/></Field>
        <Field label={t('Téléphone d\'urgence')}><Input value={f.emergencyPhone} onChange={e=>setF({...f,emergencyPhone:e.target.value})}/></Field>
      </Section>
      <div className="mb-3"><div className="text-xs font-bold uppercase tracking-wide accent-text mb-2">{t('Pièces à fournir')}</div>
        <Attach types={DOC_TYPES.student} value={f.attachments} onChange={a=>setF({...f,attachments:a})}/></div>
      <label className="flex items-start gap-2 text-xs text-muted bg-canvas rounded-xl p-3"><input type="checkbox" checked={f.consent} onChange={e=>setF({...f,consent:e.target.checked})} className="mt-0.5"/><span><ShieldCheck size={13} className="inline accent-text"/> {LEGAL.consent}</span></label>
    </Modal>

  </>)
}
