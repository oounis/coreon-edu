import { useState } from 'react'
import { current } from '../auth.js'
import { db, mutate, uid, userById } from '../db.js'
import { ROLE } from '../theme.js'
import { notify } from '../notify.js'
import { REQUEST_TYPES, REQUEST_LIST, LEGAL } from '../tunisia.js'
import { PageHead, Card, Btn, Modal, Field, Select, Textarea, Badge } from '../components/ui.jsx'
import { FileText, Plus, Printer, Check, X, ChevronRight } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function Requests(){
  const u=current(); const isStaff=['teacher','supervisor','admin'].includes(u.role)
  const [,force]=useState(0); const refresh=()=>force(x=>x+1)
  const [open,setOpen]=useState(false); const [doc,setDoc]=useState(null); const [decide,setDecide]=useState(null)
  const [f,setF]=useState({type:'Attestation de salaire',note:''}); const [comment,setComment]=useState('')
  const d=db()
  const mine=d.requests.filter(r=>r.by===u.id)
  const toDecide=d.requests.filter(r=>r.status==='pending' && r.chain[r.currentLevel]===u.role)
  const submit=()=>{ const def=REQUEST_TYPES[f.type]; const id=uid('req')
    mutate(db=>{db.requests.unshift({id,at:Date.now(),by:u.id,byName:u.name,type:f.type,note:f.note.trim(),chain:def.chain,currentLevel:0,approvals:[],status:'pending'})})
    notify({role:def.chain[0],kind:'request',actor:u.name,title:`nouvelle demande : ${f.type}`,body:f.note||f.type,link:'/app/requests'})
    toast.success('Demande envoyée pour validation'); setOpen(false); setF({type:'Attestation de salaire',note:''}); refresh() }
  const act=(r,decision)=>{
    mutate(db=>{ const req=db.requests.find(x=>x.id===r.id); if(!req)return
      req.approvals.push({role:u.role,by:u.name,decision,comment:comment.trim(),at:Date.now()})
      if(decision==='rejected'){ req.status='rejected' }
      else { req.currentLevel++; if(req.currentLevel>=req.chain.length) req.status='approved'; }
    })
    const req=db.requests.find(x=>x.id===r.id)
    if(decision==='rejected'){ notify({to:r.by,kind:'request',actor:u.name,title:'demande rejetée',body:`${r.type} — ${comment||'sans motif'}`,link:'/app/requests'}) }
    else if(req.status==='approved'){ notify({to:r.by,kind:'request',actor:'Administration',title:'demande approuvée ✓',body:`${r.type} — validée. Document disponible.`,link:'/app/requests'}) }
    else { notify({role:req.chain[req.currentLevel],kind:'request',actor:u.name,title:`validation requise : ${r.type}`,body:`De ${r.byName}`,link:'/app/requests'}); notify({to:r.by,kind:'request',actor:u.name,title:'demande validée (étape)',body:`${r.type} — en cours`,link:'/app/requests'}) }
    toast.success(decision==='approved'?'Validé':'Rejeté'); setDecide(null); setComment(''); refresh()
  }
  const Chain=({r})=>(
    <div className="flex items-center gap-1.5 flex-wrap mt-2">
      {r.chain.map((role,i)=>{ const ap=r.approvals[i]; const done=ap?.decision==='approved'; const rej=ap?.decision==='rejected'
        const state=rej?'rej':done?'ok':(i===r.currentLevel&&r.status==='pending')?'cur':'wait'
        const c={ok:'#2BD9A8',rej:'#FF6B81',cur:'#FFA62B',wait:'#C7CDDA'}[state]
        return (<span key={i} className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold px-2 py-1 rounded-full flex items-center gap-1" style={{background:c+'22',color:c}}>
            {done&&<Check size={11}/>}{rej&&<X size={11}/>} {ROLE[role]?.label}</span>
          {i<r.chain.length-1&&<ChevronRight size={12} className="text-muted"/>}
        </span>) })}
    </div>
  )
  return (<>
    <PageHead title="Demandes & validations" sub={isStaff?'Suivez vos demandes et leur circuit de validation.':'Validez les demandes du personnel.'}
      action={isStaff&&<Btn onClick={()=>setOpen(true)}><Plus size={16}/> Nouvelle demande</Btn>}/>

    {toDecide.length>0 && <div className="mb-6">
      <div className="text-xs font-bold uppercase text-muted mb-2">À valider ({toDecide.length})</div>
      <div className="space-y-3">{toDecide.map(r=>(
        <Card key={r.id} className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div><div className="font-semibold flex items-center gap-2"><FileText size={16} className="accent-text"/> {r.type}</div>
              <div className="text-sm text-muted">Par {r.byName} · {r.note}</div><Chain r={r}/></div>
            <div className="flex gap-2"><Btn variant="soft" onClick={()=>setDecide({r,d:'approved'})}><Check size={15}/> Approuver</Btn><Btn variant="ghost" onClick={()=>setDecide({r,d:'rejected'})}><X size={15}/> Rejeter</Btn></div>
          </div>
        </Card>))}</div>
    </div>}

    <div className="text-xs font-bold uppercase text-muted mb-2">{isStaff?'Mes demandes':'Toutes les demandes'}</div>
    <div className="space-y-3">
      {(isStaff?mine:d.requests).map(r=>{ const def=REQUEST_TYPES[r.type]||{}; return (
        <Card key={r.id} className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div><div className="font-semibold flex items-center gap-2"><FileText size={16} className="accent-text"/> {r.type} <Badge status={r.status}/></div>
              <div className="text-sm text-muted">{r.note||'—'} · par {r.byName} · {formatDistanceToNow(r.at,{addSuffix:true,locale:fr})}</div>
              <Chain r={r}/>
              {r.approvals.filter(a=>a.comment).map((a,i)=><div key={i} className="text-xs text-muted mt-1">💬 {a.by} ({ROLE[a.role]?.label}) : {a.comment}</div>)}
            </div>
            {r.status==='approved'&&def.doc&&<Btn variant="soft" onClick={()=>setDoc(r)}><Printer size={15}/> Attestation</Btn>}
          </div>
        </Card>) })}
      {(isStaff?mine:d.requests).length===0 && <Card className="p-10 text-center text-muted">Aucune demande.</Card>}
    </div>

    {/* new request */}
    <Modal open={open} onClose={()=>setOpen(false)} title="Nouvelle demande" footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Annuler</Btn><Btn onClick={submit}>Envoyer</Btn></>}>
      <div className="space-y-3">
        <Field label="Type de demande"><Select value={f.type} onChange={e=>setF({...f,type:e.target.value})}>{REQUEST_LIST.map(t=><option key={t}>{t}</option>)}</Select></Field>
        <div className="text-xs text-muted">Circuit : {REQUEST_TYPES[f.type].chain.map(r=>ROLE[r].label).join(' → ')}</div>
        <Field label="Motif / note"><Textarea value={f.note} onChange={e=>setF({...f,note:e.target.value})} className="h-20" placeholder="ex : pour une demande de crédit bancaire"/></Field>
      </div>
    </Modal>

    {/* decision */}
    <Modal open={!!decide} onClose={()=>setDecide(null)} title={decide?.d==='approved'?'Approuver la demande':'Rejeter la demande'}
      footer={<><Btn variant="ghost" onClick={()=>setDecide(null)}>Annuler</Btn><Btn onClick={()=>act(decide.r,decide.d)}>{decide?.d==='approved'?'Confirmer l\'approbation':'Confirmer le rejet'}</Btn></>}>
      <Field label="Commentaire (optionnel)"><Textarea value={comment} onChange={e=>setComment(e.target.value)} className="h-20"/></Field>
    </Modal>

    {/* attestation document */}
    <Modal open={!!doc} onClose={()=>setDoc(null)} title="Attestation" size="xl" footer={<><Btn variant="ghost" onClick={()=>setDoc(null)}>Fermer</Btn><Btn onClick={()=>window.print()}><Printer size={15}/> Imprimer</Btn></>}>
      {doc && <Attestation r={doc}/>}
    </Modal>
  </>)
}

function Attestation({ r }){
  const user=userById(r.by); const t=db().teachers.find(x=>x.id===user?.teacherId)
  const today=format(new Date(),'dd/MM/yyyy')
  const isSalary=r.type.includes('salaire')
  return (
    <div className="bg-white p-2 text-sm" id="attestation">
      <div className="flex items-center justify-between border-b-2 pb-3 mb-4" style={{borderColor:'#6C5CE7'}}>
        <div className="flex items-center gap-2"><svg viewBox="0 0 68 72" width="34" height="34"><defs><linearGradient id="al" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6C5CE7"/><stop offset="1" stopColor="#36C5F0"/></linearGradient></defs><path d="M34 62 C31 52 28 47 22 43 C15 38 10 31 7 22 C18 27 28 33 31 41 L34 46 L37 41 C40 33 50 27 61 22 C58 31 53 38 46 43 C40 47 37 52 34 62 Z" fill="url(#al)"/></svg>
          <div><div className="font-extrabold">École Al-Nour</div><div className="text-xs text-muted">Tunis, Tunisie · Tél : +216 71 000 000</div></div></div>
        <div className="text-xs text-right text-muted">Réf : {r.id.toUpperCase()}<br/>Tunis, le {today}</div>
      </div>
      <h2 className="text-center text-xl font-extrabold tracking-wide my-4 uppercase">{r.type}</h2>
      <p className="leading-7">Nous soussignés, la Direction de l'École Al-Nour, attestons que :</p>
      <div className="my-3 pl-4 border-l-2" style={{borderColor:'#EEEBFF'}}>
        <div><b>Nom & prénom :</b> {r.byName}</div>
        <div><b>Fonction :</b> {t?.designation||user?.position||'Enseignant'}</div>
        <div><b>CIN :</b> {user?.cin||t?.cin||'—'}</div>
        {isSalary&&<div><b>Salaire mensuel brut :</b> {t?.salary? t.salary+' DT':'—'}</div>}
      </div>
      <p className="leading-7">est employé(e) au sein de notre établissement. La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit{r.note?` (${r.note})`:''}.</p>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="text-xs text-muted">
          <b>Circuit de validation :</b>
          {r.approvals.map((a,i)=><div key={i}>✓ {ROLE[a.role]?.label} — {a.by} ({format(a.at,'dd/MM/yyyy')})</div>)}
        </div>
        <div className="text-center"><div className="h-12"></div><div className="border-t border-ink/30 pt-1 text-xs">Cachet & signature de la Direction</div></div>
      </div>
      <div className="text-[10px] text-muted mt-6 pt-2 border-t border-line">Document généré par Coreon Edu — données traitées conformément à la {LEGAL.law} (protection des données personnelles, INPDP).</div>
    </div>
  )
}
