import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu } from '@headlessui/react'
import { applyAccent, ROLE } from '../theme.js'
import { current, logout } from '../auth.js'
import { inboxFor, unreadFor, markAllRead } from '../notify.js'
import { formatDistanceToNow } from 'date-fns'
import {
  LayoutDashboard, Users, GraduationCap, UserCog, ClipboardCheck, Wallet, CreditCard,
  ShieldAlert, FileText, Megaphone, Building2, Bell, Search, LogOut, ChevronDown, Menu as MenuIcon
} from 'lucide-react'
import { useEffect } from 'react'

const NAV = [
  { to:'/app', label:'Dashboard', icon:LayoutDashboard, roles:['owner','schooladmin','admin','teacher','supervisor','parent'] },
  { to:'/app/schools', label:'Schools', icon:Building2, roles:['owner'] },
  { to:'/app/accounts', label:'Accounts', icon:UserCog, roles:['schooladmin'] },
  { to:'/app/students', label:'Students', icon:Users, roles:['schooladmin','admin','supervisor'] },
  { to:'/app/teachers', label:'Teachers', icon:GraduationCap, roles:['schooladmin','admin'] },
  { to:'/app/evaluate', label:'Evaluate', icon:ClipboardCheck, roles:['teacher'] },
  { to:'/app/finance', label:'Finance / Fees', icon:Wallet, roles:['schooladmin','admin'] },
  { to:'/app/payments', label:'My Payments', icon:CreditCard, roles:['parent'] },
  { to:'/app/incidents', label:'Incidents', icon:ShieldAlert, roles:['supervisor','admin','schooladmin'] },
  { to:'/app/requests', label:'Requests', icon:FileText, roles:['teacher','admin','schooladmin'] },
  { to:'/app/notices', label:'Notices', icon:Megaphone, roles:['owner','schooladmin','admin','teacher','supervisor','parent'] },
]

export default function AppShell({ children }){
  const u = current(); const loc = useLocation(); const nav = useNavigate()
  const [open,setOpen]=useState(false)
  useEffect(()=>{ if(u) applyAccent(u.role) },[u])
  if(!u){ nav('/'); return null }
  const items = NAV.filter(n=>n.roles.includes(u.role))
  const role = ROLE[u.role]
  return (
    <div className="min-h-screen flex">
      {/* sidebar */}
      <aside className={`fixed lg:static z-40 inset-y-0 left-0 w-64 bg-white border-r border-line p-4 flex flex-col transition-transform ${open?'translate-x-0':'-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-2 px-2 mb-6">
          <span className="w-9 h-9 rounded-xl grid place-items-center text-white font-extrabold accent-bg">K</span>
          <div className="font-extrabold">Coreon <span className="accent-text">Edu</span></div>
        </div>
        <nav className="flex-1 space-y-1">
          {items.map(n=>{
            const active = loc.pathname===n.to
            return <Link key={n.to} to={n.to} onClick={()=>setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${active?'accent-soft accent-text':'text-muted hover:bg-canvas'}`}>
              <n.icon size={18}/> {n.label}
            </Link>
          })}
        </nav>
        <div className="rounded-2xl p-4 text-white text-sm" style={{background:`linear-gradient(135deg,${role.color},#1E2433)`}}>
          <div className="font-bold">{role.label}</div>
          <div className="opacity-80 text-xs mt-1">Coreon Edu · Al-Noor School</div>
        </div>
      </aside>

      {/* main */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-line">
          <div className="flex items-center gap-3 px-4 lg:px-6 py-3">
            <button className="lg:hidden text-muted" onClick={()=>setOpen(!open)}><MenuIcon size={20}/></button>
            <div className="hidden sm:flex items-center gap-2 bg-canvas rounded-xl px-3 py-2 w-72 max-w-full">
              <Search size={16} className="text-muted"/><input placeholder="Search…" className="bg-transparent text-sm outline-none w-full"/>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <BellMenu user={u}/>
              <UserMenu user={u} role={role} onLogout={()=>{logout();nav('/')}}/>
            </div>
          </div>
        </header>
        <main className="px-4 lg:px-6 py-6 max-w-[1200px] mx-auto">{children}</main>
      </div>
      {open && <div className="fixed inset-0 bg-ink/20 z-30 lg:hidden" onClick={()=>setOpen(false)}/>}
    </div>
  )
}

function BellMenu({ user }){
  const unread = unreadFor(user); const list = inboxFor(user).slice(0,8)
  return (
    <Menu as="div" className="relative">
      <Menu.Button className="relative w-10 h-10 grid place-items-center rounded-xl hover:bg-canvas" onClick={()=>setTimeout(()=>markAllRead(user),1200)}>
        <Bell size={19} className="text-muted"/>
        {unread>0 && <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 grid place-items-center text-[10px] font-bold text-white rounded-full" style={{background:'#FF6B81'}}>{unread}</span>}
      </Menu.Button>
      <Menu.Items className="absolute right-0 mt-2 w-80 card p-2 shadow-xl z-50 focus:outline-none">
        <div className="px-2 py-1.5 text-xs font-bold text-muted">Notifications</div>
        {list.length? list.map(n=>(
          <div key={n.id} className={`px-3 py-2 rounded-xl ${!n.read?'accent-soft':''}`}>
            <div className="text-sm font-semibold">{n.title}</div>
            <div className="text-xs text-muted">{n.body}</div>
            <div className="text-[10px] text-muted mt-0.5">{formatDistanceToNow(n.at,{addSuffix:true})}</div>
          </div>
        )) : <div className="px-3 py-6 text-center text-sm text-muted">No notifications</div>}
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
        <Menu.Item>{()=> <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-canvas text-coral"><LogOut size={15}/> Log out</button>}</Menu.Item>
      </Menu.Items>
    </Menu>
  )
}
