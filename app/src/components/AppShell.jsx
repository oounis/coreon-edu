import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu } from '@headlessui/react'
import { applyAccent, ROLE } from '@core/theme.js'
import { current, logout } from '@core/auth.js'
import { inboxFor, unreadFor, markRead, markAllRead } from '@core/notify.js'
import toast from 'react-hot-toast'
import { useRef } from 'react'
import { NotifRow } from './NotifItem.jsx'
import { Mark, Avatar, STATUS } from './ui.jsx'
import { Bell, Search, LogOut, ChevronDown, Menu as MenuIcon, CheckCheck } from 'lucide-react'
import { settings, onSaveFailure } from '@core/db.js'
import { t, isRTL } from '@core/i18n.js'
import LangSwitch from './Lang.jsx'
import { menuFor } from '@core/nav.js'
import { safeLink } from '@core/access.js'
import MeteoCorner from './MeteoCorner.jsx'
import FeteCorner from './FeteCorner.jsx'
import { SummerChip } from './Summer.jsx'
import CommandPalette from './CommandPalette.jsx'
import { Ic } from '../icons.jsx'
function NavLink({ n, u, loc, onGo }) {
  const active = loc.pathname === n.to
  return (
    <Link to={n.to} onClick={onGo} aria-current={active ? 'page' : undefined}
      className={`relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition
        ${active ? 'accent-soft accent-text font-semibold' : 'text-muted font-medium hover:bg-canvas hover:text-ink'}`}>
      {active && <span className="absolute start-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-e-full accent-bg" aria-hidden="true" />}
      <Ic n={n.icon} size={18} /> {t(n.labelFor?.[u.role] || n.label)}
    </Link>
  )
}

export default function AppShell({ children }){
  const u=current(); const loc=useLocation(); const nav=useNavigate(); const [open,setOpen]=useState(false)
  const [palette,setPalette]=useState(false)
  useEffect(()=>{ if(u) applyAccent(u.role) },[u])
  useEffect(()=>{
    const f=e=>{ if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){ e.preventDefault(); setPalette(p=>!p) } }
    // le tableau de bord ouvre la même palette que Ctrl+K — une seule recherche
    const g=()=>setPalette(true)
    window.addEventListener('keydown',f); window.addEventListener('coreon:open-palette',g)
    return ()=>{ window.removeEventListener('keydown',f); window.removeEventListener('coreon:open-palette',g) }
  },[])
  // Une sauvegarde qui échoue (quota plein) n'est JAMAIS silencieuse : c'est
  // ainsi que deux vraies pré-inscriptions ont été perdues le 2026-07-14.
  useEffect(()=>{ onSaveFailure(()=>toast.error('Stockage du navigateur plein : la dernière action n’a PAS été enregistrée. Libérez de l’espace (pièces jointes) ou videz d’anciennes données.',{id:'save-fail',duration:8000})) },[])
  if(!u){ nav('/'); return null }
  const menu=menuFor(u.role, settings()); const role=ROLE[u.role]
  return (
    <div className="min-h-screen flex">
      <aside className={`fixed lg:static z-40 inset-y-0 start-0 w-64 bg-white border-e border-line p-4 flex flex-col transition-transform ${open?'translate-x-0':(isRTL()?'translate-x-full':'-translate-x-full')+' lg:translate-x-0'}`}>
        <div className="flex items-center gap-2 px-2 mb-5"><Mark size={30}/><div className="font-extrabold lowercase tracking-tight">coreon <span className="accent-text font-normal text-sm">edu</span></div></div>
        {/* LA NAVIGATION EN ÉTAGES (recherche COMPETITIVE_v2.md, 3-0) :
            1. ÉPINGLÉ — ce que CE rôle fait tous les jours, en haut, sans titre.
            2. SECTIONS — un petit nombre de groupes nommés, rangés par FRÉQUENCE.
            3. RECHERCHE (Ctrl+K) — la vraie navigation d'un ERP : chez PowerSchool,
               l'accueil administrateur EST un champ de recherche.
            22 entrées à plat était le problème ; les empiler ne suffisait pas. */}
        <nav className="flex-1 overflow-y-auto scroll-thin -mr-2 pr-2">
          <div className="space-y-1">
            {menu.pinned.map(n=><NavLink key={n.to} n={n} u={u} loc={loc} onGo={()=>setOpen(false)}/>)}
          </div>
          {menu.groups.map(g=>(
            <div key={g.key} className="mt-4">
              <div className="px-3 mb-1 text-[10px] font-extrabold uppercase tracking-wider text-muted">
                {t(g.label)}
              </div>
              <div className="space-y-1">
                {g.items.map(n=><NavLink key={n.to} n={n} u={u} loc={loc} onGo={()=>setOpen(false)}/>)}
              </div>
            </div>
          ))}
        </nav>
        <div className="rounded-2xl p-4 text-white text-sm mt-3" style={{background:`linear-gradient(135deg,${role.color},#0E2135)`}}><div className="font-bold">{t(role.label)}</div><div className="opacity-80 text-xs mt-1">{u.role==='owner'?'Kogia Group · Console SaaS':`${settings().schoolName} · ${settings().city}`}</div></div>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-line">
          <div className="flex items-center gap-3 px-4 lg:px-6 py-3">
            <button className="lg:hidden w-10 h-10 grid place-items-center rounded-xl text-muted hover:bg-canvas" aria-label={t('Ouvrir le menu')} aria-expanded={open} onClick={()=>setOpen(!open)}><MenuIcon size={20}/></button>
            <button onClick={()=>setPalette(true)} aria-label={t('Recherche globale (Ctrl+K)')}
              className="hidden sm:flex items-center gap-2 bg-canvas rounded-xl px-3 py-2 w-72 text-sm text-muted hover:bg-line/60 transition text-left">
              <Search size={16}/><span className="flex-1">{t('Rechercher…')}</span>
              <span className="text-[11px] font-bold border border-line rounded-md px-1.5 py-0.5 bg-white">Ctrl K</span>
            </button>
            <button onClick={()=>setPalette(true)} aria-label={t('Recherche globale')} className="sm:hidden w-10 h-10 grid place-items-center rounded-xl text-muted hover:bg-canvas"><Search size={18}/></button>
            <div className="ms-auto flex items-center gap-2"><LangSwitch/><SummerChip/><FeteCorner/><MeteoCorner/><BellMenu user={u}/><UserMenu user={u} role={role} onLogout={()=>{logout();window.dispatchEvent(new Event('coreon:logout'));nav('/')}}/></div>
          </div>
        </header>
        <main className="px-4 lg:px-6 py-5 max-w-[1280px] mx-auto">{children}</main>
      </div>
      {open&&<div className="fixed inset-0 bg-ink/20 z-30 lg:hidden" onClick={()=>setOpen(false)}/>}
      <CommandPalette open={palette} onClose={()=>setPalette(false)} user={u}/>
    </div>
  )
}
function BellMenu({ user }){
  const nav=useNavigate(); const [,force]=useState(0); const unread=unreadFor(user); const list=inboxFor(user).slice(0,7)
  const openN=n=>{ markRead(n.id); nav(safeLink(user.role, n.link)) }
  // détection en direct : toute nouvelle notification déclenche un toast cliquable
  const seen=useRef(unread)
  useEffect(()=>{
    const setInterval2=setInterval(()=>{
      const u2=unreadFor(user)
      if(u2>seen.current){
        const latest=inboxFor(user).find(n=>!n.read)
        if(latest) toast(tp=>(
          <button onClick={()=>{toast.dismiss(tp.id);openN(latest)}} className="text-left">
            <b className="block text-sm">{latest.title}</b>
            <span className="block text-xs text-muted">{latest.body?.slice(0,80)}</span>
          </button>),{duration:6000})
      }
      seen.current=u2; force(x=>x+1)
    },15000)
    return ()=>clearInterval(setInterval2)
  },[user])
  return (
    <Menu as="div" className="relative">
      <Menu.Button className="relative w-10 h-10 grid place-items-center rounded-xl hover:bg-canvas" aria-label={t('Notifications')}>
        <Bell size={19} className={unread>0?"accent-text bell-ring":"text-muted"}/>
        {unread>0&&<span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 grid place-items-center text-[11px] font-bold text-white rounded-full" style={{background:STATUS.live}}>{unread}</span>}
      </Menu.Button>
      <Menu.Items className="absolute right-0 mt-2 w-[360px] max-w-[92vw] card p-0 shadow-2xl z-50 focus:outline-none overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line"><span className="font-bold">{t('Notifications')}</span>
          {unread>0&&<button onClick={()=>{markAllRead(user);force(x=>x+1)}} className="text-xs font-semibold accent-text flex items-center gap-1"><CheckCheck size={13}/> {t('Tout lire')}</button>}</div>
        <div className="max-h-[60vh] overflow-y-auto scroll-thin p-2">
          {list.length? list.map(n=><Menu.Item key={n.id}>{()=> <NotifRow n={n} compact onClick={()=>openN(n)}/>}</Menu.Item>)
           : <div className="px-3 py-8 text-center text-sm text-muted">{t('Aucune notification')}</div>}
        </div>
        <Menu.Item>{()=> <button onClick={()=>nav('/app/notifications')} className="w-full text-center text-sm font-semibold accent-text py-3 border-t border-line">{t('Voir toutes les notifications')}</button>}</Menu.Item>
      </Menu.Items>
    </Menu>
  )
}
function UserMenu({ user, role, onLogout }){
  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center gap-2 rounded-xl hover:bg-canvas pl-1 pr-2 py-1" aria-label={t('Menu utilisateur')}>
        <Avatar name={user.name} seed={user.id} size={36}/>
        <span className="hidden sm:block text-left leading-tight"><span className="block text-sm font-semibold">{user.name}</span><span className="block text-[12px] text-muted">{t(role.label)}</span></span>
        <ChevronDown size={15} className="text-muted"/>
      </Menu.Button>
      <Menu.Items className="absolute right-0 mt-2 w-52 card p-1.5 shadow-xl z-50 focus:outline-none">
        <Menu.Item>{()=> <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-canvas text-coral"><LogOut size={15}/> {t('Déconnexion')}</button>}</Menu.Item>
      </Menu.Items>
    </Menu>
  )
}
