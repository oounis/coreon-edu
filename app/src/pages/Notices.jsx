import { useState } from 'react'
import { current } from '../auth.js'
import { db } from '../db.js'
import { notify } from '../notify.js'
import { PageHead, Card, Btn, Field, Input, Select, IconTile, EmptyState } from '../components/ui.jsx'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Megaphone } from 'lucide-react'
import toast from 'react-hot-toast'
export default function Notices(){
  const u=current(); const canPost=['schooladmin','admin'].includes(u.role)
  const [,force]=useState(0); const [title,setTitle]=useState(''); const [body,setBody]=useState(''); const [aud,setAud]=useState('parent')
  const feed=db().notifications.filter(n=>n.kind==='notice' && (n.role===u.role||n.to===u.id||canPost)).slice(0,30)
  const post=()=>{ if(!title.trim())return; notify({role:aud,kind:'notice',title,body}); toast.success('Annonce publiée'); setTitle('');setBody(''); force(x=>x+1) }
  const audFR={parent:'aux parents',teacher:'aux enseignants',supervisor:'aux surveillants'}
  return (<>
    <PageHead title="Annonces" sub="Communications de l'école"/>
    {canPost && <Card className="p-5 mb-5"><h3 className="font-bold mb-3 flex items-center gap-2"><Megaphone size={18} className="accent-text"/> Publier une annonce</h3>
      <div className="grid sm:grid-cols-[1fr_1fr_160px] gap-3">
        <Field label="Titre"><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="ex. École fermée vendredi"/></Field>
        <Field label="Message"><Input value={body} onChange={e=>setBody(e.target.value)} placeholder="Détails…"/></Field>
        <Field label="Destinataires"><Select value={aud} onChange={e=>setAud(e.target.value)}><option value="parent">Parents</option><option value="teacher">Enseignants</option><option value="supervisor">Surveillants</option></Select></Field>
      </div><div className="mt-3"><Btn onClick={post}>Publier</Btn></div></Card>}
    <div className="space-y-3">
      {feed.length? feed.map(n=>(<Card key={n.id} className="p-4 flex items-start gap-3"><IconTile icon={<Megaphone size={18}/>} tint="brand" size={40} radius="rounded-xl"/>
        <div><div className="font-semibold">{n.title}</div><div className="text-sm text-muted">{n.body}</div><div className="text-[11px] text-muted mt-0.5">{formatDistanceToNow(n.at,{addSuffix:true,locale:fr})} · {audFR[n.role]||'à vous'}</div></div></Card>))
       : <Card><EmptyState icon={<Megaphone size={26}/>} title="Aucune annonce" sub="Les communications de l'école apparaîtront ici."/></Card>}
    </div>
  </>)
}
