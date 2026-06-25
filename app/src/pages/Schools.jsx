import { db } from '../db.js'
import { PageHead, Card, StatCard, Avatar } from '../components/ui.jsx'
import { Building2, Users, GraduationCap, KeyRound } from 'lucide-react'
export default function Schools(){
  const d=db(); const sadmin=d.users.find(u=>u.role==='schooladmin')
  return (<>
    <PageHead title="Schools" sub="Tenants on Coreon Edu"/>
    <div className="grid sm:grid-cols-3 gap-4 mb-5">
      <StatCard label="Schools" value="1" tint="brand" icon={<Building2/>}/>
      <StatCard label="Students" value={d.students.length} tint="sky" icon={<Users/>}/>
      <StatCard label="Teachers" value={d.teachers.length} tint="butter" icon={<GraduationCap/>}/>
    </div>
    <Card className="p-6">
      <div className="flex items-center gap-4">
        <span className="w-14 h-14 rounded-2xl grid place-items-center text-white" style={{background:'#6C5CE7'}}><Building2/></span>
        <div className="flex-1"><div className="font-bold text-lg">Al-Noor International School</div><div className="text-muted text-sm">Tunis · Year 2026/2027 · Active</div></div>
      </div>
      <div className="mt-5 rounded-2xl bg-canvas p-4">
        <div className="text-xs font-bold text-muted flex items-center gap-1.5 mb-2"><KeyRound size={14}/> School Admin account (provisioned by you)</div>
        <div className="flex items-center gap-3"><Avatar name={sadmin.name} color="#6C5CE7"/>
          <div className="text-sm"><b>{sadmin.name}</b><div className="text-muted">{sadmin.email} · password: <code>{sadmin.pw}</code></div></div></div>
        <p className="text-xs text-muted mt-3">The School Admin then creates all other accounts (Admin, Teacher, Supervisor, Parent) and student profiles under <b>Accounts</b>.</p>
      </div>
    </Card>
  </>)
}
