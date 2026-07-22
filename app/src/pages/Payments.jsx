import { useState } from 'react'
import { current } from '@core/auth.js'
import { db, mutate, studentById } from '@core/db.js'
import { notify } from '@core/notify.js'
import { PageHead, Card, Avatar, Btn, Select, EmptyState, STATUS } from '../components/ui.jsx'
import { CreditCard, Check, Send, Hourglass, Info } from 'lucide-react'
import toast from 'react-hot-toast'
const COL={paid:STATUS.ok,pending:STATUS.warn,overdue:STATUS.danger,due:STATUS.neutral}
const FR={paid:'Payé',pending:'À confirmer',overdue:'En retard',due:'Impayé'}

// Un parent NE PEUT PAS marquer ses frais comme payés : il signale son versement,
// et seule l'administration le confirme après encaissement (voir Finance.jsx).
// Avant, un clic sur « Tout régler » passait les mois en « Payé » sans qu'un dinar
// n'ait été versé — et le tableau de bord de la Direction comptait cet argent.
export default function Payments(){
  const u=current(); const [,force]=useState(0)
  // un parent de plusieurs enfants ne voyait (et ne pouvait payer) que le premier
  const kids=(u.childIds||[]).map(studentById).filter(Boolean)
  const [kidId,setKidId]=useState(kids[0]?.id)
  const child=kids.find(k=>k.id===kidId)||kids[0]
  const months=db().payments[child?.id]||[]
  const paid=months.filter(m=>m.status==='paid').length
  const declarable=months.filter(m=>m.status==='due'||m.status==='overdue')
  const awaiting=months.filter(m=>m.status==='pending').length

  const declare=(i)=>{
    const m=months[i]
    if(m.status==='paid'||m.status==='pending') return
    mutate(db=>{db.payments[child.id][i].status='pending'})
    notify({role:'admin',kind:'payment',actor:u.name,title:'Paiement signalé',body:`${child.name} · ${m.month} · à confirmer`,link:'/app/finance'})
    notify({role:'schooladmin',kind:'payment',actor:u.name,title:'Paiement signalé',body:`${child.name} · ${m.month} · à confirmer`,link:'/app/finance'})
    toast.success(`${m.month} signalé · en attente de confirmation de l'administration`); force(x=>x+1) }

  const declareAll=()=>{
    if(declarable.length===0) return
    mutate(db=>{db.payments[child.id].forEach(m=>{ if(m.status==='due'||m.status==='overdue') m.status='pending' })})
    notify({role:'admin',kind:'payment',actor:u.name,title:'Paiement signalé',body:`${child.name} · ${declarable.length} mois signalés : à confirmer`,link:'/app/finance'})
    notify({role:'schooladmin',kind:'payment',actor:u.name,title:'Paiement signalé',body:`${child.name} · ${declarable.length} mois signalés : à confirmer`,link:'/app/finance'})
    toast.success("Versement signalé · l'administration confirmera après encaissement"); force(x=>x+1) }
  if(!child) return <Card><EmptyState icon={<CreditCard size={26}/>} title="Aucun enfant associé" sub="Demandez à la direction de lier votre compte à votre enfant."/></Card>
  return (<>
    <PageHead title="Mes paiements" sub={`${child.name} · ${paid}/${months.length} mois confirmés`}
      action={<div className="flex items-center gap-2">
        {kids.length>1&&<Select value={child.id} onChange={e=>setKidId(e.target.value)}>{kids.map(k=><option key={k.id} value={k.id}>{k.name}</option>)}</Select>}
        {declarable.length>0&&<Btn onClick={declareAll}><Send size={16}/> Signaler un versement ({declarable.length})</Btn>}
      </div>}/>

    <div className="flex items-start gap-2.5 rounded-2xl px-4 py-3 mb-4 text-sm max-w-[680px]" style={{background:STATUS.infoSoft,color:'#0B5E86'}}>
      <Info size={16} className="mt-0.5 shrink-0"/>
      <span>Signalez votre versement ici : l'administration le confirme après encaissement, et le mois passe alors en <b>Payé</b>. {awaiting>0 && <>Vous avez <b>{awaiting} mois</b> en attente de confirmation.</>}</span>
    </div>

    <Card className="p-6 max-w-[680px]">
      <div className="flex items-center gap-3 mb-5"><Avatar name={child?.name} seed={child?.id||'x'} size={44}/><div><div className="font-bold">{child?.name}</div><div className="text-muted text-sm">Frais de scolarité · mensuels</div></div></div>
      {months.length===0 && <EmptyState icon={<CreditCard size={26}/>} title="Aucune échéance" sub="L'échéancier de paiement apparaîtra ici dès qu'il sera établi."/>}
      <div className="grid grid-cols-5 gap-2">
        {months.map((m,i)=>(
          <div key={m.month} className="rounded-xl border border-line p-2 text-center">
            <div className="text-xs font-semibold">{m.month}</div>
            <div className="mt-1 w-full h-1.5 rounded-full" style={{background:COL[m.status]}}/>
            <div className="text-[11px] text-muted mt-1">{FR[m.status]}</div>
            {m.status==='paid' ? <div className="mt-1.5 text-[11px] text-muted inline-flex items-center gap-0.5"><Check size={11}/> Confirmé</div>
             : m.status==='pending' ? <div className="mt-1.5 text-[11px] inline-flex items-center gap-0.5" style={{color:STATUS.warn}}><Hourglass size={11}/> En attente</div>
             : <button onClick={()=>declare(i)} className="mt-1.5 text-[11px] font-bold accent-text inline-flex items-center gap-0.5"><Send size={11}/> Signaler</button>}
          </div>
        ))}
      </div>
      {months.length>0 && <div className="flex gap-4 mt-4 text-xs text-muted flex-wrap">{Object.entries(COL).map(([k,c])=><span key={k} className="flex items-center gap-1.5"><i className="w-3 h-3 rounded" style={{background:c}}/>{FR[k]}</span>)}</div>}
    </Card>
  </>)
}
