import { useState } from 'react'
import { t } from '@core/i18n.js'
import { current } from '@core/auth.js'
import { db } from '@core/db.js'
import { notify } from '@core/notify.js'
import { PageHead, Card, Btn, Field, Input, Select, IconTile, EmptyState } from '../components/ui.jsx'
import { formatDistanceToNow } from 'date-fns'
import { df } from '../datefns.js'
import { Megaphone } from 'lucide-react'
import toast from 'react-hot-toast'
export default function Notices(){
  const u=current(); const canPost=['schooladmin','admin'].includes(u.role)
  const [,force]=useState(0); const [title,setTitle]=useState(''); const [body,setBody]=useState(''); const [aud,setAud]=useState('parent')
  const feed=db().notifications.filter(n=>n.kind==='notice' && (n.role===u.role||n.to===u.id||canPost)).slice(0,30)
  const post=()=>{ if(!title.trim())return; notify({role:aud,kind:'notice',title,body}); toast.success('Annonce publiée'); setTitle('');setBody(''); force(x=>x+1) }
  const audFR={parent:'aux parents',teacher:'aux enseignants',supervisor:'aux surveillants'}
  return (<>
    <PageHead title={t('Annonces')} sub={t("Communications de l'école")}/>
    {canPost && <Card className="p-5 mb-5"><h3 className="font-bold mb-3 flex items-center gap-2"><Megaphone size={18} className="accent-text"/> {t('Publier une annonce')}</h3>
      <div className="grid sm:grid-cols-[1fr_1fr_160px] gap-3">
        <Field label={t('Titre')}><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder={t('ex. École fermée vendredi')}/></Field>
        <Field label={t('Message')}><Input value={body} onChange={e=>setBody(e.target.value)} placeholder={t('Détails…')}/></Field>
        <Field label={t('Destinataires')}><Select value={aud} onChange={e=>setAud(e.target.value)}><option value="parent">{t('Parents')}</option><option value="teacher">{t('Enseignants')}</option><option value="supervisor">{t('Surveillants')}</option></Select></Field>
      </div><div className="mt-3"><Btn onClick={post}>{t('Publier')}</Btn></div></Card>}
    <div className="space-y-3">
      {feed.length? feed.map(n=>(<Card key={n.id} className="p-4 flex items-start gap-3"><IconTile icon={<Megaphone size={18}/>} tint="brand" size={40} radius="rounded-xl"/>
        <div><div className="font-semibold">{n.title}</div><div className="text-sm text-muted">{n.body}</div><div className="text-[12px] text-muted mt-0.5">{formatDistanceToNow(n.at,{addSuffix:true,locale: df()})} · {audFR[n.role]||t('à vous')}</div></div></Card>))
       : <Card><EmptyState icon={<Megaphone size={26}/>} title={t('Aucune annonce')} sub={t("Les communications de l'école apparaîtront ici.")}/></Card>}
    </div>
  </>)
}
