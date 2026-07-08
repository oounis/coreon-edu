import { useState } from 'react'
import { db, mutate, uid, resetDb } from '../db.js'
import { PageHead, Card, StatCard, SectionCard, Avatar, IconTile, Btn, Modal, Field, Input, Select, EmptyState, STATUS } from '../components/ui.jsx'
import { Building2, Users, Wallet, Hourglass, KeyRound, Plus, Ban, Check, ShieldAlert, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

const PLAN_TINT={Pro:['#EEEBFF','#6C5CE7'],Essentiel:['#E4F7FE','#0BA5D8']}
const ST={active:{label:'Active',bg:'#E2FBF3',fg:STATUS.ok},trial:{label:"Période d'essai",bg:'#FFF4DD',fg:STATUS.warn},suspended:{label:'Suspendue',bg:'#EEF1F6',fg:STATUS.neutral}}
const BLANK={name:'',city:'Tunis',plan:'Essentiel',director:'',email:''}

// Console Kogia Group : les écoles clientes de la plateforme.
export default function Schools(){
  const [,force]=useState(0); const d=db()
  const [open,setOpen]=useState(false); const [f,setF]=useState(BLANK); const [confirmReset,setConfirmReset]=useState(false)
  const schools=d.schools||[]
  const count=s=>s.live?d.students.length:s.studentCount
  const totalStudents=schools.filter(s=>s.status!=='suspended').reduce((n,s)=>n+count(s),0)
  const mrr=schools.filter(s=>s.status==='active').reduce((n,s)=>n+s.price,0)
  const trials=schools.filter(s=>s.status==='trial').length
  const sadmin=d.users.find(u=>u.role==='schooladmin')

  const add=()=>{
    if(!f.name.trim()||!f.director.trim()||!f.email.trim()) return toast.error('Nom, directeur et e-mail requis')
    mutate(db=>{ db.schools.push({id:uid('sc'),name:f.name.trim(),city:f.city,plan:f.plan,price:f.plan==='Pro'?149:79,
      status:'trial',since:new Date().toISOString().slice(0,10),studentCount:0,director:f.director.trim(),email:f.email.trim()}) })
    toast.success(`${f.name} ajoutée — compte Direction créé et identifiants envoyés à ${f.email}`)
    setOpen(false); setF(BLANK); force(x=>x+1)
  }
  const toggle=(sc)=>{
    const now=sc.status==='suspended'?'active':'suspended'
    mutate(db=>{ const x=db.schools.find(y=>y.id===sc.id); if(x) x.status=now })
    toast.success(now==='suspended'?`${sc.name} suspendue — accès gelé`:`${sc.name} réactivée`)
    force(x=>x+1)
  }

  return (<>
    <PageHead title="Écoles clientes" sub="Les établissements abonnés à Kogia Edu — vous créez l'école et son compte Direction, l'école gère le reste."
      action={<Btn onClick={()=>{setF(BLANK);setOpen(true)}}><Plus size={16}/> Ajouter une école</Btn>}/>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <StatCard label="Écoles clientes" value={schools.filter(s=>s.status!=='suspended').length} tint="brand" icon={<Building2/>}/>
      <StatCard label="Élèves gérés" value={totalStudents} tint="sky" icon={<Users/>}/>
      <StatCard label="Revenu mensuel" value={`${mrr} DT`} sub="abonnements actifs" tint="mint" icon={<Wallet/>}/>
      <StatCard label="En essai" value={trials} tint="butter" icon={<Hourglass/>}/>
    </div>

    {schools.length===0 ? <Card><EmptyState icon={<Building2 size={26}/>} title="Aucune école cliente" sub="Ajoutez votre première école pour lui ouvrir l'accès à la plateforme."/></Card>
    : <div className="grid lg:grid-cols-2 gap-4">
      {schools.map(sc=>{ const st=ST[sc.status]||ST.active; const [pbg,pfg]=PLAN_TINT[sc.plan]||PLAN_TINT.Essentiel
        return (
        <SectionCard key={sc.id} headless className={sc.status==='suspended'?'opacity-70':''} bodyClass="p-5">
          <div className="flex items-start gap-4">
            <IconTile icon={<Building2 size={22}/>} tint={sc.live?'brand':'slate'} size={52}/>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-lg truncate">{sc.name}</span>
                {sc.live&&<span className="text-[10px] font-bold px-2 py-0.5 rounded-full accent-soft accent-text">ÉCOLE DE DÉMO</span>}
              </div>
              <div className="text-sm text-muted flex items-center gap-1.5"><MapPin size={13}/>{sc.city} · cliente depuis {sc.since}</div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{background:pbg,color:pfg}}>Plan {sc.plan} · {sc.price} DT/mois</span>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{background:st.bg,color:st.fg}}>{st.label}</span>
                <span className="text-xs text-muted">{count(sc)} élèves</span>
              </div>
            </div>
            <Btn size="sm" variant={sc.status==='suspended'?'primary':'danger'} onClick={()=>toggle(sc)}>
              {sc.status==='suspended'?<><Check size={14}/> Réactiver</>:<><Ban size={14}/> Suspendre</>}</Btn>
          </div>
          <div className="mt-4 rounded-2xl bg-canvas p-3.5">
            <div className="text-xs font-bold text-muted flex items-center gap-1.5 mb-2"><KeyRound size={13}/> Compte Direction (créé par la plateforme)</div>
            <div className="flex items-center gap-3">
              <Avatar name={sc.director} seed={sc.id} size={34}/>
              <div className="text-sm min-w-0"><b>{sc.director}</b>
                <div className="text-muted truncate">{sc.email}{sc.live&&sadmin?<> · mot de passe : <code>{sadmin.pw}</code></>:null}</div></div>
            </div>
          </div>
        </SectionCard>) })}
    </div>}

    <Card className="p-5 mt-5 border-coral/40">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h3 className="font-bold flex items-center gap-2 text-coral"><ShieldAlert size={17}/> Zone sensible</h3>
          <p className="text-sm text-muted mt-0.5">Réinitialiser remet toutes les données de démonstration à zéro.</p></div>
        <Btn variant="danger" onClick={()=>setConfirmReset(true)}>Réinitialiser les données de démo</Btn>
      </div>
    </Card>

    <Modal open={open} onClose={()=>setOpen(false)} title="Ajouter une école cliente"
      footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Annuler</Btn><Btn onClick={add}>Créer l'école & le compte Direction</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Nom de l'école *"><Input value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="École Les Oliviers"/></Field>
        <Field label="Ville"><Input value={f.city} onChange={e=>setF({...f,city:e.target.value})}/></Field>
        <Field label="Plan"><Select value={f.plan} onChange={e=>setF({...f,plan:e.target.value})}><option>Essentiel</option><option>Pro</option></Select></Field>
        <Field label="Directeur / Directrice *"><Input value={f.director} onChange={e=>setF({...f,director:e.target.value})}/></Field>
        <Field label="E-mail du compte Direction *"><Input value={f.email} onChange={e=>setF({...f,email:e.target.value})} placeholder="direction@ecole.tn"/></Field>
      </div>
      <p className="text-xs text-muted mt-3">L'école démarre en <b>période d'essai</b>. Le compte Direction reçoit ses identifiants et crée ensuite tous les autres comptes (Administration, Enseignant, Surveillant, Parent) dans son portail.</p>
    </Modal>

    <Modal open={confirmReset} onClose={()=>setConfirmReset(false)} title="Réinitialiser les données ?"
      footer={<><Btn variant="ghost" onClick={()=>setConfirmReset(false)}>Annuler</Btn>
        <Btn variant="danger" onClick={()=>{resetDb();location.reload()}}>Réinitialiser</Btn></>}>
      <p className="text-sm text-muted">Toutes les données de démonstration (élèves, évaluations, paiements, écoles clientes…) seront remises à zéro. Cette action est irréversible.</p>
    </Modal>
  </>)
}
