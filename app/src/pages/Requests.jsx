import { useState } from 'react'
import { t } from '@core/i18n.js'
import jsPDF from 'jspdf'
import { current } from '@core/auth.js'
import { pack } from '@core/locales.js'
import { money } from '@core/currency.js'
import { db, mutate, uid, userById, studentById, classById, settings } from '@core/db.js'
import { ROLE } from '@core/theme.js'
import { notify } from '@core/notify.js'
import { REQUEST_DEFS, typesForRole, LEGAL } from '@core/tunisia.js'
import { categoryOf, assign as assignWork, close as closeWork, monthReport } from '@core/requests.js'
import { todayIso } from '@core/clock.js'
import { PageHead, Card, Btn, Modal, Field, Input, Select, Textarea, Badge, EmptyState, STATUS, Mark } from '../components/ui.jsx'
import { FileText, Plus, Printer, Check, X, ChevronRight, Paperclip, Eye, Download, Info, MessageSquare, UserCog, Hammer, BarChart3 } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { df } from '../datefns.js'
import toast from 'react-hot-toast'

// codex-review #18 : la modale affichait def.chain (le circuit THÉORIQUE du
// type de demande) alors que submit() enregistre un circuit FILTRÉ (le
// demandeur ne peut pas être son propre approbateur). Un seul calcul pour
// les deux : la prévisualisation ne peut plus jamais dériver de ce qui est
// réellement enregistré.
const finalChainFor=(defChain,role)=>{ const c=(defChain||[]).filter(r=>r!==role); return c.length?c:['schooladmin'] }
const defaults=type=>{ const o={}; (REQUEST_DEFS[type]?.fields||[]).forEach(f=>{ o[f.k]= f.t==='checkbox'?false : (f.def||'') }); return o }
const fieldVal=(r,f)=>{ const v=r.fields?.[f.k]; if(v===''||v==null||v===false)return null
  if(f.t==='checkbox')return 'Oui'; if(f.t==='child')return studentById(v)?.name||v; if(f.t==='attach')return <span className="inline-flex items-center gap-1"><Paperclip size={12}/>{v}</span>; return String(v) }

export default function Requests(){
  const u=current(); const myTypes=typesForRole(u.role); const canRaise=myTypes.length>0
  const [,force]=useState(0); const refresh=()=>force(x=>x+1)
  const [open,setOpen]=useState(false); const [view,setView]=useState(null); const [docR,setDocR]=useState(null)
  const [type,setType]=useState(myTypes[0]||''); const [vals,setVals]=useState(defaults(myTypes[0])); const [comment,setComment]=useState('')
  // l'extension : assigner un travail, le clôturer, dresser le bilan du mois
  const [assignee,setAssignee]=useState(''); const [deadline,setDeadline]=useState('')
  const [bilan,setBilan]=useState(false); const [month,setMonth]=useState(todayIso().slice(0,7))
  const d=db()
  const isDirection=['schooladmin','admin'].includes(u.role)
  const staff=d.users.filter(x=>!['parent','owner'].includes(x.role))
  const mine=d.requests.filter(r=>r.by===u.id||r.assigneeId===u.id)
  // Nul ne valide sa propre demande : un admin qui demandait une attestation de
  // salaire (chaîne ['admin','schooladmin']) se retrouvait au niveau 0 de sa propre
  // chaîne et signait lui-même. La séparation des tâches n'existait plus.
  const toDecide=d.requests.filter(r=>r.status==='pending' && r.chain[r.currentLevel]===u.role && r.by!==u.id)
  const def=REQUEST_DEFS[type]||{fields:[]}
  const setType2=v=>{ setType(v); setVals(defaults(v)) }
  const childOptions=(u.childIds||[]).map(id=>studentById(id)).filter(Boolean)
  const canDecide=r=> r && r.status==='pending' && r.chain[r.currentLevel]===u.role && r.by!==u.id

  const submit=()=>{ for(const f of def.fields){ if(f.req && !vals[f.k]) return toast.error(`Champ requis : ${f.l}`) }
    const id=uid('req')
    const finalChain=finalChainFor(def.chain,u.role)
    mutate(db=>{db.requests.unshift({id,at:Date.now(),by:u.id,byName:u.name,type,fields:vals,chain:finalChain,currentLevel:0,approvals:[],status:'pending'})})
    notify({role:finalChain[0],kind:'request',actor:u.name,title:`nouvelle demande : ${type}`,body:def.fields[0]?`${def.fields[0].l}: ${vals[def.fields[0].k]}`:'',link:'/app/requests'})
    toast.success('Demande envoyée'); setOpen(false); setType2(myTypes[0]); refresh() }

  const act=(r,decision)=>{
    const fresh=db().requests.find(x=>x.id===r.id)
    if(!canDecide(fresh)){ setView(null); setComment(''); return }
    mutate(db=>{ const req=db.requests.find(x=>x.id===r.id)
      req.approvals.push({role:u.role,by:u.name,decision,comment:comment.trim(),at:Date.now()})
      if(decision==='rejected') req.status='rejected'
      else { req.currentLevel++; if(req.currentLevel>=req.chain.length) req.status='approved' } })
    const req=db().requests.find(x=>x.id===r.id)
    if(decision==='rejected') notify({to:r.by,email:true,kind:'request',actor:u.name,title:t('demande rejetée'),body:`${r.type} · ${comment||'sans motif'}`,link:'/app/requests'})
    else if(req.status==='approved') notify({to:r.by,email:true,kind:'request',actor:t('Administration'),title:t('demande approuvée'),body:`${r.type} · validée${REQUEST_DEFS[r.type]?.doc?', document disponible':''}.`,link:'/app/requests'})
    else { notify({role:req.chain[req.currentLevel],kind:'request',actor:u.name,title:`${t('validation requise')} : ${r.type}`,body:`De ${r.byName}`,link:'/app/requests'}); notify({to:r.by,kind:'request',actor:u.name,title:t('demande validée (étape)'),body:`${r.type} · en cours`,link:'/app/requests'}) }
    toast.success(decision==='approved'?'Demande approuvée':'Demande rejetée'); setView(null); setComment(''); refresh()
  }

  const Chain=({r})=>(<div className="flex items-center gap-1.5 flex-wrap mt-2">
    {r.chain.map((role,i)=>{ const ap=r.approvals[i]; const done=ap?.decision==='approved',rej=ap?.decision==='rejected'
      const st=rej?'rej':done?'ok':(i===r.currentLevel&&r.status==='pending')?'cur':'wait'; const c={ok:STATUS.ok,rej:STATUS.danger,cur:STATUS.warn,wait:STATUS.neutral}[st]
      return <span key={i} className="flex items-center gap-1.5"><span className="text-[12px] font-bold px-2 py-1 rounded-full flex items-center gap-1" style={{background:c+'22',color:c}}>{done&&<Check size={11}/>}{rej&&<X size={11}/>} {ROLE[role]?.label}</span>{i<r.chain.length-1&&<ChevronRight size={12} className="text-muted"/>}</span> })}
  </div>)
  const Row=({r,decidable})=>{
    const overdue=r.status==='approved'&&r.deadline&&todayIso()>r.deadline
    return (
    <Card className="p-4 hover:shadow-md transition cursor-pointer" >
      <div onClick={()=>{setComment('');setView(r)}} className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0"><div className="font-semibold flex items-center gap-2 flex-wrap"><FileText size={16} className="accent-text"/> {t(r.type)}
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-canvas text-muted">{t(categoryOf(r))}</span>
            <Badge status={r.status}/></div>
          <div className="text-xs text-muted mt-0.5">{t('par')} {r.byName} · {formatDistanceToNow(r.at,{addSuffix:true,locale: df()})}</div>
          {/* le travail qui suit la signature : à qui, pour quand, où ça en est */}
          {r.assigneeId&&r.status==='approved'&&<div className="text-xs mt-1 font-semibold flex items-center gap-1.5" style={{color:overdue?STATUS.danger:STATUS.info}}>
            <Hammer size={12}/> {t('confié à')} {r.assigneeName}{r.deadline&&<> {t('échéance')} {r.deadline}{overdue&&'DÉPASSÉE'}</>}</div>}
          {r.status==='closed'&&<div className="text-xs mt-1 font-semibold flex items-center gap-1.5" style={{color:r.closedLate?STATUS.warn:STATUS.ok}}>
            <Check size={12}/> {t('clôturée par')} {r.closedBy}{r.closedLate&&'en retard'}</div>}
          <Chain r={r}/></div>
        <div className="flex items-center gap-2 shrink-0">
          {decidable && <span className="text-xs font-bold px-2 py-1 rounded-full" style={{background:STATUS.warnSoft,color:STATUS.warn}}>{t('À examiner')}</span>}
          <Btn variant="ghost" onClick={(e)=>{e.stopPropagation();setComment('');setView(r)}}><Eye size={15}/> {t('Détails')}</Btn>
        </div>
      </div>
    </Card>)}

  return (<>
    <PageHead title={t('Demandes & validations')} sub={canRaise?t('Déposez une demande et suivez son circuit : jusqu’à la clôture.'):t('Examinez, validez, assignez, clôturez. Tout est tracé.')}
      action={<div className="flex gap-2">
        {isDirection&&<Btn variant="soft" onClick={()=>setBilan(true)}><BarChart3 size={16}/> {t('Bilan du mois')}</Btn>}
        {canRaise&&<Btn onClick={()=>{setType2(myTypes[0]);setOpen(true)}}><Plus size={16}/> {t('Nouvelle demande')}</Btn>}
      </div>}/>

    {toDecide.length>0 && <div className="mb-6"><div className="text-xs font-bold uppercase text-muted mb-2">{t('À valider (')}{toDecide.length}{t(') · cliquez pour examiner')}</div>
      <div className="space-y-3">{toDecide.map(r=><Row key={r.id} r={r} decidable/>)}</div></div>}

    <div className="text-xs font-bold uppercase text-muted mb-2">{canRaise?t('Mes demandes'):t('Toutes les demandes')}</div>
    <div className="space-y-3">
      {(canRaise?mine:d.requests).map(r=><Row key={r.id} r={r}/>)}
      {(canRaise?mine:d.requests).length===0 && <Card><EmptyState icon={<FileText size={26}/>} title={t('Aucune demande')} sub={canRaise?t('Déposez votre première demande pour la suivre ici.'):t('Les demandes à examiner apparaîtront ici.')}/></Card>}
    </div>

    {/* ---------- DETAIL (review then decide) ---------- */}
    <Modal open={!!view} onClose={()=>setView(null)} title={t('Détail de la demande')} size="xl"
      footer={view && (canDecide(view)
        ? <><Btn variant="ghost" onClick={()=>act(view,'rejected')}><X size={15}/> {t('Rejeter')}</Btn><Btn onClick={()=>act(view,'approved')}><Check size={15}/> {t('Approuver')}</Btn></>
        : <>{view.status==='approved'&&REQUEST_DEFS[view.type]?.doc&&<><Btn variant="ghost" onClick={()=>setDocR(view)}><Printer size={15}/> {t('Aperçu')}</Btn><Btn onClick={()=>downloadPDF(view)}><Download size={15}/> {t('Télécharger PDF')}</Btn></>}<Btn variant="ghost" onClick={()=>setView(null)}>{t('Fermer')}</Btn></>)}>
      {view && (()=>{ const reqUser=userById(view.by); const rd=REQUEST_DEFS[view.type]||{fields:[]}; return (<div>
        <div className="flex items-center justify-between mb-3"><div className="text-lg font-bold flex items-center gap-2">{t(view.type)} <Badge status={view.status}/></div></div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm mb-4 bg-canvas rounded-xl p-3">
          <div><span className="text-muted">{t('Demandeur :')}</span> <b>{view.byName}</b> ({ROLE[reqUser?.role]?.label})</div>
          <div><span className="text-muted">{t('CIN :')}</span> {reqUser?.cin||'·'}</div>
          <div><span className="text-muted">{t('Date :')}</span> {format(view.at,'dd/MM/yyyy HH:mm')}</div>
          <div><span className="text-muted">{t('Circuit :')}</span> {view.chain.map(r=>ROLE[r].label).join(' → ')}</div>
        </div>
        <div className="text-xs font-bold uppercase text-muted mb-2">{t('Détails saisis')}</div>
        <div className="space-y-1 mb-4">
          {rd.fields.map(f=>{ const v=fieldVal(view,f); return (
            <div key={f.k} className="flex justify-between gap-4 border-b border-line py-1.5 text-sm"><span className="text-muted">{f.l}</span><span className="font-medium text-right">{v||'·'}</span></div>) })}
        </div>
        <div className="text-xs font-bold uppercase text-muted mb-1">{t('Circuit de validation')}</div><Chain r={view}/>
        {view.approvals.length>0 && <div className="mt-3 space-y-1">{view.approvals.map((a,i)=>(
          <div key={i} className="text-xs"><b className="inline-flex items-center gap-1" style={{color:a.decision==='approved'?STATUS.ok:STATUS.danger}}>{a.decision==='approved'?<><Check size={11}/> {t('Approuvé')}</>:<><X size={11}/> {t('Rejeté')}</>}</b> {t('par')} {a.by} ({ROLE[a.role]?.label}) · {format(a.at,'dd/MM/yyyy')}{a.comment&&<span className="text-muted"> <MessageSquare size={11} className="inline -mt-0.5"/> {a.comment}</span>}</div>))}</div>}
        {canDecide(view) && <div className="mt-4 pt-4 border-t border-line"><Field label={t('Votre commentaire (optionnel)')}><Textarea value={comment} onChange={e=>setComment(e.target.value)} className="h-20" placeholder={t("Motif d'approbation ou de rejet…")}/></Field></div>}

        {/* ── LE TRAVAIL QUI SUIT LA SIGNATURE (requests.js) ──────────────── */}
        {view.status==='approved' && (
          <div className="mt-4 pt-4 border-t border-line">
            <div className="text-xs font-bold uppercase text-muted mb-2 flex items-center gap-1.5"><Hammer size={13}/> {t('Le travail')}</div>
            {view.assigneeId
              ? <div className="text-sm mb-3">{t('Confié à')} <b>{view.assigneeName}</b>{view.deadline&&<> {t('échéance')} <b style={{color:todayIso()>view.deadline?STATUS.danger:undefined}}>{view.deadline}</b></>}</div>
              : isDirection && (
                <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2 mb-3 items-end">
                  <Field label={t('Confier à')}><Select value={assignee} onChange={e=>setAssignee(e.target.value)}>
                    <option value=""> </option>{staff.map(s=><option key={s.id} value={s.id}>{s.name} ({ROLE[s.role]?.label})</option>)}</Select></Field>
                  <Field label={t('Échéance')}><Input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/></Field>
                  <Btn onClick={()=>{ const s=staff.find(x=>x.id===assignee)
                    const r=assignWork(view.id,{assigneeId:assignee,assigneeName:s?.name,deadline:deadline||null,byName:u.name})
                    if(r.error) return toast.error(r.error)
                    toast.success(`Confié à ${s.name}`); setAssignee(''); setDeadline(''); setView(db().requests.find(x=>x.id===view.id)); refresh() }}>
                    <UserCog size={15}/> {t('Assigner')}</Btn>
                </div>)}
            {(isDirection||view.assigneeId===u.id) && (
              <div className="flex items-end gap-2">
                <div className="flex-1"><Field label={t('Mot de clôture (ce qui a été fait)')}><Input value={comment} onChange={e=>setComment(e.target.value)} placeholder={t('Réparé, acheté, remis en main propre…')}/></Field></div>
                <Btn variant="soft" onClick={()=>{ const r=closeWork(view.id,{byId:u.id,byName:u.name,note:comment.trim()})
                  if(r.error) return toast.error(r.error)
                  toast.success(r.late?'Clôturée · en retard sur l’échéance':'Clôturée'); setComment(''); setView(null); refresh() }}>
                  <Check size={15}/> {t('Clôturer')}</Btn>
              </div>)}
          </div>)}
        {view.status==='closed' && (
          <div className="mt-4 pt-4 border-t border-line text-sm">
            <div className="text-xs font-bold uppercase text-muted mb-1.5">{t('Clôture')}</div>
            <div>{t('Par')} <b>{view.closedBy}</b> {t('le')} {format(view.closedAt,'dd/MM/yyyy HH:mm')}
              {view.closedLate&&<b style={{color:STATUS.warn}}>{t('en retard sur l’échéance')}</b>}</div>
            {view.closeNote&&<div className="text-muted mt-1">« {view.closeNote} »</div>}
          </div>)}
        {(view.trace||[]).length>0 && (
          <div className="mt-4 pt-4 border-t border-line">
            <div className="text-xs font-bold uppercase text-muted mb-1.5">{t('Qui a fait quoi')}</div>
            {view.trace.map((v,i)=>(<div key={i} className="text-xs py-0.5">
              <b>{v.by}</b> {v.action==='assigne'?t('a assigné'):t('a clôturé')} · {format(v.at,'dd/MM/yyyy HH:mm')}
              {v.note&&<span className="text-muted"> {v.note}</span>}</div>))}
          </div>)}
      </div>) })()}
    </Modal>

    {/* ---------- LE BILAN DU MOIS — la demande d'origine d'Othman ---------- */}
    <Modal open={bilan} onClose={()=>setBilan(false)} title={t('Bilan du mois · le travail accompli')} size="xl"
      footer={<Btn variant="ghost" onClick={()=>setBilan(false)}>{t('Fermer')}</Btn>}>
      {bilan && (()=>{ const rep=monthReport(month); return (<div>
        <Field label={t('Mois')}><Input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></Field>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 my-4">
          {[['Déposées',rep.submitted,null],['Clôturées',rep.closed,STATUS.ok],['En retard',rep.closedLate,rep.closedLate?STATUS.warn:null],['Encore ouvertes',rep.open,null],['Échéance dépassée',rep.overdue,rep.overdue?STATUS.danger:null]].map(([l,v,c])=>(
            <Card key={l} className="p-3 text-center"><div className="text-2xl font-extrabold tabular-nums" style={c?{color:c}:{}}>{v}</div><div className="text-[11px] text-muted mt-0.5">{l}</div></Card>))}
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <div><div className="text-xs font-bold uppercase text-muted mb-2">{t('Clôturées par catégorie')}</div>
            {Object.entries(rep.byCategory).length?Object.entries(rep.byCategory).map(([c,s])=>(
              <div key={c} className="flex justify-between text-sm border-b border-line py-1.5"><span>{c}</span>
                <span className="font-bold tabular-nums">{s.closed}{s.late>0&&<span className="font-semibold text-xs ml-1.5" style={{color:STATUS.warn}}>{t('dont')} {s.late} {t('en retard')}</span>}</span></div>))
              :<div className="text-xs text-muted">{t('Rien de clôturé ce mois-ci.')}</div>}</div>
          <div><div className="text-xs font-bold uppercase text-muted mb-2">{t('Par personne')}</div>
            {Object.entries(rep.byAssignee).length?Object.entries(rep.byAssignee).sort((a,b)=>b[1].closed-a[1].closed).map(([n,s])=>(
              <div key={n} className="flex justify-between text-sm border-b border-line py-1.5"><span>{n}</span>
                <span className="font-bold tabular-nums">{s.closed}{s.late>0&&<span className="font-semibold text-xs ml-1.5" style={{color:STATUS.warn}}>{t('dont')} {s.late} {t('en retard')}</span>}</span></div>))
              :<div className="text-xs text-muted">{t("Personne n'a clôturé ce mois-ci.")}</div>}</div>
        </div>
        <p className="text-[11px] text-muted mt-4">{t("Compté depuis la trace des demandes : rien d'estimé, rien de saisi à la main.")}</p>
      </div>) })()}
    </Modal>

    {/* new request */}
    <Modal open={open} onClose={()=>setOpen(false)} title={t('Nouvelle demande')} size="xl" footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>{t('Annuler')}</Btn><Btn onClick={submit}>{t('Envoyer')}</Btn></>}>
      <Field label={t('Type de demande')}><Select value={type} onChange={e=>setType2(e.target.value)}>{myTypes.map(v=><option key={v} value={v}>{t(v)}</option>)}</Select></Field>
      <div className="text-xs text-muted my-2">{t('Circuit :')} {def.chain?.length?finalChainFor(def.chain,u.role).map(r=>ROLE[r].label).join(' → '):''}</div>
      {def.note&&<div className="text-xs bg-canvas rounded-xl p-2 mb-3 text-muted flex items-start gap-1.5"><Info size={13} className="shrink-0 mt-0.5"/><span>{def.note}</span></div>}
      <div className="grid sm:grid-cols-2 gap-3">{def.fields.map(f=>(
        <div key={f.k} className={f.t==='textarea'||f.t==='checkbox'?'sm:col-span-2':''}>
          {f.t==='checkbox'
            ? <label className="flex items-center gap-2 text-sm bg-canvas rounded-xl p-3"><input type="checkbox" checked={!!vals[f.k]} onChange={e=>setVals({...vals,[f.k]:e.target.checked})}/> {f.l}</label>
            : <Field label={f.l+(f.req?' *':'')}>
                {f.t==='select'? <Select value={vals[f.k]||''} onChange={e=>setVals({...vals,[f.k]:e.target.value})}><option value=""> </option>{f.o.map(o=><option key={o}>{o}</option>)}</Select>
                : f.t==='child'? <Select value={vals[f.k]||''} onChange={e=>setVals({...vals,[f.k]:e.target.value})}><option value=""> </option>{childOptions.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Select>
                : f.t==='textarea'? <Textarea value={vals[f.k]||''} onChange={e=>setVals({...vals,[f.k]:e.target.value})} className="h-20"/>
                : f.t==='attach'? <label className="flex items-center gap-2 text-sm border border-line rounded-xl px-3 py-2.5 cursor-pointer"><Paperclip size={14} className="text-muted"/>{vals[f.k]||t('Joindre un fichier')}<input type="file" className="hidden" onChange={e=>setVals({...vals,[f.k]:e.target.files?.[0]?.name||''})}/></label>
                : <Input type={f.t==='number'?'number':f.t==='date'?'date':f.t==='time'?'time':'text'} value={vals[f.k]||''} onChange={e=>setVals({...vals,[f.k]:e.target.value})}/>}
              </Field>}
        </div>))}</div>
    </Modal>

    {/* document preview */}
    <Modal open={!!docR} onClose={()=>setDocR(null)} title={t('Document officiel')} size="xl" footer={<><Btn variant="ghost" onClick={()=>setDocR(null)}>{t('Fermer')}</Btn><Btn onClick={()=>downloadPDF(docR)}><Download size={15}/> {t('Télécharger PDF')}</Btn></>}>
      {docR && <OfficialDoc r={docR}/>}
    </Modal>
  </>)
}

/* ---------- document content (shared by preview + PDF) ---------- */
function docModel(r){
  // Identité de l'établissement depuis les Paramètres — plus d'« École Al-Nour » figé.
  const sc=settings()
  const f=r.fields||{}; const today=format(new Date(),'dd/MM/yyyy')
  if(r.type==='Certificat de scolarité'){ const s=studentById(f.child); const cls=classById(s?.classId)
    return { title:t('Certificat de scolarité'), ref:r.id.toUpperCase(), today, sc,
      intro:`La Direction de l'établissement ${sc.schoolName} certifie que l'élève :`,
      rows:[['Nom & prénom',s?.name],['Classe',`${cls?.name||''} (${cls?.grade||''})`],['N° acte de naissance',s?.cin||'·'],['Année scolaire',f.year||sc.year]],
      body:`est régulièrement inscrit(e) et suit ses études dans notre établissement. Le présent certificat est délivré pour servir et valoir ce que de droit${f.addressedTo?` (${f.addressedTo})`:''}.`, r }
  }
  const user=userById(r.by); const teacher=db().teachers.find(x=>x.id===user?.teacherId); const isSalary=r.type.includes('salaire')
  return { title:t(r.type), ref:r.id.toUpperCase(), today, sc, intro:`Nous soussignés, la Direction de l'établissement ${sc.schoolName}, attestons que :`,
    rows:[['Nom & prénom',r.byName],['Fonction',teacher?.designation||user?.position||'Enseignant'],['CIN',user?.cin||teacher?.cin||'·'],['Date d\'embauche',teacher?.joiningDate||'·'],...(isSalary?[['Salaire mensuel brut',teacher?.salary?money(teacher.salary):'·']]:[])],
    body:`est employé(e) au sein de notre établissement. La présente attestation est délivrée à l'intéressé(e)${f.addressedTo?`, à l'attention de ${f.addressedTo},`:''} pour servir et valoir ce que de droit${f.purpose?` (${f.purpose})`:''}.`, r }
}
function OfficialDoc({ r }){ const m=docModel(r); return (
  <div className="bg-white p-2 text-sm">
    <div className="flex items-center justify-between border-b-2 pb-3 mb-4" style={{borderColor:'#7539E4'}}>
      <div className="flex items-center gap-2"><Mark size={34}/><div><div className="font-extrabold">{m.sc.schoolName}</div><div className="text-xs text-muted">{m.sc.city}, {pack().label} {t('· Tél :')} {m.sc.phone}</div></div></div>
      <div className="text-xs text-right text-muted">{t('Réf :')} {m.ref}<br/>{m.sc.city}{t(', le')} {m.today}</div></div>
    <h2 className="text-center text-xl font-extrabold uppercase my-4">{m.title}</h2>
    <p className="leading-7">{m.intro}</p>
    <div className="my-3 pl-4 border-l-2" style={{borderColor:'#EEF2FF'}}>{m.rows.map(([k,v])=><div key={k}><b>{k} :</b> {v}</div>)}</div>
    <p className="leading-7">{m.body}</p>
    <div className="mt-6 grid grid-cols-2 gap-4"><div className="text-xs text-muted"><b>{t('Circuit de validation :')}</b>{m.r.approvals.map((a,i)=><div key={i} className="flex items-center gap-1"><Check size={10} className="shrink-0"/> {ROLE[a.role]?.label} · {a.by} ({format(a.at,'dd/MM/yyyy')})</div>)}</div>
      <div className="text-center"><div className="h-12"></div><div className="border-t border-ink/30 pt-1 text-xs">{t('Cachet & signature de la Direction')}</div></div></div>
    <div className="text-[11px] text-muted mt-6 pt-2 border-t border-line">{t('Document généré par Coreon Edu · conforme à la')} {LEGAL.law}{LEGAL.authority ? ` (${LEGAL.authority})` : ''}.</div>
  </div>) }
function downloadPDF(r){
  const m=docModel(r); const doc=new jsPDF({unit:'mm',format:'a4'}); const W=210; let y=20
  doc.setDrawColor(108,92,231); doc.setLineWidth(0.8); doc.line(20,28,W-20,28)
  doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.text(m.sc.schoolName,20,y)
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(120); doc.text(`${m.sc.city}, ${pack().label} · ${m.sc.phone}`,20,y+5)
  doc.text(`Réf : ${m.ref}`,W-20,y,{align:'right'}); doc.text(`${m.sc.city}, le ${m.today}`,W-20,y+5,{align:'right'})
  y=44; doc.setTextColor(20); doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text(m.title.toUpperCase(),W/2,y,{align:'center'})
  y+=12; doc.setFont('helvetica','normal'); doc.setFontSize(11)
  doc.text(doc.splitTextToSize(m.intro,W-40),20,y); y+=10
  doc.setFont('helvetica','bold'); m.rows.forEach(([k,v])=>{ doc.text(`${k} : `,24,y); const kw=doc.getTextWidth(`${k} : `); doc.setFont('helvetica','normal'); doc.text(String(v||'·'),24+kw,y); doc.setFont('helvetica','bold'); y+=7 })
  y+=4; doc.setFont('helvetica','normal'); doc.text(doc.splitTextToSize(m.body,W-40),20,y); y+=24
  doc.setFontSize(9); doc.setTextColor(110); doc.text('Circuit de validation :',20,y); y+=5
  m.r.approvals.forEach(a=>{ doc.text(`  • ${ROLE[a.role]?.label} · ${a.by} (${format(a.at,'dd/MM/yyyy')})`,20,y); y+=5 })
  doc.text('Cachet & signature de la Direction',W-20,y+6,{align:'right'})
  doc.setFontSize(7.5); doc.text(`Document généré par Coreon Edu : conforme à la ${LEGAL.law}${LEGAL.authority ? ` (${LEGAL.authority})` : ''}.`,20,285)
  doc.save(`${m.title.replace(/ /g,'_')}_${m.r.byName.replace(/ /g,'_')}.pdf`)
  toast.success('PDF téléchargé')
}
