import { db } from '../db.js'
import { PageHead, Card, StatCard, Avatar, IconTile } from '../components/ui.jsx'
import { Building2, Users, GraduationCap, KeyRound } from 'lucide-react'
export default function Schools(){
  const d=db(); const sadmin=d.users.find(u=>u.role==='schooladmin')
  return (<>
    <PageHead title="Écoles" sub="Établissements sur Kogia Edu"/>
    <div className="grid sm:grid-cols-3 gap-4 mb-5">
      <StatCard label="Écoles" value="1" tint="brand" icon={<Building2/>}/>
      <StatCard label="Élèves" value={d.students.length} tint="sky" icon={<Users/>}/>
      <StatCard label="Enseignants" value={d.teachers.length} tint="butter" icon={<GraduationCap/>}/>
    </div>
    <Card className="p-6">
      <div className="flex items-center gap-4">
        <IconTile icon={<Building2/>} tint="brand" size={56}/>
        <div className="flex-1"><div className="font-bold text-lg">École Al-Nour</div><div className="text-muted text-sm">Tunis · Année 2025/2026 · Active</div></div>
      </div>
      <div className="mt-5 rounded-2xl bg-canvas p-4">
        <div className="text-xs font-bold text-muted flex items-center gap-1.5 mb-2"><KeyRound size={14}/> Compte Direction (créé par vous)</div>
        <div className="flex items-center gap-3"><Avatar name={sadmin.name} seed={sadmin.id}/>
          <div className="text-sm"><b>{sadmin.name}</b><div className="text-muted">{sadmin.email} · mot de passe : <code>{sadmin.pw}</code></div></div></div>
        <p className="text-xs text-muted mt-3">La Direction crée ensuite tous les autres comptes (Administration, Enseignant, Surveillant, Parent) et les fiches élèves dans <b>Comptes</b>.</p>
      </div>
    </Card>
  </>)
}
