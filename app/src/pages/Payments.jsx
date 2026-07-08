import { useState } from 'react'
import { current } from '../auth.js'
import { db, mutate, studentById } from '../db.js'
import { notify } from '../notify.js'
import { PageHead, Card, Avatar, Btn, EmptyState, STATUS } from '../components/ui.jsx'
import { CreditCard, Check } from 'lucide-react'
import toast from 'react-hot-toast'
const COL={paid:STATUS.ok,pending:STATUS.warn,overdue:STATUS.danger,due:STATUS.neutral}
const FR={paid:'Payé',pending:'En attente',overdue:'En retard',due:'Impayé'}
export default function Payments(){
  const u=current(); const [,force]=useState(0)
  const child=studentById(u.childIds?.[0]); const months=db().payments[child?.id]||[]
  const paid=months.filter(m=>m.status==='paid').length
  const unpaid=months.filter(m=>m.status!=='paid')
  const pay=(i)=>{ mutate(db=>{db.payments[child.id][i].status='paid'})
    const m=months[i]
    notify({role:'admin',kind:'payment',actor:u.name,title:'Paiement reçu',body:`${child.name} · ${m.month} réglé`,link:'/app/finance'})
    notify({role:'schooladmin',kind:'payment',actor:u.name,title:'Paiement reçu',body:`${child.name} · ${m.month} réglé`,link:'/app/finance'})
    toast.success(`Mois de ${m.month} réglé · administration notifiée`); force(x=>x+1) }
  const payAll=()=>{ mutate(db=>{db.payments[child.id].forEach(m=>{if(m.status!=='paid')m.status='paid'})})
    notify({role:'admin',kind:'payment',actor:u.name,title:'Paiement reçu',body:`${child.name} · ${unpaid.length} mois réglés`,link:'/app/finance'})
    notify({role:'schooladmin',kind:'payment',actor:u.name,title:'Paiement reçu',body:`${child.name} · solde réglé`,link:'/app/finance'})
    toast.success('Solde réglé · administration notifiée'); force(x=>x+1) }
  return (<>
    <PageHead title="Mes paiements" sub={`${child?.name} · ${paid}/${months.length} mois payés`}
      action={unpaid.length>0&&<Btn onClick={payAll}><Check size={16}/> Tout régler ({unpaid.length})</Btn>}/>
    <Card className="p-6 max-w-[680px]">
      <div className="flex items-center gap-3 mb-5"><Avatar name={child?.name} seed={child?.id||'x'} size={44}/><div><div className="font-bold">{child?.name}</div><div className="text-muted text-sm">Frais de scolarité · mensuels</div></div></div>
      {months.length===0 && <EmptyState icon={<CreditCard size={26}/>} title="Aucune échéance" sub="L'échéancier de paiement apparaîtra ici dès qu'il sera établi."/>}
      <div className="grid grid-cols-5 gap-2">
        {months.map((m,i)=>(
          <div key={i} className="rounded-xl border border-line p-2 text-center">
            <div className="text-xs font-semibold">{m.month}</div>
            <div className="mt-1 w-full h-1.5 rounded-full" style={{background:COL[m.status]}}/>
            <div className="text-[10px] text-muted mt-1">{FR[m.status]}</div>
            {m.status!=='paid'
              ? <button onClick={()=>pay(i)} className="mt-1.5 text-[10px] font-bold accent-text inline-flex items-center gap-0.5"><CreditCard size={11}/> Payer</button>
              : <div className="mt-1.5 text-[10px] text-muted inline-flex items-center gap-0.5"><Check size={11}/> Réglé</div>}
          </div>
        ))}
      </div>
      {months.length>0 && <div className="flex gap-4 mt-4 text-xs text-muted">{Object.entries(COL).map(([k,c])=><span key={k} className="flex items-center gap-1.5"><i className="w-3 h-3 rounded" style={{background:c}}/>{FR[k]}</span>)}</div>}
    </Card>
  </>)
}
