import { useState } from 'react'
import { current } from '../auth.js'
import { db, mutate, uid, userById, studentById, classById } from '../db.js'
import { ROLE } from '../theme.js'
import { notify } from '../notify.js'
import { REQUEST_DEFS, typesForRole, LEGAL } from '../tunisia.js'
import { PageHead, Card, Btn, Modal, Field, Input, Select, Textarea, Badge } from '../components/ui.jsx'
import { FileText, Plus, Printer, Check, X, ChevronRight, Paperclip } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

const defaults=type=>{ const o={}; (REQUEST_DEFS[type]?.fields||[]).forEach(f=>{ o[f.k]= f.t==='checkbox'?false : (f.def||'') }); return o }

export default function Requests(){
  const u=current(); const myTypes=typesForRole(u.role); const canRaise=myTypes.length>0
  const [,force]=useState(0); const refresh=()=>force(x=>x+1)
  const [open,setOpen]=useState(false); const [docR,setDocR]=useState(null); const [decide,setDecide]=useState(null)
  const [type,setType]=useState(myTypes[0]||''); const [vals,setVals]=useState(defaults(myTypes[0]))
  const [comment,setComment]=useState('')
  const d=db()
  const mine=d.requests.filter(r=>r.by===u.id)
  const toDecide=d.requests.filter(r=>r.status==='pending' && r.chain[r.currentLevel]===u.role)
  const def=REQUEST_DEFS[type]||{fields:[]}
  const setType2=t=>{ setType(t); setVals(defaults(t)) }
  const childOptions=(u.childIds||[]).map(id=>studentById(id)).filter(Boolean)

  const submit=()=>{
    for(const f of def.fields){ if(f.req && !vals[f.k]) return toast.error(`Champ requis : ${f.l}`) }
    const id=uid('req')
    mutate(db=>{db.requests.unshift({id,at:Date.now(),by:u.id,byName:u.name,type,fields:vals,chain:def.chain,currentLevel:0,approvals:[],status:'pending'})})
    notify({role:def.chain[0],kind:'request',actor:u.name,title:`nouvelle demande : ${type}`,body:def.fields[0]?`${def.fields[0].l}: ${vals[def.fields[0].k]}`:'',link:'/app/requests'})
    toast.success('Demande envoyée pour validation'); setOpen(false); setType2(myTypes[0]); refresh()
  }
  const act=(r,decision)=>{
    const fresh=db().requests.find(x=>x.id===r.id)
    if(!fresh || fresh.status!=='pending' || fresh.chain[fresh.currentLevel]!==u.role){ setDecide(null); setComment(''); return }
    mutate(db=>{ const req=db.requests.find(x=>x.id===r.id)
      req.approvals.push({role:u.role,by:u.name,decision,comment:comment.trim(),at:Date.now()})
      if(decision==='rejected') req.status='rejected'
      else { req.currentLevel++; if(req.currentLevel>=req.chain.length) req.status='approved' }
    })
    const req=db().requests.find(x=>x.id===r.id)
    if(decision==='rejected') notify({to:r.by,kind:'request',actor:u.name,title:'demande rejetée',body:`${r.type} — ${comment||'sans motif'}`,link:'/app/requests'})
    else if(req.status==='approved') notify({to:r.by,kind:'request',actor:'Administration',title:'demande approuvée ✓',body:`${r.type} — validée${REQUEST_DEFS[r.type]?.doc?', document disponible':''}.`,link:'/app/requests'})
    else { notify({role:req.chain[req.currentLevel],kind:'request',actor:u.name,title:`validation requise : ${r.type}`,body:`De ${r.byName}`,link:'/app/requests'}); notify({to:r.by,kind:'request',actor:u.name,title:'demande validée (étape)',body:`${r.type} — en cours`,link:'/app/requests'}) }
    toast.success(decision==='approved'?'Validé':'Rejeté'); setDecide(null); setComment(''); refresh()
  }
  const valueLabel=(r,f)=>{ const v=r.fields?.[f.k]; if(v===''||v==null||v===false)return null
    if(f.t==='checkbox')return '✓'; if(f.t==='child')return studentById(v)?.name||v; if(f.t==='attach')return '📎 '+v; return String(v) }

  const Chain=({r})=>(<div className="flex items-center gap-1.5 flex-wrap mt-2">
    {r.chain.map((role,i)=>{ const ap=r.approvals[i]; const done=ap?.decision==='approved',rej=ap?.decision==='rejected'
      const st=rej?'rej':done?'ok':(i===r.currentLevel&&r.status==='pending')?'cur':'wait'; const c={ok:'#2BD9A8',rej:'#FF6B81',cur:'#FFA62B',wait:'#C7CDDA'}[st]
      return <span key={i} className="flex items-center gap-1.5"><span className="text-[11px] font-bold px-2 py-1 rounded-full flex items-center gap-1" style={{background:c+'22',color:c}}>{done&&<Check size={11}/>}{rej&&<X size={11}/>} {ROLE[role]?.label}</span>{i<r.chain.length-1&&<ChevronRight size={12} className="text-muted"/>}</span> })}
  </div>)
  const Fields=({r})=>{ const fs=REQUEST_DEFS[r.type]?.fields||[]; return (
    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2 text-xs text-muted">
      {fs.map(f=>{ const v=valueLabel(r,f); return v? <span key={f.k}><b className="text-ink">{f.l}:</b> {v}</span> : null })}
    </div>) }

  return (<>
    <PageHead title="Demandes & validations" sub={canRaise?'Déposez une demande détaillée et suivez son circuit de validation.':'Validez les demandes reçues.'}
      action={canRaise&&<Btn onClick={()=>{setType2(myTypes[0]);setOpen(true)}}><Plus size={16}/> Nouvelle demande</Btn>}/>

    {toDecide.length>0 && <div className="mb-6"><div className="text-xs font-bold uppercase text-muted mb-2">À valider ({toDecide.length})</div>
      <div className="space-y-3">{toDecide.map(r=>(
        <Card key={r.id} className="p-4"><div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0"><div className="font-semibold flex items-center gap-2"><FileText size={16} className="accent-text"/> {r.type} <span className="text-xs text-muted">· {r.byName}</span></div><Fields r={r}/><Chain r={r}/></div>
          <div className="flex gap-2 shrink-0"><Btn variant="soft" onClick={()=>setDecide({r,d:'approved'})}><Check size={15}/> Approuver</Btn><Btn variant="ghost" onClick={()=>setDecide({r,d:'rejected'})}><X size={15}/> Rejeter</Btn></div>
        </div></Card>))}</div></div>}

    <div className="text-xs font-bold uppercase text-muted mb-2">{canRaise?'Mes demandes':'Toutes les demandes'}</div>
    <div className="space-y-3">
      {(canRaise?mine:d.requests).map(r=>{ const rd=REQUEST_DEFS[r.type]||{}; return (
        <Card key={r.id} className="p-4"><div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0"><div className="font-semibold flex items-center gap-2"><FileText size={16} className="accent-text"/> {r.type} <Badge status={r.status}/></div>
            <div className="text-xs text-muted mt-0.5">par {r.byName} · {formatDistanceToNow(r.at,{addSuffix:true,locale:fr})}</div><Fields r={r}/><Chain r={r}/>
            {r.approvals.filter(a=>a.comment).map((a,i)=><div key={i} className="text-xs text-muted mt-1">💬 {a.by} ({ROLE[a.role]?.label}) : {a.comment}</div>)}
          </div>
          {r.status==='approved'&&rd.doc&&<Btn variant="soft" onClick={()=>setDocR(r)}><Printer size={15}/> Document</Btn>}
        </div></Card>) })}
      {(canRaise?mine:d.requests).length===0 && <Card className="p-10 text-center text-muted">Aucune demande.</Card>}
    </div>

    {/* dynamic new-request form */}
    <Modal open={open} onClose={()=>setOpen(false)} title="Nouvelle demande" size="xl" footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Annuler</Btn><Btn onClick={submit}>Envoyer</Btn></>}>
      <Field label="Type de demande"><Select value={type} onChange={e=>setType2(e.target.value)}>{myTypes.map(t=><option key={t}>{t}</option>)}</Select></Field>
      <div className="text-xs text-muted my-2">Circuit : {def.chain?.map(r=>ROLE[r].label).join(' → ')}</div>
      {def.note&&<div className="text-xs bg-canvas rounded-xl p-2 mb-3 text-muted">ℹ️ {def.note}</div>}
      <div className="grid sm:grid-cols-2 gap-3">
        {def.fields.map(f=>(
          <div key={f.k} className={f.t==='textarea'||f.t==='checkbox'?'sm:col-span-2':''}>
            {f.t==='checkbox'
              ? <label className="flex items-center gap-2 text-sm bg-canvas rounded-xl p-3"><input type="checkbox" checked={!!vals[f.k]} onChange={e=>setVals({...vals,[f.k]:e.target.checked})}/> {f.l}</label>
              : <Field label={f.l+(f.req?' *':'')}>
                  {f.t==='select'? <Select value={vals[f.k]||''} onChange={e=>setVals({...vals,[f.k]:e.target.value})}><option value="">—</option>{f.o.map(o=><option key={o}>{o}</option>)}</Select>
                  : f.t==='child'? <Select value={vals[f.k]||''} onChange={e=>setVals({...vals,[f.k]:e.target.value})}><option value="">—</option>{childOptions.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Select>
                  : f.t==='textarea'? <Textarea value={vals[f.k]||''} onChange={e=>setVals({...vals,[f.k]:e.target.value})} className="h-20"/>
                  : f.t==='attach'? <label className="flex items-center gap-2 text-sm border border-line rounded-xl px-3 py-2.5 cursor-pointer"><Paperclip size={14} className="text-muted"/>{vals[f.k]||'Joindre un fichier'}<input type="file" className="hidden" onChange={e=>setVals({...vals,[f.k]:e.target.files?.[0]?.name||''})}/></label>
                  : <Input type={f.t==='number'?'number':f.t==='date'?'date':f.t==='time'?'time':'text'} value={vals[f.k]||''} onChange={e=>setVals({...vals,[f.k]:e.target.value})}/>}
                </Field>}
          </div>
        ))}
      </div>
    </Modal>

    {/* decision */}
    <Modal open={!!decide} onClose={()=>setDecide(null)} title={decide?.d==='approved'?'Approuver la demande':'Rejeter la demande'}
      footer={<><Btn variant="ghost" onClick={()=>setDecide(null)}>Annuler</Btn><Btn onClick={()=>act(decide.r,decide.d)}>{decide?.d==='approved'?"Confirmer l'approbation":'Confirmer le rejet'}</Btn></>}>
      <Field label="Commentaire (optionnel)"><Textarea value={comment} onChange={e=>setComment(e.target.value)} className="h-20"/></Field>
    </Modal>

    {/* document */}
    <Modal open={!!docR} onClose={()=>setDocR(null)} title="Document officiel" size="xl" footer={<><Btn variant="ghost" onClick={()=>setDocR(null)}>Fermer</Btn><Btn onClick={()=>window.print()}><Printer size={15}/> Imprimer</Btn></>}>
      {docR && <OfficialDoc r={docR}/>}
    </Modal>
  </>)
}

function Header(){ return (
  <div className="flex items-center justify-between border-b-2 pb-3 mb-4" style={{borderColor:'#6C5CE7'}}>
    <div className="flex items-center gap-2"><svg viewBox="0 0 68 72" width="34" height="34"><defs><linearGradient id="al" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6C5CE7"/><stop offset="1" stopColor="#36C5F0"/></linearGradient></defs><path d="M34 62 C31 52 28 47 22 43 C15 38 10 31 7 22 C18 27 28 33 31 41 L34 46 L37 41 C40 33 50 27 61 22 C58 31 53 38 46 43 C40 47 37 52 34 62 Z" fill="url(#al)"/></svg>
      <div><div className="font-extrabold">École Al-Nour</div><div className="text-xs text-muted">Tunis, Tunisie · Tél : +216 71 000 000</div></div></div>
  </div>) }
function Footer({r}){ return (<>
  <div className="mt-6 grid grid-cols-2 gap-4">
    <div className="text-xs text-muted"><b>Circuit de validation :</b>{r.approvals.map((a,i)=><div key={i}>✓ {ROLE[a.role]?.label} — {a.by} ({format(a.at,'dd/MM/yyyy')})</div>)}</div>
    <div className="text-center"><div className="h-12"></div><div className="border-t border-ink/30 pt-1 text-xs">Cachet & signature de la Direction</div></div>
  </div>
  <div className="text-[10px] text-muted mt-6 pt-2 border-t border-line">Document généré par Coreon Edu — données traitées conformément à la {LEGAL.law} (INPDP).</div></>) }

function OfficialDoc({ r }){
  const today=format(new Date(),'dd/MM/yyyy'); const f=r.fields||{}
  if(r.type==='Certificat de scolarité'){
    const s=studentById(f.child); const cls=classById(s?.classId)
    return (<div className="bg-white p-2 text-sm"><Header/><div className="text-xs text-right text-muted mb-2">Réf : {r.id.toUpperCase()} · Tunis, le {today}</div>
      <h2 className="text-center text-xl font-extrabold uppercase my-4">Certificat de scolarité</h2>
      <p className="leading-7">La Direction de l'École Al-Nour certifie que l'élève :</p>
      <div className="my-3 pl-4 border-l-2" style={{borderColor:'#EEEBFF'}}><div><b>Nom & prénom :</b> {s?.name}</div><div><b>Classe :</b> {cls?.name} ({cls?.grade})</div><div><b>N° acte de naissance :</b> {s?.cin||'—'}</div><div><b>Année scolaire :</b> {f.year||'2026/2027'}</div></div>
      <p className="leading-7">est régulièrement inscrit(e) et suit ses études dans notre établissement. Le présent certificat est délivré pour servir et valoir ce que de droit{f.addressedTo?` (${f.addressedTo})`:''}.</p>
      <Footer r={r}/></div>)
  }
  // attestations travail / salaire
  const user=userById(r.by); const t=db().teachers.find(x=>x.id===user?.teacherId); const isSalary=r.type.includes('salaire')
  return (<div className="bg-white p-2 text-sm"><Header/><div className="text-xs text-right text-muted mb-2">Réf : {r.id.toUpperCase()} · Tunis, le {today}</div>
    <h2 className="text-center text-xl font-extrabold uppercase my-4">{r.type}</h2>
    <p className="leading-7">Nous soussignés, la Direction de l'École Al-Nour, attestons que :</p>
    <div className="my-3 pl-4 border-l-2" style={{borderColor:'#EEEBFF'}}>
      <div><b>Nom & prénom :</b> {r.byName}</div><div><b>Fonction :</b> {t?.designation||user?.position||'Enseignant'}</div><div><b>CIN :</b> {user?.cin||t?.cin||'—'}</div>
      <div><b>Date d'embauche :</b> {t?.joiningDate||'—'}</div>{isSalary&&<div><b>Salaire mensuel brut :</b> {t?.salary?t.salary+' DT':'—'}</div>}
    </div>
    <p className="leading-7">est employé(e) au sein de notre établissement. La présente attestation est délivrée à l'intéressé(e){f.addressedTo?`, à l'attention de ${f.addressedTo},`:''} pour servir et valoir ce que de droit{f.purpose?` (${f.purpose})`:''}.</p>
    {f.copies&&<div className="text-xs text-muted mt-1">Nombre de copies : {f.copies}</div>}
    <Footer r={r}/></div>)
}
