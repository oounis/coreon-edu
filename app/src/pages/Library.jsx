import { useState } from 'react'
import { db, mutate } from '../db.js'
import { PageHead, Table, Btn, IconTile, EmptyState, SectionCard, STATUS } from '../components/ui.jsx'
import { BookMarked } from 'lucide-react'
import toast from 'react-hot-toast'
export default function Library(){
  const [,force]=useState(0); const d=db()
  const issue=id=>{ mutate(db=>{const b=db.books.find(x=>x.id===id); if(b&&b.available>0)b.available--}); toast.success('Livre prêté'); force(x=>x+1) }
  const ret=id=>{ mutate(db=>{const b=db.books.find(x=>x.id===id); if(b&&b.available<b.copies)b.available++}); toast.success('Livre retourné'); force(x=>x+1) }
  return (<>
    <PageHead title="Bibliothèque" sub={`${d.books.length} titres`}/>
    {d.books.length===0 ? <SectionCard headless bodyClass=""><EmptyState icon={<BookMarked size={26}/>} title="Aucun livre" sub="Le catalogue de la bibliothèque est vide pour le moment."/></SectionCard>
    : <Table head={['Titre','Auteur','Catégorie','Disponibles','']}>
      {d.books.map(b=>(<tr key={b.id} className="hover:bg-canvas">
        <td className="px-4 py-3"><div className="flex items-center gap-3"><IconTile icon={<BookMarked size={16}/>} tint="brand" size={36} radius="rounded-lg"/><span className="font-medium">{b.title}</span></div></td>
        <td className="px-4 py-3 text-muted">{b.author}</td><td className="px-4 py-3 text-muted">{b.category}</td>
        <td className="px-4 py-3"><span className="font-bold" style={{color:b.available>0?STATUS.ok:STATUS.danger}}>{b.available}</span><span className="text-muted">/{b.copies}</span></td>
        <td className="px-4 py-3"><div className="flex gap-2"><Btn variant="soft" onClick={()=>issue(b.id)} disabled={b.available===0}>Prêter</Btn><Btn variant="ghost" onClick={()=>ret(b.id)} disabled={b.available===b.copies}>Retour</Btn></div></td></tr>))}
    </Table>}
  </>)
}
