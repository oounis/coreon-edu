import { useState, useEffect } from 'react'
import { Menu } from '@headlessui/react'
import { fetchWeather, coordsOf } from '@core/meteo.js'
import { settings } from '@core/db.js'
import { t } from '@core/i18n.js'
import WeatherIcon from './WeatherIcon.jsx'
import { Wind, Droplets, ChevronDown } from 'lucide-react'

const GRAD={clear:['#FFE7A0','#FDB44B'],partly:['#DCEBFF','#9FC0F0'],cloudy:['#EAEFF7','#C3CEDD'],overcast:['#DEE4EC','#AEB8C7'],
  rain:['#CFE0F0','#93AEC9'],drizzle:['#D9E6F2','#A9C1D8'],thunder:['#D7D9E6','#9599BE'],snow:['#EAF3FB','#CFE3F2'],fog:['#E6EAF0','#C2CAD6'],sleet:['#DDE8F2','#B4C4D6']}
const INK={clear:'#7A5A12',default:'#334155'}

export default function MeteoCorner(){
  const city=settings().city
  // cache localStorage, CLÉ PAR VILLE : sinon une école de Sfax affichait la météo
  // de Tunis restée en cache. La météo survit aussi aux coupures réseau.
  const cacheKey='coreon_meteo_'+city
  const [w,setW]=useState(()=>{ try{ return JSON.parse(localStorage.getItem(cacheKey)||'null')?.w||null }catch{ return null } })
  useEffect(()=>{ let alive=true
    const load=()=>fetchWeather(...coordsOf(city)).then(x=>{ if(!alive)return; setW(x); try{localStorage.setItem(cacheKey,JSON.stringify({w:x,at:Date.now()}))}catch{} })
      .catch(()=>{ if(alive) setTimeout(load,120000) })   // hors-ligne → on réessaie dans 2 min
    load(); const t=setInterval(load,600000)
    return ()=>{alive=false;clearInterval(t)} },[city,cacheKey])
  if(!w) return <div className="hidden md:flex items-center gap-1.5 text-[11px] text-muted px-2.5 py-1 rounded-xl bg-canvas animate-pulse">{t('Météo…')}</div>
  const [c1,c2]=GRAD[w.mode]||GRAD.cloudy; const ink=w.mode==='clear'?INK.clear:INK.default
  return (
    <Menu as="div" className="relative hidden md:block">
      {/* Chip DISCRET : la météo est un agrément, pas un outil de travail — elle ne
          doit pas rivaliser avec le nom de l'école ni avec la cloche. Une seule
          ligne (icône + température) ; le libellé et le détail vivent dans le
          panneau qui s'ouvre. */}
      <Menu.Button className="flex items-center gap-1 ps-1.5 pe-2 py-1 rounded-xl hover:shadow transition" style={{background:`linear-gradient(135deg,${c1},${c2})`}} title={`${t('Météo')} · ${t(w.label)} · ${settings().city}`}>
        <WeatherIcon mode={w.mode} size={20}/>
        <span className="text-[13px] font-extrabold leading-none" style={{color:ink}}>{w.temp}°</span>
        <ChevronDown size={11} style={{color:ink}}/>
      </Menu.Button>
      <Menu.Items className="absolute right-0 mt-2 w-64 card p-0 shadow-2xl z-50 overflow-hidden focus:outline-none">
        <div className="p-5 text-center" style={{background:`linear-gradient(160deg,${c1},${c2})`}}>
          <div className="grid place-items-center"><WeatherIcon mode={w.mode} size={72}/></div>
          <div className="text-4xl font-extrabold mt-1" style={{color:ink}}>{w.temp}°</div>
          <div className="text-sm font-bold" style={{color:ink}}>{t(w.label)}</div>
          <div className="text-xs mt-0.5" style={{color:ink,opacity:.8}}>{settings().schoolName} · {settings().city}</div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line text-center text-xs py-3">
          <div><div className="text-muted flex items-center justify-center gap-1"><Droplets size={12}/> {t('Humidité')}</div><div className="font-bold mt-0.5">{w.humidity}%</div></div>
          <div><div className="text-muted flex items-center justify-center gap-1"><Wind size={12}/> {t('Vent')}</div><div className="font-bold mt-0.5">{w.wind} km/h</div></div>
          <div><div className="text-muted">{t('Min / Max')}</div><div className="font-bold mt-0.5">{w.lo}° / {w.hi}°</div></div>
        </div>
      </Menu.Items>
    </Menu>
  )
}
