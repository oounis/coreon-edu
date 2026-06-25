import { useState } from 'react'
import { db, mutate, FEE_MONTHS, studentById } from '../db.js'
import { notify } from '../notify.js'
import { PageHead, Card, StatCard, Avatar, Btn } from '../components/ui.jsx'
import { studentColor } from '../data.js'
import { Wallet, BellRing } from 'lucide-react'
import toast from 'react-hot-toast'
const COL={paid:'#2BD9A8',pending:'#FFA62B',overdue:'#FF6B81',due:'#C7CDDA'}
const NEXT={due:'paid',overdue:'paid',pending:'paid',paid:'pending'}
export default function Finance(){
  const [,force]=useState(0); const d=db()
  const counts={paid:0,pending:0,overdue:0,due:0}; Object.values(d.payments).forEach(a=>a.forEach(p=>counts[p.status]++))
  const cycle=(sid,mi)=>{ mutate(db=>{ const p=db.payments[sid][mi]; p.status=NEXT[p.status]||'paid' }); force(x=>x+1) }
  const remind=(sid)=>{ const s=studentById(sid); const unpaid=d.payments[sid].filter(p=>p.status!=='paid').map(p=>p.month)
    const parent=d.users.find(u=>u.id===s.parentId)
    if(parent) notify({to:parent.id,kind:'payment',title:'Fee reminder',body:`${unpaid.length} unpaid month(s) for ${s.name}: ${unpaid.join(', ')}`})
    toast.success(parent?`Reminder sent to ${s.name}'s parent`:'No parent linked') }
  return (<>
    <PageHead title="Finance · Fees collection" sub="Tap a month to mark it paid. Remind parents in one click."/>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <StatCard label="Paid" value={counts.paid} tint="mint" icon={<Wallet/>}/>
      <StatCard label="Pending" value={counts.pending} tint="butter" icon={<Wallet/>}/>
      <StatCard label="Overdue" value={counts.overdue} tint="coral" icon={<Wallet/>}/>
      <StatCard label="Unpaid (future)" value={counts.due} tint="sky" icon={<Wallet/>}/>
    </div>
    <Card className="p-4 overflow-x-auto scroll-thin">
      <table className="w-full text-sm">
        <thead><tr className="text-[11px] uppercase text-muted"><th className="text-left px-2 py-2">Student</th>{FEE_MONTHS.map(m=><th key={m} className="px-1 py-2">{m}</th>)}<th></th></tr></thead>
        <tbody className="divide-y divide-line">
          {d.students.map(s=>(
            <tr key={s.id}>
              <td className="px-2 py-2"><div className="flex items-center gap-2 min-w-[160px]"><Avatar name={s.name} color={studentColor(s.id)} size={28}/><span className="font-medium">{s.name}</span></div></td>
              {d.payments[s.id].map((p,mi)=>(
                <td key={mi} className="px-1 py-2 text-center">
                  <button onClick={()=>cycle(s.id,mi)} title={p.status} className="w-6 h-6 rounded-md mx-auto block" style={{background:COL[p.status]}}/>
                </td>
              ))}
              <td className="px-2"><button onClick={()=>remind(s.id)} className="text-xs font-semibold inline-flex items-center gap-1 accent-text"><BellRing size={13}/> remind</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-4 mt-3 text-xs text-muted">{Object.entries(COL).map(([k,c])=><span key={k} className="flex items-center gap-1.5"><i className="w-3 h-3 rounded" style={{background:c}}/>{k}</span>)}</div>
    </Card>
  </>)
}
