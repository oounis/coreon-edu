import { useState } from 'react'
import { current } from '../auth.js'
import { db } from '../db.js'
import { notify } from '../notify.js'
import { PageHead, Card, Btn, Field, Input, Select } from '../components/ui.jsx'
import { formatDistanceToNow } from 'date-fns'
import { Megaphone } from 'lucide-react'
import toast from 'react-hot-toast'
export default function Notices(){
  const u=current(); const canPost=['schooladmin','admin'].includes(u.role)
  const [,force]=useState(0); const [title,setTitle]=useState(''); const [body,setBody]=useState(''); const [aud,setAud]=useState('parent')
  const feed=db().notifications.filter(n=>n.kind==='notice' && (n.role===u.role||n.to===u.id||canPost)).slice(0,30)
  const post=()=>{ if(!title.trim())return; notify({role:aud,kind:'notice',title,body}); toast.success('Notice published'); setTitle('');setBody(''); force(x=>x+1) }
  return (<>
    <PageHead title="Notices" sub="School announcements"/>
    {canPost && <Card className="p-5 mb-5"><h3 className="font-bold mb-3 flex items-center gap-2"><Megaphone size={18} className="accent-text"/> Publish a notice</h3>
      <div className="grid sm:grid-cols-[1fr_1fr_160px] gap-3">
        <Field label="Title"><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. School closed Friday"/></Field>
        <Field label="Message"><Input value={body} onChange={e=>setBody(e.target.value)} placeholder="Details…"/></Field>
        <Field label="Audience"><Select value={aud} onChange={e=>setAud(e.target.value)}><option value="parent">Parents</option><option value="teacher">Teachers</option><option value="supervisor">Supervisors</option></Select></Field>
      </div><div className="mt-3"><Btn onClick={post}>Publish</Btn></div></Card>}
    <div className="space-y-3">
      {feed.length? feed.map(n=>(<Card key={n.id} className="p-4 flex items-start gap-3"><span className="w-10 h-10 rounded-xl grid place-items-center accent-soft accent-text"><Megaphone size={18}/></span>
        <div><div className="font-semibold">{n.title}</div><div className="text-sm text-muted">{n.body}</div><div className="text-[11px] text-muted mt-0.5">{formatDistanceToNow(n.at,{addSuffix:true})} · to {n.role||'you'}</div></div></Card>))
       : <Card className="p-10 text-center text-muted">No notices yet.</Card>}
    </div>
  </>)
}
