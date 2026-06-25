import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts'
import { Users, GraduationCap, Wallet, ShieldAlert, ClipboardCheck, CreditCard, Star, ArrowRight } from 'lucide-react'
import { current } from '../auth.js'
import { db, FEE_MONTHS } from '../db.js'
import { StatCard, Card, PageHead, Badge, Avatar } from '../components/ui.jsx'
import { currentClass, studentColor } from '../data.js'
import { studentSummary } from '../results.js'

export default function Dashboard(){
  const u=current(); const d=db()
  const feeCounts = ()=>{ const c={paid:0,pending:0,overdue:0,due:0}; Object.values(d.payments).forEach(arr=>arr.forEach(p=>c[p.status]++)); return c }
  const greet = `Welcome back, ${u.name.split(' ')[0]} 👋`

  if(u.role==='teacher'){
    const cls=currentClass(new Date())
    return (<><PageHead title={greet} sub="Your teaching day at a glance."/>
      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <StatCard label="Class now" value={cls.cls.name} sub={cls.slot.subject} tint="mint" icon={<ClipboardCheck/>}/>
        <StatCard label="Students" value={cls.students.length} tint="sky" icon={<Users/>}/>
        <StatCard label="My requests" value={d.requests.filter(r=>r.by===u.id).length} tint="butter" icon={<Star/>}/>
      </div>
      <Card className="p-6 flex items-center justify-between flex-wrap gap-4">
        <div><div className="text-xs font-bold uppercase accent-text">Live class</div>
          <div className="text-xl font-extrabold">{cls.cls.name} · {cls.slot.subject}</div>
          <div className="text-muted text-sm">{cls.slot.start}–{cls.slot.end} · {cls.students.length} students {cls.isLive&&<span className="ml-1 text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{background:'#2BD9A8'}}>● LIVE</span>}</div></div>
        <Link to="/app/evaluate" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-white font-semibold accent-bg">Evaluate the class <ArrowRight size={17}/></Link>
      </Card></>)
  }

  if(u.role==='parent'){
    const childId=u.childIds?.[0]; const ev=d.evaluations.find(e=>Object.values(e.placements||{}).some(p=>p[childId]))
    const months=(d.payments[childId]||[]); const paid=months.filter(m=>m.status==='paid').length
    const sum= ev? studentSummary(ev,childId):null
    return (<><PageHead title={greet} sub="Your child, at a glance."/>
      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <StatCard label="Latest score" value={sum?`${sum.score}/100`:'—'} tint="mint" icon={<Star/>}/>
        <StatCard label="Months paid" value={`${paid}/${months.length}`} tint="sky" icon={<CreditCard/>}/>
        <StatCard label="Notices" value={d.notifications.filter(n=>n.role==='parent'||n.to===u.id).length} tint="grape" icon={<ShieldAlert/>}/>
      </div>
      <div className="flex gap-3"><Link to="/app/payments" className="accent-bg text-white rounded-xl px-5 py-3 font-semibold">See payments</Link>
        <Link to="/app/notices" className="bg-white border border-line rounded-xl px-5 py-3 font-semibold">Notices</Link></div></>)
  }

  if(u.role==='supervisor'){
    return (<><PageHead title={greet} sub="Keep the school safe and informed."/>
      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <StatCard label="Open incidents" value={d.incidents.filter(i=>i.status==='open').length} tint="coral" icon={<ShieldAlert/>}/>
        <StatCard label="Students" value={d.students.length} tint="sky" icon={<Users/>}/>
        <StatCard label="Reported by me" value={d.incidents.length} tint="butter" icon={<ShieldAlert/>}/>
      </div>
      <Link to="/app/incidents" className="accent-bg text-white rounded-xl px-5 py-3 font-semibold inline-block">Report an incident</Link></>)
  }

  // owner / schooladmin / admin
  const fc=feeCounts()
  const pie=[['Paid','#2BD9A8'],['Pending','#FFA62B'],['Overdue','#FF6B81'],['Unpaid','#C7CDDA']].map(([n,c],i)=>({name:n,value:Object.values(fc)[i],color:c}))
  const attend=FEE_MONTHS.slice(0,7).map((m,i)=>({m,present:18+((i*5)%6),absent:1+((i*3)%4)}))
  return (<><PageHead title={greet} sub="School overview."/>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <StatCard label="Students" value={d.students.length} tint="grape" icon={<Users/>}/>
      <StatCard label="Teachers" value={d.teachers.length} tint="butter" icon={<GraduationCap/>}/>
      <StatCard label="Open incidents" value={d.incidents.filter(i=>i.status==='open').length} tint="coral" icon={<ShieldAlert/>}/>
      <StatCard label="Pending requests" value={d.requests.filter(r=>r.status==='pending').length} tint="sky" icon={<Wallet/>}/>
    </div>
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="p-5"><h3 className="font-bold mb-3">Fees status</h3>
        <div className="h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={88} paddingAngle={2}>{pie.map((p,i)=><Cell key={i} fill={p.color}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div>
        <div className="flex flex-wrap gap-3 justify-center">{pie.map(p=><span key={p.name} className="text-xs flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full" style={{background:p.color}}/>{p.name} · {p.value}</span>)}</div>
      </Card>
      <Card className="p-5"><h3 className="font-bold mb-3">Attendance (weekly)</h3>
        <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={attend}><XAxis dataKey="m" tick={{fontSize:11,fill:'#8A93A6'}}/><Tooltip/><Bar dataKey="present" stackId="a" fill="#36C5F0" radius={[4,4,0,0]}/><Bar dataKey="absent" stackId="a" fill="#FFE0E5" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
      </Card>
    </div></>)
}
