// ════════════════════════════════════════════════════════════════════════════
// LA COQUILLE DE LA VITRINE — en-tête + pied de page partagés par toutes les
// pages publiques (CR-006). Le menu n'est plus un défilement : ce sont des
// <Link> vers de vraies routes. L'entrée active est marquée d'après l'URL, le
// bouton « précédent » du navigateur fonctionne, chaque page a son adresse.
// ════════════════════════════════════════════════════════════════════════════
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { Mark } from '../../components/ui.jsx'
import { t } from '@core/i18n.js'
import { NAV, BTN_MD, A } from './shared.jsx'

function NavLink({ to, children, active, className='' }){
  return (
    <Link to={to} aria-current={active ? 'page' : undefined}
      className={`${className} transition-colors ${active ? 'font-semibold' : 'hover:text-ink'}`}
      style={active ? { color: A } : undefined}>
      {children}
    </Link>
  )
}

export default function SiteChrome(){
  const nav = useNavigate()
  const { pathname } = useLocation()
  return (
    <div className="bg-white text-ink">
      {/* NAV */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/85 border-b border-line">
        <div className="mx-auto max-w-[1120px] px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2"><Mark size={30}/><span className="font-extrabold lowercase tracking-tight">coreon <span className="text-sm font-normal" style={{color:A}}>edu</span></span></Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted">
            {NAV.map(([to,label])=>(
              <NavLink key={to} to={to} active={pathname===to}>{t(label)}</NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={()=>nav('/inscription')} className={`${BTN_MD} text-muted hover:text-ink hover:bg-canvas`}>{t('Pré-inscription')}</button>
            <button onClick={()=>nav('/login')} className={`${BTN_MD} text-muted hover:text-ink hover:bg-canvas`}>{t('Se connecter')}</button>
            <button onClick={()=>nav('/login')} className={`${BTN_MD} text-white shadow-sm hover:opacity-90`} style={{background:A}}>{t('Démo gratuite')}</button>
          </div>
        </div>
        {/* menu mobile : mêmes routes, sur une ligne défilante */}
        <nav className="md:hidden flex items-center gap-5 overflow-x-auto px-5 pb-2.5 text-sm font-medium text-muted">
          {NAV.map(([to,label])=>(
            <NavLink key={to} to={to} active={pathname===to} className="shrink-0">{t(label)}</NavLink>
          ))}
        </nav>
      </header>

      <Outlet/>

      {/* FOOTER */}
      <footer className="border-t border-line">
        <div className="mx-auto max-w-[1120px] px-5 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted">
          <div className="flex items-center gap-2"><Mark size={26}/><span className="font-extrabold lowercase text-ink">coreon <span className="font-normal" style={{color:A}}>edu</span></span></div>
          <div className="flex items-center gap-5">
            <Link to="/modules" className="hover:text-ink">{t('Modules')}</Link>
            <Link to="/donnees" className="hover:text-ink">{t('Vos données')}</Link>
            <Link to="/tarifs" className="hover:text-ink">{t('Tarifs')}</Link>
            <a href="https://kogiagroup.com" className="hover:text-ink">Kogia Group</a>
          </div>
          <div>© 2026 Kogia Group</div>
        </div>
      </footer>
    </div>
  )
}
