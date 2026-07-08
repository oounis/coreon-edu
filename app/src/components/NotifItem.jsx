import { FileText, ShieldAlert, CreditCard, Megaphone, MessageSquare, Star, Bell, CalendarCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Avatar, STATUS } from './ui.jsx'
export const KIND={
  request:{tint:STATUS.info,Icon:FileText}, incident:{tint:STATUS.danger,Icon:ShieldAlert},
  payment:{tint:STATUS.warn,Icon:CreditCard}, notice:{tint:'#6C5CE7',Icon:Megaphone},
  message:{tint:STATUS.ok,Icon:MessageSquare}, evaluation:{tint:'#8B5CF6',Icon:Star},
  info:{tint:STATUS.neutral,Icon:CalendarCheck},
}
export const ago=at=>formatDistanceToNow(at,{addSuffix:true,locale:fr})
export function NotifRow({ n, onClick, compact }){
  const k=KIND[n.kind]||KIND.info; const Icon=k.Icon
  return (
    <button onClick={onClick} className={`w-full text-left flex items-start gap-3 ${compact?'px-2 py-2':'px-3 py-3'} rounded-2xl transition hover:bg-canvas ${!n.read?'bg-[color:var(--accent-soft)]':''}`}>
      <span className="relative shrink-0">
        {n.actor? <Avatar name={n.actor} seed={n.actor} size={44}/>
        : <span className="w-11 h-11 rounded-full grid place-items-center text-white font-bold" style={{background:k.tint}}><Icon size={18}/></span>}
        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full grid place-items-center text-white border-2 border-white" style={{background:k.tint}}><Icon size={10}/></span>
      </span>
      <span className="flex-1 min-w-0">
        <span className="text-sm leading-snug block">{n.actor&&<b>{n.actor} </b>}<span className={n.actor?'text-muted':''}>{n.title}</span></span>
        {n.body&&<span className="text-xs text-muted block truncate">{n.body}</span>}
        <span className="text-[11px] font-semibold mt-0.5 block" style={{color:!n.read?'var(--accent)':STATUS.neutral}}>{ago(n.at)}</span>
      </span>
      {!n.read&&<span className="w-2.5 h-2.5 rounded-full mt-2 shrink-0" style={{background:'var(--accent)'}}/>}
    </button>
  )
}
