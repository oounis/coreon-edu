import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { current } from '../auth.js'
import { inboxFor, markRead, markAllRead } from '../notify.js'
import { safeLink } from '../access.js'
import { PageHead, Card, Btn, Tabs, EmptyState } from '../components/ui.jsx'
import { NotifRow } from '../components/NotifItem.jsx'
import { isToday, isThisWeek } from 'date-fns'
import { CheckCheck, Bell } from 'lucide-react'
export default function Notifications(){
  const u=current(); const nav=useNavigate(); const [,force]=useState(0); const [tab,setTab]=useState('all')
  let all=inboxFor(u); if(tab==='unread') all=all.filter(n=>!n.read)
  const today=all.filter(n=>isToday(n.at)); const week=all.filter(n=>!isToday(n.at)&&isThisWeek(n.at)); const older=all.filter(n=>!isThisWeek(n.at))
  const open=n=>{ markRead(n.id); nav(safeLink(u.role, n.link)) }
  const Group=({title,items})=> items.length>0 && <div className="mb-5"><div className="text-xs font-bold uppercase text-muted mb-1 px-1">{title}</div><Card className="p-2 divide-y divide-line">{items.map(n=><NotifRow key={n.id} n={n} onClick={()=>open(n)}/>)}</Card></div>
  return (<>
    <PageHead title="Notifications" sub={`${inboxFor(u).filter(n=>!n.read).length} non lues`} action={<Btn variant="ghost" onClick={()=>{markAllRead(u);force(x=>x+1)}}><CheckCheck size={15}/> Tout marquer comme lu</Btn>}/>
    <Tabs className="mb-4" tabs={[{value:'all',label:'Toutes'},{value:'unread',label:'Non lues',count:inboxFor(u).filter(n=>!n.read).length}]} value={tab} onChange={setTab}/>
    {all.length===0 && <Card><EmptyState icon={<Bell size={26}/>} title="Vous êtes à jour" sub={tab==='unread'?'Aucune notification non lue.':'Aucune notification pour le moment.'}/></Card>}
    <Group title="Aujourd'hui" items={today}/><Group title="Cette semaine" items={week}/><Group title="Plus tôt" items={older}/>
  </>)
}
