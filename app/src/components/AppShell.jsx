import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu } from '@headlessui/react'
import { applyAccent, ROLE } from '../theme.js'
import { current, logout } from '../auth.js'
import { inboxFor, unreadFor, markRead, markAllRead } from '../notify.js'
import { NotifRow } from './NotifItem.jsx'
import { Mark } from './ui.jsx'
import {
  LayoutDashboard, Users, GraduationCap, UserCog, ClipboardCheck, Wallet, CreditCard,
  ShieldAlert, FileText, Megaphone, Building2, Bell, Search, LogOut, ChevronDown, Menu as MenuIcon,
  CalendarCheck, BookOpen, BookMarked, Bus, CalendarDays, MessageSquare, Award, CheckCheck, CalendarClock, Radio, Settings
} from 'lucide-react'
import { settings, db, classById } from '../db.js'
import { safeLink } from '../access.js'
import MeteoCorner from './MeteoCorner.jsx'
const NAV=[
  { to:'/app', label:'Tableau de bord', icon:LayoutDashboard, roles:['owner','schooladmin','admin','teacher','supervisor','parent'] },
  { to:'/app/live', label:'Suivi en direct', icon:Radio, roles:['parent'] },
  { to:'/app/schools', label:'Écoles', icon:Building2, roles:['owner'] },
  { to:'/app/accounts', label:'Comptes', icon:UserCog, roles:['schooladmin'] },
  { to:'/app/students', label:'Élèves', icon:Users, roles:['schooladmin','admin','supervisor','teacher'] },
  { to:'/app/teachers', label:'Enseignants', icon:GraduationCap, roles:['schooladmin','admin'] },
  { to:'/app/evaluate', label:'Évaluer', icon:ClipboardCheck, roles:['teacher'] },
  { to:'/app/timetable', label:'Emploi du temps', icon:CalendarClock, roles:['schooladmin','admin','teacher','parent','supervisor'] },
  { to:'/app/attendance', label:'Présence', icon:CalendarCheck, roles:['schooladmin','teacher','admin','supervisor'] },
  { to:'/app/homework', label:'Devoirs', icon:BookOpen, roles:['teacher','admin','parent'] },
  { to:'/app/exams', label:'Examens', icon:Award, roles:['schooladmin','admin','teacher','parent'] },
  { to:'/app/finance', label:'Frais & Finances', icon:Wallet, roles:['schooladmin','admin'] },
  { to:'/app/payments', label:'Mes paiements', icon:CreditCard, roles:['parent'] },
  { to:'/app/library', label:'Bibliothèque', icon:BookMarked, roles:['schooladmin','admin','teacher'] },
  { to:'/app/transport', label:'Transport', icon:Bus, roles:['schooladmin','admin','parent'] },
  { to:'/app/events', label:'Événements', icon:CalendarDays, roles:['owner','schooladmin','admin','teacher','supervisor','parent'] },
  { to:'/app/incidents', label:'Incidents', icon:ShieldAlert, roles:['supervisor','admin','schooladmin'] },
  { to:'/app/requests', label:'Demandes', icon:FileText, roles:['teacher','admin','schooladmin'] },
  { to:'/app/messages', label:'Messages', icon:MessageSquare, roles:['owner','schooladmin','admin','teacher','supervisor','parent'] },
  { to:'/app/notices', label:'Annonces', icon:Megaphone, roles:['owner','schooladmin','admin','teacher','supervisor','parent'] },
  { to:'/app/magazine', label:'Coin des Histoires', icon:BookOpen, roles:['owner','schooladmin','admin','teacher','supervisor','parent'] },
  { to:'/app/settings', label:'Paramètres', icon:Settings, roles:['owner','schooladmin'] },
]
export default function AppShell({ children }){
  const u=current(); const loc=useLocation(); const nav=useNavigate(); const [open,setOpen]=useState(false)
  useEffect(()=>{ if(u) applyAccent(u.role) },[u])
  if(!u){ nav('/'); return null }
  const items=NAV.filter(n=>n.roles.includes(u.role)); const role=ROLE[u.role]
  return (
    <div className="min-h-screen flex">
      <aside className={`fixed lg:static z-40 inset-y-0 left-0 w-64 bg-white border-r border-line p-4 flex flex-col transition-transform ${open?'translate-x-0':'-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-2 px-2 mb-5"><Mark size={30}/><div className="font-extrabold lowercase tracking-tight">kogia <span className="accent-text font-normal text-sm">edu</span></div></div>
        <nav className="flex-1 space-y-1 overflow-y-auto scroll-thin -mr-2 pr-2">
          {items.map(n=>{ const active=loc.pathname===n.to; return (
            <Link key={n.to} to={n.to} onClick={()=>setOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${active?'accent-soft accent-text':'text-muted hover:bg-canvas'}`}><n.icon size={18}/> {n.label}</Link>) })}
        </nav>
        <div className="rounded-2xl p-4 text-white text-sm mt-3" style={{background:`linear-gradient(135deg,${role.color},#10162B)`}}><div className="font-bold">{role.label}</div><div className="opacity-80 text-xs mt-1">{settings().schoolName} · {settings().city}</div></div>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-line">
          <div className="flex items-center gap-3 px-4 lg:px-6 py-3">
            <button className="lg:hidden text-muted" onClick={()=>setOpen(!open)}><MenuIcon size={20}/></button>
            <GlobalSearch user={u}/>
            <div className="ml-auto flex items-center gap-2"><MeteoCorner/><BellMenu user={u}/><UserMenu user={u} role={role} onLogout={()=>{logout();nav('/')}}/></div>
          </div>
        </header>
        <main className="px-4 lg:px-6 py-6 max-w-[1200px] mx-auto">{children}</main>
      </div>
      {open&&<div className="fixed inset-0 bg-ink/20 z-30 lg:hidden" onClick={()=>setOpen(false)}/>}
    </div>
  )
}
function GlobalSearch({ user }){
  const nav=useNavigate(); const [q,setQ]=useState(''); const [open,setOpen]=useState(false)
  const d=db(); const query=q.trim().toLowerCase()
  const canStudents=['owner','schooladmin','admin','supervisor','teacher'].includes(user.role)
  const canTeachers=['owner','schooladmin','admin'].includes(user.role)
  const students= query&&canStudents? d.students.filter(s=>s.name.toLowerCase().includes(query)).slice(0,6):[]
  const teachers= query&&canTeachers? d.teachers.filter(t=>t.name.toLowerCase().includes(query)).slice(0,3):[]
  const has=students.length||teachers.length
  const face=s=>s.gender==='Fille'?'👧':s.gender==='Garçon'?'👦':'🧑'
  const go=(to,state)=>{ setQ(''); setOpen(false); nav(to,{state}) }
  return (
    <div className="relative hidden sm:block">
      <div className="flex items-center gap-2 bg-canvas rounded-xl px-3 py-2 w-72"><Search size={16} className="text-muted"/>
        <input value={q} onChange={e=>{setQ(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),160)} placeholder="Rechercher un élève, un enseignant…" className="bg-transparent text-sm outline-none w-full"/></div>
      {open&&query&&(<div className="absolute left-0 mt-2 w-80 card p-2 shadow-2xl z-50 max-h-[70vh] overflow-y-auto scroll-thin">
        {!has&&<div className="px-3 py-6 text-center text-sm text-muted">Aucun résultat pour « {q} »</div>}
        {students.length>0&&<div className="text-[10px] font-bold uppercase text-muted px-2 py-1">Élèves</div>}
        {students.map(s=><button key={s.id} onMouseDown={()=>go('/app/students',{openStudent:s.id})} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-canvas text-left"><span className="w-8 h-8 rounded-lg grid place-items-center text-lg bg-canvas">{face(s)}</span><div className="min-w-0"><div className="text-sm font-medium truncate">{s.name}</div><div className="text-[11px] text-muted">{classById(s.classId)?.name||''}</div></div></button>)}
        {teachers.length>0&&<div className="text-[10px] font-bold uppercase text-muted px-2 py-1 mt-1">Enseignants</div>}
        {teachers.map(t=><button key={t.id} onMouseDown={()=>go('/app/teachers',{openTeacher:t.id})} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-canvas text-left"><span className="w-8 h-8 rounded-lg grid place-items-center text-lg bg-canvas">{t.gender==='Fille'?'👩‍🏫':'👨‍🏫'}</span><div className="min-w-0"><div className="text-sm font-medium truncate">{t.name}</div><div className="text-[11px] text-muted">{t.subject}</div></div></button>)}
      </div>)}
    </div>
  )
}
function BellMenu({ user }){
  const nav=useNavigate(); const [,force]=useState(0); const unread=unreadFor(user); const list=inboxFor(user).slice(0,7)
  const openN=n=>{ markRead(n.id); nav(safeLink(user.role, n.link)) }
  return (
    <Menu as="div" className="relative">
      <Menu.Button className="relative w-10 h-10 grid place-items-center rounded-xl hover:bg-canvas">
        <Bell size={19} className="text-muted"/>
        {unread>0&&<span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 grid place-items-center text-[10px] font-bold text-white rounded-full" style={{background:'#FF3B5C'}}>{unread}</span>}
      </Menu.Button>
      <Menu.Items className="absolute right-0 mt-2 w-[360px] max-w-[92vw] card p-0 shadow-2xl z-50 focus:outline-none overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line"><span className="font-bold">Notifications</span>
          {unread>0&&<button onClick={()=>{markAllRead(user);force(x=>x+1)}} className="text-xs font-semibold accent-text flex items-center gap-1"><CheckCheck size={13}/> Tout lire</button>}</div>
        <div className="max-h-[60vh] overflow-y-auto scroll-thin p-2">
          {list.length? list.map(n=><Menu.Item key={n.id}>{()=> <NotifRow n={n} compact onClick={()=>openN(n)}/>}</Menu.Item>)
           : <div className="px-3 py-8 text-center text-sm text-muted">Aucune notification</div>}
        </div>
        <Menu.Item>{()=> <button onClick={()=>nav('/app/notifications')} className="w-full text-center text-sm font-semibold accent-text py-3 border-t border-line">Voir toutes les notifications</button>}</Menu.Item>
      </Menu.Items>
    </Menu>
  )
}
function UserMenu({ user, role, onLogout }){
  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center gap-2 rounded-xl hover:bg-canvas pl-1 pr-2 py-1">
        <span className="w-9 h-9 rounded-full grid place-items-center text-white font-bold" style={{background:role.color}}>{user.name.split(' ').map(w=>w[0]).slice(0,2).join('')}</span>
        <span className="hidden sm:block text-left leading-tight"><span className="block text-sm font-semibold">{user.name}</span><span className="block text-[11px] text-muted">{role.label}</span></span>
        <ChevronDown size={15} className="text-muted"/>
      </Menu.Button>
      <Menu.Items className="absolute right-0 mt-2 w-44 card p-1.5 shadow-xl z-50 focus:outline-none">
        <Menu.Item>{()=> <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-canvas text-coral"><LogOut size={15}/> Déconnexion</button>}</Menu.Item>
      </Menu.Items>
    </Menu>
  )
}
