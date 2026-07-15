import { useState } from 'react'
import { db, mutate, FEE_MONTHS, studentById } from '@core/db.js'
import { notify } from '@core/notify.js'
import { PageHead, Card, StatCard, Avatar, Btn, EmptyState, Modal, STATUS } from '../components/ui.jsx'
import { Wallet, BellRing, Hourglass, Check } from 'lucide-react'
import toast from 'react-hot-toast'
const COL={paid:STATUS.ok,pending:STATUS.warn,overdue:STATUS.danger,due:STATUS.neutral}
const COL_FR={paid:'Payé',pending:'À confirmer',overdue:'En retard',due:'Impayé'}
// L'administration est la SEULE à pouvoir passer un mois en « Payé » : le parent ne
// fait que signaler son versement (statut « pending »). Un clic sur une case
// encaisse (→ payé) ; recliquer un mois payé l'annule (→ impayé).
const NEXT={due:'paid',overdue:'paid',pending:'paid',paid:'due'}

export default function Finance(){
  const [,force]=useState(0); const d=db()
  const counts={paid:0,pending:0,overdue:0,due:0}; Object.values(d.payments).forEach(a=>a.forEach(p=>counts[p.status]++))
  // Chaque tuile s'ouvre : derrière « 12 en retard » il y a des familles à relancer.
  const [tile,setTile]=useState(null) // 'paid' | 'pending' | 'overdue' | 'due'
  const byStatus=k=>d.students
    .map(s=>({s,months:(d.payments[s.id]||[]).map((p,mi)=>({...p,mi})).filter(p=>p.status===k)}))
    .filter(x=>x.months.length)

  // Prévient le parent quand SON mois change d'état — c'est le retour attendu
  // après qu'il a signalé son versement.
  const tellParent=(sid,month,status)=>{
    const s=studentById(sid); if(!s?.parentId) return
    const msg = status==='paid'
      ? {title:'Paiement confirmé',body:`${month} confirmé pour ${s.name.split(' ')[0]} — merci !`}
      : {title:'Paiement annulé',body:`${month} est repassé en impayé pour ${s.name.split(' ')[0]}. Contactez l'administration.`}
    notify({to:s.parentId,kind:'payment',actor:'Administration',...msg,link:'/app/payments'})
  }
  const cycle=(sid,mi)=>{
    let month,next
    mutate(db=>{ const p=db.payments[sid][mi]; month=p.month; next=NEXT[p.status]||'paid'; p.status=next })
    tellParent(sid,month,next)
    toast.success(next==='paid'?`${month} confirmé · parent notifié`:`${month} annulé · parent notifié`)
    force(x=>x+1) }

  // Les versements signalés par les parents, en attente d'encaissement.
  const toConfirm=d.students.flatMap(s=>(d.payments[s.id]||[])
    .map((p,mi)=>p.status==='pending'?{s,p,mi}:null).filter(Boolean))
  const confirmAll=()=>{
    if(!toConfirm.length) return
    toConfirm.forEach(({s,mi})=>{ mutate(db=>{db.payments[s.id][mi].status='paid'}) })
    toConfirm.forEach(({s,p})=>tellParent(s.id,p.month,'paid'))
    toast.success(`${toConfirm.length} versement(s) confirmé(s) · parents notifiés`); force(x=>x+1) }
  const remind=(sid)=>{ const s=studentById(sid); const unpaid=d.payments[sid].filter(p=>p.status!=='paid').map(p=>p.month)
    const parent=d.users.find(u=>u.id===s.parentId)
    if(parent) notify({to:parent.id,kind:'payment',title:'Rappel de paiement',body:`${unpaid.length} mois impayé(s) pour ${s.name} : ${unpaid.join(', ')}`})
    toast.success(parent?`Rappel envoyé au parent de ${s.name}`:'Aucun parent lié') }
  // relance groupée : tous les élèves avec au moins un mois en retard, en un clic
  const lateStudents=d.students.filter(s=>(d.payments[s.id]||[]).some(p=>p.status==='overdue'))
  const remindAll=()=>{
    let sent=0, noParent=0
    lateStudents.forEach(s=>{
      const parent=d.users.find(u=>u.id===s.parentId)
      const months=d.payments[s.id].filter(p=>p.status==='overdue').map(p=>p.month)
      if(parent){ notify({to:parent.id,kind:'payment',actor:'Administration',title:'Rappel de paiement',body:`Mois en retard pour ${s.name} : ${months.join(', ')}. Merci de régulariser auprès de l'administration.`,link:'/app/payments'}); sent++ }
      else noParent++
    })
    toast.success(`${sent} parent(s) relancé(s)${noParent?` · ${noParent} élève(s) sans compte parent lié`:''}`)
  }
  return (<>
    <PageHead title="Frais & Finances" sub="Confirmez les versements signalés, encaissez au guichet, relancez les retards."
      action={<Btn onClick={remindAll} disabled={lateStudents.length===0}><BellRing size={15}/> Relancer tous les retards ({lateStudents.length})</Btn>}/>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <StatCard label="Payés" value={counts.paid} tint="mint" icon={<Wallet/>} onClick={()=>setTile('paid')}/>
      <StatCard label="À confirmer" value={counts.pending} tint="butter" icon={<Hourglass/>} sub="signalés par les parents" onClick={()=>setTile('pending')}/>
      <StatCard label="En retard" value={counts.overdue} tint="coral" icon={<Wallet/>} onClick={()=>setTile('overdue')}/>
      <StatCard label="Impayés (à venir)" value={counts.due} tint="sky" icon={<Wallet/>} onClick={()=>setTile('due')}/>
    </div>

    {tile && (()=>{ const rows=byStatus(tile)
      const TITLE={paid:'Mois payés',pending:'Versements à confirmer',overdue:'Mois en retard',due:'Mois impayés (à venir)'}
      return (
      <Modal open onClose={()=>setTile(null)} title={`${TITLE[tile]} · ${counts[tile]} mois`} size="xl"
        footer={<>{tile==='pending'&&rows.length>0&&<Btn onClick={()=>{confirmAll();setTile(null)}}><Check size={15}/> Tout confirmer</Btn>}
          {tile==='overdue'&&rows.length>0&&<Btn onClick={()=>{remindAll();setTile(null)}}><BellRing size={15}/> Relancer tous</Btn>}
          <Btn variant="ghost" onClick={()=>setTile(null)}>Fermer</Btn></>}>
        {rows.length===0 ? <EmptyState icon={<Wallet size={24}/>} title="Aucun mois dans cet état" sub="Rien à afficher pour le moment."/>
        : <div className="space-y-1.5">
          {rows.map(({s,months})=>(
            <div key={s.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-canvas">
              <Avatar name={s.name} seed={s.id} size={32}/>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold truncate">{s.name}</span>
                <span className="flex flex-wrap gap-1 mt-0.5">
                  {months.map(p=><span key={p.mi} className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{background:COL[tile]+'18',color:COL[tile]}}>{p.month}</span>)}
                </span></span>
              {tile==='pending'&&<Btn size="sm" onClick={()=>cycle(s.id,months[0].mi)}><Check size={14}/> Confirmer</Btn>}
              {tile==='overdue'&&<Btn size="sm" variant="soft" onClick={()=>remind(s.id)}><BellRing size={13}/> Relancer</Btn>}
            </div>))}
        </div>}
      </Modal>) })()}

    {toConfirm.length>0 && <Card className="p-4 mb-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-bold flex items-center gap-1.5"><Hourglass size={16} style={{color:STATUS.warn}}/> Versements signalés — à confirmer <span className="text-xs text-muted font-normal">({toConfirm.length})</span></h3>
        <Btn size="sm" onClick={confirmAll}><Check size={14}/> Tout confirmer</Btn>
      </div>
      <p className="text-xs text-muted mb-3">Un parent a signalé avoir payé. Confirmez après encaissement — le mois passe en « Payé » et le parent est prévenu.</p>
      <div className="space-y-1.5 max-h-64 overflow-y-auto scroll-thin">
        {toConfirm.map(({s,p,mi})=>(
          <div key={s.id+p.month} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-canvas">
            <Avatar name={s.name} seed={s.id} size={32}/>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold truncate">{s.name}</span>
              <span className="block text-[12px] text-muted">{p.month} · signalé par le parent</span></span>
            <Btn size="sm" onClick={()=>cycle(s.id,mi)}><Check size={14}/> Confirmer</Btn>
          </div>))}
      </div>
    </Card>}
    {d.students.length===0 ? <Card><EmptyState icon={<Wallet size={26}/>} title="Aucun élève" sub="Les échéanciers de paiement apparaîtront ici dès qu'un élève sera inscrit."/></Card>
    : <Card className="p-4 overflow-x-auto scroll-thin">
      <table className="w-full text-sm">
        <thead><tr className="text-[12px] uppercase text-muted"><th className="text-left px-2 py-2">Élève</th>{FEE_MONTHS.map(m=><th key={m} className="px-1 py-2">{m}</th>)}<th></th></tr></thead>
        <tbody className="divide-y divide-line">
          {d.students.map(s=>(
            <tr key={s.id}>
              <td className="px-2 py-2"><div className="flex items-center gap-2 min-w-[160px]"><Avatar name={s.name} seed={s.id} size={28}/><span className="font-medium">{s.name}</span></div></td>
              {d.payments[s.id].map((p,mi)=>(
                <td key={mi} className="px-1 py-2 text-center">
                  <button onClick={()=>cycle(s.id,mi)} title={`${p.month} · ${COL_FR[p.status]}`} className="w-6 h-6 rounded-md mx-auto block" style={{background:COL[p.status]}}/>
                </td>
              ))}
              <td className="px-2"><button onClick={()=>remind(s.id)} className="text-xs font-semibold inline-flex items-center gap-1 accent-text"><BellRing size={13}/> relancer</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-4 mt-3 text-xs text-muted">{Object.entries(COL).map(([k,c])=><span key={k} className="flex items-center gap-1.5"><i className="w-3 h-3 rounded" style={{background:c}}/>{COL_FR[k]}</span>)}</div>
    </Card>}
  </>)
}
