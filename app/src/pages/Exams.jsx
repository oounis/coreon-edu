import { db } from '../db.js'
import { PageHead, Table } from '../components/ui.jsx'
import { GraduationCap } from 'lucide-react'
export default function Exams(){
  const d=db()
  return (<>
    <PageHead title="Exams" sub="Upcoming examination schedule"/>
    <Table head={['Class','Subject','Date','Total marks']}>
      {d.exams.map(x=>(<tr key={x.id} className="hover:bg-canvas">
        <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="w-9 h-9 rounded-lg grid place-items-center accent-soft accent-text"><GraduationCap size={16}/></span><span className="font-medium">{x.class}</span></div></td>
        <td className="px-4 py-3">{x.subject}</td><td className="px-4 py-3 text-muted">{x.date}</td><td className="px-4 py-3 text-muted">{x.total}</td></tr>))}
    </Table>
  </>)
}
