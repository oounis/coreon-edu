import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// Horloge du tableau de bord — le pendant temporel de la météo :
// heure en direct (les secondes battent), jour et date, teintées par le portail.
export default function ClockCorner(){
  const [now,setNow]=useState(()=>new Date())
  useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),1000); return ()=>clearInterval(t) },[])
  const hm=format(now,'HH:mm'), ss=format(now,'ss')
  return (
    <div className="hidden md:flex items-center gap-2.5 pl-3 pr-3.5 py-1.5 rounded-2xl select-none"
      title={format(now,'EEEE d MMMM yyyy · HH:mm:ss',{locale:fr})}
      style={{background:'linear-gradient(135deg, color-mix(in srgb, var(--accent) 15%, #fff), color-mix(in srgb, var(--accent-2, var(--accent)) 26%, #fff))'}}>
      <span className="relative w-2.5 h-2.5" aria-hidden="true">
        <span className="absolute inset-0 rounded-full accent-bg opacity-30 animate-ping"/>
        <span className="absolute inset-0 rounded-full accent-bg"/>
      </span>
      <div className="leading-none">
        <div className="font-extrabold text-sm tabular-nums accent-text">{hm}<span className="text-[10px] font-bold opacity-55">:{ss}</span></div>
        <div className="text-[10px] font-semibold text-muted capitalize mt-0.5">{format(now,'EEE d MMM',{locale:fr})}</div>
      </div>
    </div>
  )
}
