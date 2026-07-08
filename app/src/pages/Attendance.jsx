import { useState } from 'react'
import { db, mutate, studentById } from '../db.js'
import { notify } from '../notify.js'
import { PageHead, Card, Avatar, Btn, Badge, EmptyState, STATUS } from '../components/ui.jsx'
import { currentClass } from '../data.js'
import { Check, CalendarCheck } from 'lucide-react'
import toast from 'react-hot-toast'
const CYCLE={present:'absent',absent:'late',late:'present'}
const COL={present:STATUS.ok,absent:STATUS.danger,late:STATUS.warn}
const FR={present:'Présent',absent:'Absent',late:'Retard'}
export default function Attendance(){
  const cls=currentClass(new Date()); const today=new Date().toISOString().slice(0,10); const key=cls.cls.id+'_'+today
  const [marks,setMarks]=useState(()=> db().attendance[key] || Object.fromEntries(cls.students.map(s=>[s.id,'present'])))
  const [tick,setTick]=useState(0)
  const counts=Object.values(marks).reduce((a,v)=>{a[v]++;return a},{present:0,absent:0,late:0})
  // historique des appels déjà enregistrés pour cette classe
  const history=Object.keys(db().attendance||{}).filter(k=>k.startsWith(cls.cls.id+'_')).map(k=>{
    const m=db().attendance[k]; const c={present:0,absent:0,late:0}; Object.values(m).forEach(v=>c[v]!=null&&c[v]++)
    return {date:k.split('_').slice(1).join('_'),...c}
  }).sort((a,b)=>b.date.localeCompare(a.date))
  const save=()=>{
    mutate(db=>{db.attendance[key]=marks})
    setTick(x=>x+1)
    // reflect to admin + each absent/late parent
    const flagged=cls.students.filter(s=>marks[s.id]!=='present')
    notify({role:'admin',kind:'info',title:`Appel — ${cls.cls.name}`,body:`${counts.present} présents · ${counts.absent} absents · ${counts.late} retards (${cls.slot.subject})`,link:'/app/attendance'})
    notify({role:'schooladmin',kind:'info',title:`Appel — ${cls.cls.name}`,body:`${counts.absent} absent(s), ${counts.late} retard(s)`,link:'/app/attendance'})
    flagged.forEach(s=>{ if(s.parentId) notify({to:s.parentId,kind:'info',title:`Présence de ${s.name.split(' ')[0]}`,body:`${s.name} a été marqué(e) ${FR[marks[s.id]].toLowerCase()} aujourd'hui (${cls.slot.subject}).`,link:'/app'}) })
    toast.success('Appel enregistré · direction et parents notifiés')
  }
  return (<>
    <PageHead title="Appel / Présence" sub={`${cls.cls.name} · ${cls.slot.subject} · ${today}`} action={<Btn onClick={save}><Check size={16}/> Enregistrer</Btn>}/>
    <div className="flex gap-3 mb-4">{Object.entries(counts).map(([k,v])=><div key={k} className="card px-4 py-2 text-sm"><span className="font-bold" style={{color:COL[k]}}>{v}</span> <span className="text-muted">{FR[k]}</span></div>)}</div>
    <Card className="p-3"><div className="grid sm:grid-cols-2 gap-2">
      {cls.students.map(s=>(<button key={s.id} onClick={()=>setMarks(m=>({...m,[s.id]:CYCLE[m[s.id]]}))} className="flex items-center gap-3 p-2 rounded-xl border border-line hover:bg-canvas">
        <Avatar name={s.name} seed={s.id} size={32}/><span className="flex-1 text-left text-sm font-medium">{s.name}</span>
        <Badge status={marks[s.id]}/></button>))}
    </div><p className="text-xs text-muted mt-2 px-1">Touchez un élève pour changer : présent → absent → retard. La direction et les parents concernés sont notifiés à l'enregistrement.</p></Card>
    <Card className="p-4 mt-4"><h3 className="font-bold mb-2 text-sm">Appels enregistrés · {cls.cls.name}</h3>
      {history.length? <div className="space-y-1.5">{history.map(h=>(<div key={h.date} className="flex items-center justify-between text-sm border-b border-line pb-1.5 last:border-0">
        <span className="text-muted">{h.date}</span>
        <span className="flex gap-3"><b style={{color:COL.present}}>{h.present}</b> présents · <b style={{color:COL.absent}}>{h.absent}</b> absents · <b style={{color:COL.late}}>{h.late}</b> retards</span></div>))}</div>
       : <EmptyState icon={<CalendarCheck size={26}/>} title="Aucun appel enregistré" sub="Les appels de cette classe apparaîtront ici après le premier enregistrement."/>}
    </Card>
  </>)
}
