import { useState } from 'react'
import jsPDF from 'jspdf'
import { current } from '../auth.js'
import { db, mutate, uid, userById, studentById, classById } from '../db.js'
import { ROLE } from '../theme.js'
import { notify } from '../notify.js'
import { REQUEST_DEFS, typesForRole, LEGAL } from '../tunisia.js'
import { PageHead, Card, Btn, Modal, Field, Input, Select, Textarea, Badge, EmptyState, STATUS } from '../components/ui.jsx'
import { FileText, Plus, Printer, Check, X, ChevronRight, Paperclip, Eye, Download, Info, MessageSquare } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

const defaults=type=>{ const o={}; (REQUEST_DEFS[type]?.fields||[]).forEach(f=>{ o[f.k]= f.t==='checkbox'?false : (f.def||'') }); return o }
const fieldVal=(r,f)=>{ const v=r.fields?.[f.k]; if(v===''||v==null||v===false)return null
  if(f.t==='checkbox')return 'Oui'; if(f.t==='child')return studentById(v)?.name||v; if(f.t==='attach')return <span className="inline-flex items-center gap-1"><Paperclip size={12}/>{v}</span>; return String(v) }

export default function Requests(){
  const u=current(); const myTypes=typesForRole(u.role); const canRaise=myTypes.length>0
  const [,force]=useState(0); const refresh=()=>force(x=>x+1)
  const [open,setOpen]=useState(false); const [view,setView]=useState(null); const [docR,setDocR]=useState(null)
  const [type,setType]=useState(myTypes[0]||''); const [vals,setVals]=useState(defaults(myTypes[0])); const [comment,setComment]=useState('')
  const d=db()
  const mine=d.requests.filter(r=>r.by===u.id)
  const toDecide=d.requests.filter(r=>r.status==='pending' && r.chain[r.currentLevel]===u.role)
  const def=REQUEST_DEFS[type]||{fields:[]}
  const setType2=t=>{ setType(t); setVals(defaults(t)) }
  const childOptions=(u.childIds||[]).map(id=>studentById(id)).filter(Boolean)
  const canDecide=r=> r && r.status==='pending' && r.chain[r.currentLevel]===u.role

  const submit=()=>{ for(const f of def.fields){ if(f.req && !vals[f.k]) return toast.error(`Champ requis : ${f.l}`) }
    const id=uid('req')
    mutate(db=>{db.requests.unshift({id,at:Date.now(),by:u.id,byName:u.name,type,fields:vals,chain:def.chain,currentLevel:0,approvals:[],status:'pending'})})
    notify({role:def.chain[0],kind:'request',actor:u.name,title:`nouvelle demande : ${type}`,body:def.fields[0]?`${def.fields[0].l}: ${vals[def.fields[0].k]}`:'',link:'/app/requests'})
    toast.success('Demande envoyée'); setOpen(false); setType2(myTypes[0]); refresh() }

  const act=(r,decision)=>{
    const fresh=db().requests.find(x=>x.id===r.id)
    if(!canDecide(fresh)){ setView(null); setComment(''); return }
    mutate(db=>{ const req=db.requests.find(x=>x.id===r.id)
      req.approvals.push({role:u.role,by:u.name,decision,comment:comment.trim(),at:Date.now()})
      if(decision==='rejected') req.status='rejected'
      else { req.currentLevel++; if(req.currentLevel>=req.chain.length) req.status='approved' } })
    const req=db().requests.find(x=>x.id===r.id)
    if(decision==='rejected') notify({to:r.by,kind:'request',actor:u.name,title:'demande rejetée',body:`${r.type} — ${comment||'sans motif'}`,link:'/app/requests'})
    else if(req.status==='approved') notify({to:r.by,kind:'request',actor:'Administration',title:'demande approuvée',body:`${r.type} — validée${REQUEST_DEFS[r.type]?.doc?', document disponible':''}.`,link:'/app/requests'})
    else { notify({role:req.chain[req.currentLevel],kind:'request',actor:u.name,title:`validation requise : ${r.type}`,body:`De ${r.byName}`,link:'/app/requests'}); notify({to:r.by,kind:'request',actor:u.name,title:'demande validée (étape)',body:`${r.type} — en cours`,link:'/app/requests'}) }
    toast.success(decision==='approved'?'Demande approuvée':'Demande rejetée'); setView(null); setComment(''); refresh()
  }

  const Chain=({r})=>(<div className="flex items-center gap-1.5 flex-wrap mt-2">
    {r.chain.map((role,i)=>{ const ap=r.approvals[i]; const done=ap?.decision==='approved',rej=ap?.decision==='rejected'
      const st=rej?'rej':done?'ok':(i===r.currentLevel&&r.status==='pending')?'cur':'wait'; const c={ok:STATUS.ok,rej:STATUS.danger,cur:STATUS.warn,wait:STATUS.neutral}[st]
      return <span key={i} className="flex items-center gap-1.5"><span className="text-[11px] font-bold px-2 py-1 rounded-full flex items-center gap-1" style={{background:c+'22',color:c}}>{done&&<Check size={11}/>}{rej&&<X size={11}/>} {ROLE[role]?.label}</span>{i<r.chain.length-1&&<ChevronRight size={12} className="text-muted"/>}</span> })}
  </div>)
  const Row=({r,decidable})=>(
    <Card className="p-4 hover:shadow-md transition cursor-pointer" >
      <div onClick={()=>{setComment('');setView(r)}} className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0"><div className="font-semibold flex items-center gap-2"><FileText size={16} className="accent-text"/> {r.type} <Badge status={r.status}/></div>
          <div className="text-xs text-muted mt-0.5">par {r.byName} · {formatDistanceToNow(r.at,{addSuffix:true,locale:fr})}</div><Chain r={r}/></div>
        <div className="flex items-center gap-2 shrink-0">
          {decidable && <span className="text-xs font-bold px-2 py-1 rounded-full" style={{background:STATUS.warnSoft,color:STATUS.warn}}>À examiner</span>}
          <Btn variant="ghost" onClick={(e)=>{e.stopPropagation();setComment('');setView(r)}}><Eye size={15}/> Détails</Btn>
        </div>
      </div>
    </Card>)

  return (<>
    <PageHead title="Demandes & validations" sub={canRaise?'Déposez une demande et suivez son circuit.':'Examinez puis validez les demandes.'}
      action={canRaise&&<Btn onClick={()=>{setType2(myTypes[0]);setOpen(true)}}><Plus size={16}/> Nouvelle demande</Btn>}/>

    {toDecide.length>0 && <div className="mb-6"><div className="text-xs font-bold uppercase text-muted mb-2">À valider ({toDecide.length}) — cliquez pour examiner</div>
      <div className="space-y-3">{toDecide.map(r=><Row key={r.id} r={r} decidable/>)}</div></div>}

    <div className="text-xs font-bold uppercase text-muted mb-2">{canRaise?'Mes demandes':'Toutes les demandes'}</div>
    <div className="space-y-3">
      {(canRaise?mine:d.requests).map(r=><Row key={r.id} r={r}/>)}
      {(canRaise?mine:d.requests).length===0 && <Card><EmptyState icon={<FileText size={26}/>} title="Aucune demande" sub={canRaise?'Déposez votre première demande pour la suivre ici.':'Les demandes à examiner apparaîtront ici.'}/></Card>}
    </div>

    {/* ---------- DETAIL (review then decide) ---------- */}
    <Modal open={!!view} onClose={()=>setView(null)} title="Détail de la demande" size="xl"
      footer={view && (canDecide(view)
        ? <><Btn variant="ghost" onClick={()=>act(view,'rejected')}><X size={15}/> Rejeter</Btn><Btn onClick={()=>act(view,'approved')}><Check size={15}/> Approuver</Btn></>
        : <>{view.status==='approved'&&REQUEST_DEFS[view.type]?.doc&&<><Btn variant="ghost" onClick={()=>setDocR(view)}><Printer size={15}/> Aperçu</Btn><Btn onClick={()=>downloadPDF(view)}><Download size={15}/> Télécharger PDF</Btn></>}<Btn variant="ghost" onClick={()=>setView(null)}>Fermer</Btn></>)}>
      {view && (()=>{ const reqUser=userById(view.by); const rd=REQUEST_DEFS[view.type]||{fields:[]}; return (<div>
        <div className="flex items-center justify-between mb-3"><div className="text-lg font-bold flex items-center gap-2">{view.type} <Badge status={view.status}/></div></div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm mb-4 bg-canvas rounded-xl p-3">
          <div><span className="text-muted">Demandeur :</span> <b>{view.byName}</b> ({ROLE[reqUser?.role]?.label})</div>
          <div><span className="text-muted">CIN :</span> {reqUser?.cin||'—'}</div>
          <div><span className="text-muted">Date :</span> {format(view.at,'dd/MM/yyyy HH:mm')}</div>
          <div><span className="text-muted">Circuit :</span> {view.chain.map(r=>ROLE[r].label).join(' → ')}</div>
        </div>
        <div className="text-xs font-bold uppercase text-muted mb-2">Détails saisis</div>
        <div className="space-y-1 mb-4">
          {rd.fields.map(f=>{ const v=fieldVal(view,f); return (
            <div key={f.k} className="flex justify-between gap-4 border-b border-line py-1.5 text-sm"><span className="text-muted">{f.l}</span><span className="font-medium text-right">{v||'—'}</span></div>) })}
        </div>
        <div className="text-xs font-bold uppercase text-muted mb-1">Circuit de validation</div><Chain r={view}/>
        {view.approvals.length>0 && <div className="mt-3 space-y-1">{view.approvals.map((a,i)=>(
          <div key={i} className="text-xs"><b className="inline-flex items-center gap-1" style={{color:a.decision==='approved'?STATUS.ok:STATUS.danger}}>{a.decision==='approved'?<><Check size={11}/> Approuvé</>:<><X size={11}/> Rejeté</>}</b> par {a.by} ({ROLE[a.role]?.label}) · {format(a.at,'dd/MM/yyyy')}{a.comment&&<span className="text-muted"> — <MessageSquare size={11} className="inline -mt-0.5"/> {a.comment}</span>}</div>))}</div>}
        {canDecide(view) && <div className="mt-4 pt-4 border-t border-line"><Field label="Votre commentaire (optionnel)"><Textarea value={comment} onChange={e=>setComment(e.target.value)} className="h-20" placeholder="Motif d'approbation ou de rejet…"/></Field></div>}
      </div>) })()}
    </Modal>

    {/* new request */}
    <Modal open={open} onClose={()=>setOpen(false)} title="Nouvelle demande" size="xl" footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Annuler</Btn><Btn onClick={submit}>Envoyer</Btn></>}>
      <Field label="Type de demande"><Select value={type} onChange={e=>setType2(e.target.value)}>{myTypes.map(t=><option key={t}>{t}</option>)}</Select></Field>
      <div className="text-xs text-muted my-2">Circuit : {def.chain?.map(r=>ROLE[r].label).join(' → ')}</div>
      {def.note&&<div className="text-xs bg-canvas rounded-xl p-2 mb-3 text-muted flex items-start gap-1.5"><Info size={13} className="shrink-0 mt-0.5"/><span>{def.note}</span></div>}
      <div className="grid sm:grid-cols-2 gap-3">{def.fields.map(f=>(
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
        </div>))}</div>
    </Modal>

    {/* document preview */}
    <Modal open={!!docR} onClose={()=>setDocR(null)} title="Document officiel" size="xl" footer={<><Btn variant="ghost" onClick={()=>setDocR(null)}>Fermer</Btn><Btn onClick={()=>downloadPDF(docR)}><Download size={15}/> Télécharger PDF</Btn></>}>
      {docR && <OfficialDoc r={docR}/>}
    </Modal>
  </>)
}

/* ---------- document content (shared by preview + PDF) ---------- */
function docModel(r){
  const f=r.fields||{}; const today=format(new Date(),'dd/MM/yyyy')
  if(r.type==='Certificat de scolarité'){ const s=studentById(f.child); const cls=classById(s?.classId)
    return { title:'Certificat de scolarité', ref:r.id.toUpperCase(), today,
      intro:"La Direction de l'École Al-Nour certifie que l'élève :",
      rows:[['Nom & prénom',s?.name],['Classe',`${cls?.name||''} (${cls?.grade||''})`],['N° acte de naissance',s?.cin||'—'],['Année scolaire',f.year||'2026/2027']],
      body:`est régulièrement inscrit(e) et suit ses études dans notre établissement. Le présent certificat est délivré pour servir et valoir ce que de droit${f.addressedTo?` (${f.addressedTo})`:''}.`, r }
  }
  const user=userById(r.by); const t=db().teachers.find(x=>x.id===user?.teacherId); const isSalary=r.type.includes('salaire')
  return { title:r.type, ref:r.id.toUpperCase(), today, intro:"Nous soussignés, la Direction de l'École Al-Nour, attestons que :",
    rows:[['Nom & prénom',r.byName],['Fonction',t?.designation||user?.position||'Enseignant'],['CIN',user?.cin||t?.cin||'—'],['Date d\'embauche',t?.joiningDate||'—'],...(isSalary?[['Salaire mensuel brut',t?.salary?t.salary+' DT':'—']]:[])],
    body:`est employé(e) au sein de notre établissement. La présente attestation est délivrée à l'intéressé(e)${f.addressedTo?`, à l'attention de ${f.addressedTo},`:''} pour servir et valoir ce que de droit${f.purpose?` (${f.purpose})`:''}.`, r }
}
function OfficialDoc({ r }){ const m=docModel(r); return (
  <div className="bg-white p-2 text-sm">
    <div className="flex items-center justify-between border-b-2 pb-3 mb-4" style={{borderColor:'#6C5CE7'}}>
      <div className="flex items-center gap-2"><svg viewBox="0 0 68 72" width="34" height="34"><defs><linearGradient id="al" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6C5CE7"/><stop offset="1" stopColor="#36C5F0"/></linearGradient></defs><path d="M34 62 C31 52 28 47 22 43 C15 38 10 31 7 22 C18 27 28 33 31 41 L34 46 L37 41 C40 33 50 27 61 22 C58 31 53 38 46 43 C40 47 37 52 34 62 Z" fill="url(#al)"/></svg><div><div className="font-extrabold">École Al-Nour</div><div className="text-xs text-muted">Tunis, Tunisie · Tél : +216 71 000 000</div></div></div>
      <div className="text-xs text-right text-muted">Réf : {m.ref}<br/>Tunis, le {m.today}</div></div>
    <h2 className="text-center text-xl font-extrabold uppercase my-4">{m.title}</h2>
    <p className="leading-7">{m.intro}</p>
    <div className="my-3 pl-4 border-l-2" style={{borderColor:'#EEEBFF'}}>{m.rows.map(([k,v])=><div key={k}><b>{k} :</b> {v}</div>)}</div>
    <p className="leading-7">{m.body}</p>
    <div className="mt-6 grid grid-cols-2 gap-4"><div className="text-xs text-muted"><b>Circuit de validation :</b>{m.r.approvals.map((a,i)=><div key={i} className="flex items-center gap-1"><Check size={10} className="shrink-0"/> {ROLE[a.role]?.label} — {a.by} ({format(a.at,'dd/MM/yyyy')})</div>)}</div>
      <div className="text-center"><div className="h-12"></div><div className="border-t border-ink/30 pt-1 text-xs">Cachet & signature de la Direction</div></div></div>
    <div className="text-[10px] text-muted mt-6 pt-2 border-t border-line">Document généré par Kogia Edu — conforme à la {LEGAL.law} (INPDP).</div>
  </div>) }
function downloadPDF(r){
  const m=docModel(r); const doc=new jsPDF({unit:'mm',format:'a4'}); const W=210; let y=20
  doc.setDrawColor(108,92,231); doc.setLineWidth(0.8); doc.line(20,28,W-20,28)
  doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.text('École Al-Nour',20,y)
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(120); doc.text('Tunis, Tunisie · +216 71 000 000',20,y+5)
  doc.text(`Réf : ${m.ref}`,W-20,y,{align:'right'}); doc.text(`Tunis, le ${m.today}`,W-20,y+5,{align:'right'})
  y=44; doc.setTextColor(20); doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text(m.title.toUpperCase(),W/2,y,{align:'center'})
  y+=12; doc.setFont('helvetica','normal'); doc.setFontSize(11)
  doc.text(doc.splitTextToSize(m.intro,W-40),20,y); y+=10
  doc.setFont('helvetica','bold'); m.rows.forEach(([k,v])=>{ doc.text(`${k} : `,24,y); const kw=doc.getTextWidth(`${k} : `); doc.setFont('helvetica','normal'); doc.text(String(v||'—'),24+kw,y); doc.setFont('helvetica','bold'); y+=7 })
  y+=4; doc.setFont('helvetica','normal'); doc.text(doc.splitTextToSize(m.body,W-40),20,y); y+=24
  doc.setFontSize(9); doc.setTextColor(110); doc.text('Circuit de validation :',20,y); y+=5
  m.r.approvals.forEach(a=>{ doc.text(`  • ${ROLE[a.role]?.label} — ${a.by} (${format(a.at,'dd/MM/yyyy')})`,20,y); y+=5 })
  doc.text('Cachet & signature de la Direction',W-20,y+6,{align:'right'})
  doc.setFontSize(7.5); doc.text(`Document généré par Kogia Edu — conforme à la ${LEGAL.law} (INPDP).`,20,285)
  doc.save(`${m.title.replace(/ /g,'_')}_${m.r.byName.replace(/ /g,'_')}.pdf`)
  toast.success('PDF téléchargé')
}
