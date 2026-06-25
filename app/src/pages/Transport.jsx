import { db } from '../db.js'
import { PageHead, Card } from '../components/ui.jsx'
import { Bus, MapPin, User } from 'lucide-react'
export default function Transport(){
  const d=db()
  return (<>
    <PageHead title="Transport" sub={`${d.routes.length} routes`}/>
    <div className="grid md:grid-cols-2 gap-4">
      {d.routes.map(r=>(<Card key={r.id} className="p-5">
        <div className="flex items-center gap-3 mb-3"><span className="w-11 h-11 rounded-xl grid place-items-center text-white" style={{background:'#FFA62B'}}><Bus size={20}/></span>
          <div><div className="font-bold">{r.name}</div><div className="text-sm text-muted">Bus {r.bus} · {r.students} students</div></div></div>
        <div className="text-sm text-muted flex items-center gap-1 mb-2"><User size={14}/> Driver: <b className="text-ink">{r.driver}</b></div>
        <div className="flex flex-wrap gap-2">{r.stops.map(s=><span key={s} className="text-xs px-2.5 py-1 rounded-full bg-canvas flex items-center gap-1"><MapPin size={11}/> {s}</span>)}</div>
      </Card>))}
    </div>
  </>)
}
