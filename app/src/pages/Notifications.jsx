import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { current } from '../auth.js'
import { inboxFor, markRead, markAllRead } from '../notify.js'
import { PageHead, Card, Btn } from '../components/ui.jsx'
import { formatDistanceToNow, isToday } from 'date-fns'
import { Bell, FileText, ShieldAlert, CreditCard, Megaphone, MessageSquare, Star, Check } from 'lucide-react'
const ICON={request:FileText,incident:ShieldAlert,payment:CreditCard,notice:Megaphone,message:MessageSquare,evaluation:Star,info:Bell}
const TINT={request:'#36C5F0',incident:'#FF6B81',payment:'#FFA62B',notice:'#6C5CE7',message:'#2BD9A8',evaluation:'#8B5CF6',info:'#8A93A6'}
export default function Notifications(){
  const u=current(); const nav=useNavigate(); const [,force]=useState(0)
  const all=inboxFor(u); const today=all.filter(n=>isToday(n.at)); const earlier=all.filter(n=>!isToday(n.at))
  const openN=n=>{ markRead(n.id); nav(n.link||'/app'); }
  const Row=({n})=>{ const I=ICON[n.kind]||Bell; return (
    <button onClick={()=>openN(n)} className={`w-full text-left flex items-start gap-3 p-4 rounded-2xl border ${n.read?'border-line bg-white':'border-transparent accent-soft'} hover:shadow-sm transition`}>
      <span className="w-10 h-10 rounded-xl grid place-items-center text-white shrink-0" style={{background:TINT[n.kind]||'#8A93A6'}}><I size={18}/></span>
      <div className="flex-1"><div className="font-semibold text-sm flex items-center gap-2">{n.title}{!n.read&&<span className="w-2 h-2 rounded-full" style={{background:'#FF6B81'}}/>}</div>
        <div className="text-sm text-muted">{n.body}</div>
        <div className="text-[11px] text-muted mt-0.5">{formatDistanceToNow(n.at,{addSuffix:true})}{n.link&&<span className="accent-text font-semibold"> · open →</span>}</div></div>
    </button>) }
  return (<>
    <PageHead title="Notifications" sub={`${all.filter(n=>!n.read).length} unread`} action={<Btn variant="ghost" onClick={()=>{markAllRead(u);force(x=>x+1)}}><Check size={15}/> Mark all read</Btn>}/>
    {all.length===0 && <Card className="p-10 text-center text-muted">You're all caught up 🎉</Card>}
    {today.length>0&&<><div className="text-xs font-bold uppercase text-muted mb-2">Today</div><div className="space-y-2 mb-6">{today.map(n=><Row key={n.id} n={n}/>)}</div></>}
    {earlier.length>0&&<><div className="text-xs font-bold uppercase text-muted mb-2">Earlier</div><div className="space-y-2">{earlier.map(n=><Row key={n.id} n={n}/>)}</div></>}
  </>)
}
