import { current } from '../auth.js'
import { db, studentById } from '../db.js'
import { PageHead, Card, Avatar, Badge } from '../components/ui.jsx'
import { studentColor } from '../data.js'
const COL={paid:'#2BD9A8',pending:'#FFA62B',overdue:'#FF6B81',due:'#C7CDDA'}
export default function Payments(){
  const u=current(); const child=studentById(u.childIds?.[0]); const months=db().payments[child?.id]||[]
  const paid=months.filter(m=>m.status==='paid').length
  return (<>
    <PageHead title="My payments" sub={`${child?.name} · ${paid}/${months.length} months paid`}/>
    <Card className="p-6 max-w-[640px]">
      <div className="flex items-center gap-3 mb-5"><Avatar name={child?.name} color={studentColor(child?.id||'x')} size={44}/><div><div className="font-bold">{child?.name}</div><div className="text-muted text-sm">Tuition · monthly</div></div></div>
      <div className="grid grid-cols-5 gap-2">
        {months.map((m,i)=>(
          <div key={i} className="rounded-xl border border-line p-2 text-center">
            <div className="text-xs font-semibold">{m.month}</div>
            <div className="mt-1 w-full h-1.5 rounded-full" style={{background:COL[m.status]}}/>
            <div className="text-[10px] text-muted mt-1 capitalize">{m.status==='due'?'unpaid':m.status}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-4 text-xs text-muted">{Object.entries(COL).map(([k,c])=><span key={k} className="flex items-center gap-1.5"><i className="w-3 h-3 rounded" style={{background:c}}/>{k==='due'?'unpaid':k}</span>)}</div>
    </Card>
  </>)
}
