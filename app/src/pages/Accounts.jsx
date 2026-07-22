// ════════════════════════════════════════════════════════════════════════════
// COMPTES — l'« Active Directory » de l'école, aux mains de la Direction.
// La plateforme livre UN compte Direction ; tout le reste se crée, se modifie,
// se rattache et se désactive ICI. Le cœur (accounts.js) tient les règles :
// un e-mail un compte, le dernier compte Direction est intouchable, on ne
// supprime jamais — on désactive.
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { db } from '@core/db.js'
import { ROLE } from '@core/theme.js'
import { notify } from '@core/notify.js'
import { t } from '@core/i18n.js'
import { createAccount, updateAccount, setDisabled, resetPassword, directory, MANAGEABLE_ROLES } from '@core/accounts.js'
import { STAFF_POSITIONS, GOVERNORATES, docTypesFor, validCIN } from '@core/tunisia.js'
import { PageHead, Avatar, Btn, Modal, Field, Input, Select, Section, SearchInput, STATUS } from '../components/ui.jsx'
import Attach from '../components/Attach.jsx'
import { UserPlus, KeyRound, Ban, Check, Paperclip, Pencil, Users } from 'lucide-react'
import toast from 'react-hot-toast'

// Civilité ADULTE : « Homme »/« Femme » — les activités réservées aux mères ou aux
// pères (social.js) comparent user.gender à ces valeurs.
const BLANK={role:'teacher',name:'',email:'',pw:'',cin:'',gender:'Homme',governorate:'Tunis',position:'Instituteur',phone:'',address:'',occupation:'',subject:'',childIds:[],attachments:[]}

export default function Accounts(){
  const [,force]=useState(0); const refresh=()=>force(x=>x+1)
  const [open,setOpen]=useState(false); const [view,setView]=useState(null); const [edit,setEdit]=useState(null)
  const [f,setF]=useState(BLANK); const [q,setQ]=useState('')
  const d=db(); const dir=directory()
  const query=q.trim().toLowerCase()
  const match=u=>!query||u.name.toLowerCase().includes(query)||String(u.email||'').toLowerCase().includes(query)

  const create=()=>{
    if(f.cin && !validCIN(f.cin))return toast.error(t('CIN invalide (8 chiffres)'))
    const r=createAccount(f)
    if(r.error)return toast.error(r.error)
    notify({to:r.user.id,email:true,kind:'info',actor:t('Direction'),title:t('compte créé'),body:`${t('Bienvenue · rôle')} ${ROLE[f.role].label}.`,link:'/app'})
    toast.success(`${t('Compte')} ${ROLE[f.role].label} ${t('créé')}`); setOpen(false); setF(BLANK); refresh()
  }
  const saveEdit=()=>{
    const patch={...edit}
    if(!patch.subject) delete patch.subject   // vide = « inchangée », jamais un effacement
    const r=updateAccount(patch.id,patch)
    if(r.error)return toast.error(r.error)
    toast.success(t('Compte mis à jour')); setEdit(null); setView(r.user); refresh()
  }
  const resetPw=(usr)=>{
    const r=resetPassword(usr.id)
    if(r.error)return toast.error(r.error)
    notify({to:usr.id,email:true,kind:'info',actor:t('Direction'),title:t('mot de passe réinitialisé'),body:t('Un nouveau mot de passe temporaire vous a été attribué.')})
    toast.success(`${t('Nouveau mot de passe :')} ${r.pw}`); refresh()
  }
  const toggleActive=(usr)=>{
    const r=setDisabled(usr.id,!usr.disabled)
    if(r.error)return toast.error(r.error)
    toast.success(usr.disabled?t('Compte réactivé'):t('Compte désactivé'))
    setView({...usr,disabled:!usr.disabled}); refresh()
  }
  const toggleChild=(setter)=>sid=>setter(p=>({...p,childIds:(p.childIds||[]).includes(sid)?p.childIds.filter(x=>x!==sid):[...(p.childIds||[]),sid]}))
  const isStaff=['schooladmin','admin','teacher','supervisor','security'].includes(f.role)

  const ChildPicker=({value=[],onToggle})=>(
    <div className="flex flex-wrap gap-2">{d.students.filter(s=>!s.archived).map(s=>{ const taken=s.parentId&&!value.includes(s.id)
      return <button key={s.id} onClick={()=>onToggle(s.id)} title={taken?`${t('Déjà lié à')} ${d.users.find(x=>x.id===s.parentId)?.name||t('un autre parent')} ${t('le relier ici le détachera')}`:undefined}
        className={`text-sm px-3 py-1.5 rounded-full border ${value.includes(s.id)?'accent-soft accent-text':taken?'border-line opacity-55':'border-line'}`}>{s.name}{taken&&' ·'}</button> })}</div>)

  return (<>
    <PageHead title={t('Comptes & personnel')} sub={t("L'annuaire de l'école : la Direction crée, modifie, rattache et désactive tous les accès.")}
      action={<div className="flex items-center gap-2">
        <SearchInput value={q} onChange={e=>setQ(e.target.value)} placeholder={t('Rechercher un compte…')} className="w-56"/>
        <Btn onClick={()=>{setF(BLANK);setOpen(true)}}><UserPlus size={16}/> {t('Créer un compte')}</Btn>
      </div>}/>

    {/* L'annuaire d'un coup d'œil — chaque pastille mène à sa section. */}
    <div className="card p-3 mb-5 flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-1.5 text-sm font-bold px-2"><Users size={15} className="text-muted"/> {dir.total} {t('comptes')}</span>
      {dir.rows.map(r=>(
        <a key={r.role} href={`#role-${r.role}`} className="text-[13px] font-semibold px-3 py-1.5 rounded-full border border-line hover:bg-canvas inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{background:ROLE[r.role].color}}/>{ROLE[r.role].label} <b>{r.active}</b>
          {r.disabled>0&&<span className="text-muted"> {r.disabled} {t('désactivé(s)')}</span>}
        </a>))}
    </div>

    <div className="space-y-6">
      {MANAGEABLE_ROLES.filter(r=>d.users.some(u=>u.role===r&&match(u))).map(r=>{const R=ROLE[r];const us=d.users.filter(u=>u.role===r&&match(u));return(
        <div key={r} id={`role-${r}`}>
          <div className="flex items-center gap-2 mb-3"><span className="w-2.5 h-2.5 rounded-full" style={{background:R.color}}/><h2 className="font-bold">{R.label}</h2><span className="text-xs text-muted"> {us.length} {t('compte(s)')}</span></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {us.map(u=>(
              <button key={u.id} onClick={()=>setView(u)} className={`card p-4 flex items-center gap-3 text-left hover:shadow-lg hover:-translate-y-0.5 transition w-full ${u.disabled?'opacity-60':''}`}>
                <Avatar name={u.name} seed={u.id} size={44} className={u.disabled?'opacity-50':''}/>
                <div className="min-w-0 flex-1"><div className="font-semibold truncate flex items-center gap-2">{u.name}{u.disabled&&<span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-canvas text-muted">{t('Désactivé')}</span>}</div><div className="text-xs text-muted truncate">{u.position||u.occupation||u.email}</div></div>
                {(u.attachments||[]).length>0&&<span className="inline-flex items-center gap-0.5 text-[12px] text-muted shrink-0"><Paperclip size={11}/>{u.attachments.length}</span>}
              </button>
            ))}
          </div>
        </div>
      )})}
    </div>

    {/* ── Créer ── */}
    <Modal open={open} onClose={()=>setOpen(false)} title={t('Créer un compte / profil')} size="2xl" footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>{t('Annuler')}</Btn><Btn onClick={create}>{t('Créer le compte')}</Btn></>}>
      <Section title={t('Compte')}>
        <Field label={t('Rôle')}><Select value={f.role} onChange={e=>setF({...f,role:e.target.value})}>{MANAGEABLE_ROLES.map(r=><option key={r} value={r}>{ROLE[r].label}</option>)}</Select></Field>
        <Field label={t('Nom complet *')}><Input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></Field>
        <Field label={t('E-mail *')}><Input value={f.email} onChange={e=>setF({...f,email:e.target.value})} placeholder="nom@alnour.tn"/></Field>
        <Field label={t('Mot de passe temporaire')}><Input value={f.pw} onChange={e=>setF({...f,pw:e.target.value})} placeholder={t('défaut 1234')}/></Field>
      </Section>
      <Section title={t('Identité (Tunisie)')}>
        <Field label={t('CIN (8 chiffres)')}><Input value={f.cin} onChange={e=>setF({...f,cin:e.target.value})} placeholder="12345678" maxLength={8}/></Field>
        <Field label={t('Civilité')}><Select value={f.gender} onChange={e=>setF({...f,gender:e.target.value})}><option value="Homme">{t('Homme')}</option><option value="Femme">{t('Femme')}</option></Select></Field>
        <Field label={t('Gouvernorat')}><Select value={f.governorate} onChange={e=>setF({...f,governorate:e.target.value})}>{GOVERNORATES.map(g=><option key={g}>{g}</option>)}</Select></Field>
      </Section>
      {isStaff && <Section title={t('Fonction')} cols={2}>
        <Field label={t('Poste / fonction')}><Select value={f.position} onChange={e=>setF({...f,position:e.target.value})}>{STAFF_POSITIONS.map(g=><optgroup key={g.group} label={g.group}>{g.items.map(p=><option key={p}>{p}</option>)}</optgroup>)}</Select></Field>
        {f.role==='teacher'&&<Field label={t('Matière')}><Input value={f.subject} onChange={e=>setF({...f,subject:e.target.value})} placeholder={t('Mathématiques')}/></Field>}
      </Section>}
      <Section title={t('Contact')}><Field label={t('Téléphone')}><Input value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></Field><Field label={t('Adresse')}><Input value={f.address} onChange={e=>setF({...f,address:e.target.value})}/></Field>
        {f.role==='parent'&&<Field label={t('Profession')}><Input value={f.occupation} onChange={e=>setF({...f,occupation:e.target.value})}/></Field>}</Section>
      {f.role==='parent'&&<div className="mb-4"><div className="text-xs font-bold uppercase tracking-wide accent-text mb-2">{t('Enfants')}</div>
        <ChildPicker value={f.childIds} onToggle={toggleChild(setF)}/></div>}
      <div className="mb-2"><div className="text-xs font-bold uppercase tracking-wide accent-text mb-2">{t('Pièces à fournir')}</div>
        <Attach types={docTypesFor(f.role)} value={f.attachments} onChange={a=>setF({...f,attachments:a})}/></div>
    </Modal>

    {/* ── Profil ── */}
    <Modal open={!!view} onClose={()=>setView(null)} title={t('Profil')} size="xl">
      {view&&(<div><div className="flex items-center gap-4 mb-4"><Avatar name={view.name} seed={view.id} size={56}/><div><div className="text-xl font-extrabold">{view.name}</div><div className="text-muted text-sm">{ROLE[view.role]?.label}{view.position&&` · ${view.position}`}</div></div></div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">{[[t('E-mail'),view.email],[t('CIN'),view.cin],[t('Gouvernorat'),view.governorate],[t('Téléphone'),view.phone],[t('Adresse'),view.address],[t('Profession'),view.occupation]].filter(x=>x[1]).map(([k,v])=><div key={k} className="flex justify-between border-b border-line py-1.5"><span className="text-muted">{k}</span><span className="font-medium">{v}</span></div>)}</div>
        <div className="text-xs font-bold uppercase text-muted mb-2">{t('Pièces jointes')}</div>
        {(view.attachments||[]).length? <div className="space-y-1">{view.attachments.map((a,i)=><div key={i} className="flex justify-between text-sm border border-line rounded-lg px-3 py-1.5"><span className="text-muted">{a.type}</span><span className="font-medium inline-flex items-center gap-1.5"><Paperclip size={13} className="text-muted"/>{a.name}</span></div>)}</div> : <div className="text-sm text-muted">{t('Aucune pièce.')}</div>}
        {view.role!=='owner' && <div className="mt-5 pt-4 border-t border-line flex flex-wrap gap-2 items-center">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${view.disabled?'bg-canvas text-muted':''}`} style={view.disabled?{}:{background:STATUS.okSoft,color:STATUS.ok}}>{view.disabled? '● '+t('Désactivé') : '● '+t('Actif')}</span>
          <div className="flex-1"/>
          <Btn variant="ghost" onClick={()=>{setEdit({id:view.id,name:view.name,email:view.email,phone:view.phone||'',role:view.role,position:view.position||'',subject:'',occupation:view.occupation||'',childIds:view.childIds||[]});setView(null)}}><Pencil size={15}/> {t('Modifier')}</Btn>
          <Btn variant="ghost" onClick={()=>resetPw(view)}><KeyRound size={15}/> {t('Réinitialiser le mot de passe')}</Btn>
          {view.disabled? <Btn onClick={()=>toggleActive(view)}><Check size={15}/> {t('Réactiver')}</Btn> : <Btn variant="danger" onClick={()=>toggleActive(view)}><Ban size={15}/> {t('Désactiver')}</Btn>}
        </div>}
      </div>)}
    </Modal>

    {/* ── Modifier : identité, contact, RÔLE, enfants ── */}
    <Modal open={!!edit} onClose={()=>setEdit(null)} title={t('Modifier le compte')} size="xl"
      footer={<><Btn variant="ghost" onClick={()=>setEdit(null)}>{t('Annuler')}</Btn><Btn onClick={saveEdit}>{t('Enregistrer')}</Btn></>}>
      {edit&&<>
        <Section title={t('Compte')}>
          <Field label={t('Nom complet')}><Input value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})}/></Field>
          <Field label={t('E-mail')}><Input value={edit.email} onChange={e=>setEdit({...edit,email:e.target.value})}/></Field>
          <Field label={t('Rôle')} hint={t('Le dernier compte Direction actif ne peut pas être rétrogradé.')}>
            <Select value={edit.role} onChange={e=>setEdit({...edit,role:e.target.value})}>{MANAGEABLE_ROLES.map(r=><option key={r} value={r}>{ROLE[r].label}</option>)}</Select></Field>
          <Field label={t('Téléphone')}><Input value={edit.phone} onChange={e=>setEdit({...edit,phone:e.target.value})}/></Field>
        </Section>
        {edit.role!=='parent'&&<Section title={t('Fonction')} cols={2}>
          <Field label={t('Poste / fonction')}><Select value={edit.position} onChange={e=>setEdit({...edit,position:e.target.value})}>{STAFF_POSITIONS.map(g=><optgroup key={g.group} label={g.group}>{g.items.map(p=><option key={p}>{p}</option>)}</optgroup>)}</Select></Field>
          <Field label={t('Matière (enseignant)')}><Input value={edit.subject} onChange={e=>setEdit({...edit,subject:e.target.value})} placeholder={t('Inchangée si vide')}/></Field>
        </Section>}
        {edit.role==='parent'&&<div className="mb-2"><div className="text-xs font-bold uppercase tracking-wide accent-text mb-2">{t('Enfants rattachés')}</div>
          <ChildPicker value={edit.childIds} onToggle={toggleChild(setEdit)}/></div>}
      </>}
    </Modal>
  </>)
}
