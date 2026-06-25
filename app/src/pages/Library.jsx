import { useState } from 'react'
import { db, mutate } from '../db.js'
import { PageHead, Table, Btn } from '../components/ui.jsx'
import { BookMarked } from 'lucide-react'
import toast from 'react-hot-toast'
export default function Library(){
  const [,force]=useState(0); const d=db()
  const issue=id=>{ mutate(db=>{const b=db.books.find(x=>x.id===id); if(b&&b.available>0)b.available--}); toast.success('Book issued'); force(x=>x+1) }
  const ret=id=>{ mutate(db=>{const b=db.books.find(x=>x.id===id); if(b&&b.available<b.copies)b.available++}); toast.success('Book returned'); force(x=>x+1) }
  return (<>
    <PageHead title="Library" sub={`${d.books.length} titles`}/>
    <Table head={['Title','Author','Category','Available','']}>
      {d.books.map(b=>(<tr key={b.id} className="hover:bg-canvas">
        <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="w-9 h-9 rounded-lg grid place-items-center accent-soft accent-text"><BookMarked size={16}/></span><span className="font-medium">{b.title}</span></div></td>
        <td className="px-4 py-3 text-muted">{b.author}</td><td className="px-4 py-3 text-muted">{b.category}</td>
        <td className="px-4 py-3"><span className="font-bold" style={{color:b.available>0?'#10B981':'#EF4444'}}>{b.available}</span><span className="text-muted">/{b.copies}</span></td>
        <td className="px-4 py-3"><div className="flex gap-2"><Btn variant="soft" onClick={()=>issue(b.id)} disabled={b.available===0}>Issue</Btn><Btn variant="ghost" onClick={()=>ret(b.id)} disabled={b.available===b.copies}>Return</Btn></div></td></tr>))}
    </Table>
  </>)
}
