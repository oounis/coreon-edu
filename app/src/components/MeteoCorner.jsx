import { useState, useEffect } from 'react'
import { Menu } from '@headlessui/react'
import { fetchWeather } from '../meteo.js'
import { settings } from '../db.js'
import { Wind, Droplets, ChevronDown } from 'lucide-react'

const GRAD={clear:['#FFE7A0','#FDB44B'],partly:['#DCEBFF','#9FC0F0'],cloudy:['#EAEFF7','#C3CEDD'],overcast:['#DEE4EC','#AEB8C7'],
  rain:['#CFE0F0','#93AEC9'],drizzle:['#D9E6F2','#A9C1D8'],thunder:['#D7D9E6','#9599BE'],snow:['#EAF3FB','#CFE3F2'],fog:['#E6EAF0','#C2CAD6'],sleet:['#DDE8F2','#B4C4D6']}
const INK={clear:'#7A5A12',default:'#334155'}

export default function MeteoCorner(){
  const [w,setW]=useState(null); const [err,setErr]=useState(false)
  useEffect(()=>{ let ok=true
    const load=()=>fetchWeather().then(x=>ok&&setW(x)).catch(()=>ok&&setErr(true))
    load(); const t=setInterval(load,600000)  // refresh every 10 min
    return ()=>{ok=false;clearInterval(t)} },[])
  const A=import.meta.env.BASE_URL
  if(err) return null
  if(!w) return <div className="hidden md:flex items-center gap-2 text-xs text-muted px-3 py-2 rounded-2xl bg-canvas animate-pulse">Météo…</div>
  const [c1,c2]=GRAD[w.mode]||GRAD.cloudy; const ink=w.mode==='clear'?INK.clear:INK.default
  return (
    <Menu as="div" className="relative hidden md:block">
      <Menu.Button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-2xl hover:shadow transition" style={{background:`linear-gradient(135deg,${c1},${c2})`}} title={`Météo · ${settings().city}`}>
        <img src={`${A}weather/${w.mode}.png`} width="32" height="32" alt="" style={{filter:'drop-shadow(0 2px 3px rgba(0,0,0,.15))'}}/>
        <div className="leading-none text-left" style={{color:ink}}><div className="text-sm font-extrabold">{w.temp}°</div><div className="text-[10px] font-semibold opacity-80">{w.label}</div></div>
        <ChevronDown size={13} style={{color:ink}}/>
      </Menu.Button>
      <Menu.Items className="absolute right-0 mt-2 w-64 card p-0 shadow-2xl z-50 overflow-hidden focus:outline-none">
        <div className="p-5 text-center" style={{background:`linear-gradient(160deg,${c1},${c2})`}}>
          <img src={`${A}weather/${w.mode}.png`} width="72" height="72" alt="" className="mx-auto" style={{filter:'drop-shadow(0 4px 6px rgba(0,0,0,.18))'}}/>
          <div className="text-4xl font-extrabold mt-1" style={{color:ink}}>{w.temp}°</div>
          <div className="text-sm font-bold" style={{color:ink}}>{w.label}</div>
          <div className="text-xs mt-0.5" style={{color:ink,opacity:.8}}>{settings().schoolName} · {settings().city}</div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line text-center text-xs py-3">
          <div><div className="text-muted flex items-center justify-center gap-1"><Droplets size={12}/> Humidité</div><div className="font-bold mt-0.5">{w.humidity}%</div></div>
          <div><div className="text-muted flex items-center justify-center gap-1"><Wind size={12}/> Vent</div><div className="font-bold mt-0.5">{w.wind} km/h</div></div>
          <div><div className="text-muted">Min / Max</div><div className="font-bold mt-0.5">{w.lo}° / {w.hi}°</div></div>
        </div>
      </Menu.Items>
    </Menu>
  )
}
