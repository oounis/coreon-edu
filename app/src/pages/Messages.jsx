import { useState } from 'react'
import { current } from '../auth.js'
import { db, mutate, uid, userById } from '../db.js'
import { ROLE } from '../theme.js'
import { notify } from '../notify.js'
import { PageHead, Card, Avatar, Btn, Modal, Field, Select, Input, EmptyState } from '../components/ui.jsx'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Send, Plus, MessageSquare } from 'lucide-react'
export default function Messages(){
  const me=current(); const [,force]=useState(0); const refresh=()=>force(x=>x+1)
  const d=db()
  const mine=d.messages.filter(m=>m.from===me.id||m.to===me.id)
  const partnerIds=[...new Set(mine.map(m=>m.from===me.id?m.to:m.from))]
  const [active,setActive]=useState(partnerIds[0]||null)
  const [text,setText]=useState(''); const [newOpen,setNewOpen]=useState(false); const [to,setTo]=useState('')
  const thread=mine.filter(m=>m.from===active||m.to===active).sort((a,b)=>a.at-b.at)
  const send=(target=active)=>{ if(!text.trim()||!target)return
    mutate(db=>{db.messages.push({id:uid('m'),from:me.id,to:target,text:text.trim(),at:Date.now(),read:false})})
    notify({to:target,kind:'message',title:`Nouveau message de ${me.name}`,body:text.trim().slice(0,60),link:'/app/messages'})
    setText(''); setActive(target); refresh() }
  const startNew=()=>{ if(!to)return; setActive(to); setNewOpen(false); if(!partnerIds.includes(to)) {/* will appear once a message is sent */} refresh() }
  const others=d.users.filter(u=>u.id!==me.id)
  const lastWith=id=>{ const t=mine.filter(m=>m.from===id||m.to===id).sort((a,b)=>b.at-a.at)[0]; return t }
  return (<>
    <PageHead title="Messages" sub="Échangez avec le personnel et les parents." action={<Btn onClick={()=>setNewOpen(true)}><Plus size={16}/> Nouveau message</Btn>}/>
    <div className="grid lg:grid-cols-[300px_1fr] gap-4">
      <Card className="p-2 h-fit">
        {partnerIds.length===0 && <EmptyState icon={<MessageSquare size={26}/>} title="Aucune conversation" sub="Démarrez une nouvelle conversation pour la voir ici."/>}
        {partnerIds.map(pid=>{ const u=userById(pid); const last=lastWith(pid); return (
          <button key={pid} onClick={()=>setActive(pid)} className={`w-full flex items-center gap-3 p-3 rounded-xl ${active===pid?'accent-soft':''}`}>
            <Avatar name={u?.name} seed={pid}/>
            <div className="flex-1 text-left min-w-0"><div className="font-semibold text-sm truncate">{u?.name}</div><div className="text-xs text-muted truncate">{last?.text}</div></div>
          </button>) })}
      </Card>
      <Card className="flex flex-col h-[60vh]">
        {active? (<>
          <div className="p-4 border-b border-line flex items-center gap-3"><Avatar name={userById(active)?.name} seed={active}/><div><div className="font-semibold">{userById(active)?.name}</div><div className="text-xs text-muted">{ROLE[userById(active)?.role]?.label}</div></div></div>
          <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-2">
            {thread.length? thread.map(m=>{ const mineMsg=m.from===me.id; return (
              <div key={m.id} className={`flex ${mineMsg?'justify-end':'justify-start'}`}><div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${mineMsg?'text-white accent-bg':'bg-canvas'}`}><div>{m.text}</div><div className={`text-[10px] mt-0.5 ${mineMsg?'text-white/70':'text-muted'}`}>{formatDistanceToNow(m.at,{addSuffix:true,locale:fr})}</div></div></div>) })
             : <EmptyState icon={<MessageSquare size={26}/>} title="Aucun message" sub="Envoyez le premier message pour démarrer la conversation."/>}
          </div>
          <div className="p-3 border-t border-line flex gap-2"><Input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Écrivez un message…"/><Btn onClick={()=>send()}><Send size={16}/></Btn></div>
        </>) : <div className="flex-1 grid place-items-center"><EmptyState icon={<MessageSquare size={26}/>} title="Aucune conversation sélectionnée" sub="Choisissez une conversation ou démarrez-en une nouvelle."/></div>}
      </Card>
    </div>
    <Modal open={newOpen} onClose={()=>setNewOpen(false)} title="Nouveau message" footer={<><Btn variant="ghost" onClick={()=>setNewOpen(false)}>Annuler</Btn><Btn onClick={startNew}>Démarrer</Btn></>}>
      <Field label="Destinataire"><Select value={to} onChange={e=>setTo(e.target.value)}><option value="">— choisir —</option>{others.map(u=><option key={u.id} value={u.id}>{u.name} · {ROLE[u.role]?.label}</option>)}</Select></Field>
    </Modal>
  </>)
}
