import { lazy, Suspense } from 'react'
import { t } from '@core/i18n.js'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { current } from '@core/auth.js'
import { isRemote } from './remote.js'
import ScrollToTop from './components/ScrollToTop.jsx'
import SiteChrome from './pages/site/Chrome.jsx'
import Home from './pages/site/Home.jsx'
import Login from './pages/Login.jsx'
// Les pages secondaires de la vitrine se chargent à la demande (CR-006).
// AppShell n'apparaît qu'APRÈS connexion (voir Protected plus bas), mais était
// importé au démarrage : chaque visiteur de la vitrine téléchargeait le cadre
// complet de l'application scolaire sans jamais l'utiliser. Il est rendu à
// l'intérieur du <Suspense> global, donc le différer ne change rien à l'écran.
const AppShell = lazy(() => import('./components/AppShell.jsx'))
const ModulesPage = lazy(() => import('./pages/site/ModulesPage.jsx'))
const DataPage = lazy(() => import('./pages/site/DataPage.jsx'))
const PricingPage = lazy(() => import('./pages/site/PricingPage.jsx'))
const FaqPage = lazy(() => import('./pages/site/FaqPage.jsx'))
// ── Le reste se charge À LA DEMANDE : le premier écran n'embarque plus les 40 pages,
//    ni jsPDF, ni les graphiques. Chaque page devient son propre fichier (code-splitting).
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const MotDePasseOublie = lazy(() => import('./pages/MotDePasseOublie.jsx'))
const Reinitialiser = lazy(() => import('./pages/Reinitialiser.jsx'))
const Students = lazy(() => import('./pages/Students.jsx'))
const StudentProfile = lazy(() => import('./pages/StudentProfile.jsx'))
const Teachers = lazy(() => import('./pages/Teachers.jsx'))
const Accounts = lazy(() => import('./pages/Accounts.jsx'))
const Audit = lazy(() => import('./pages/Audit.jsx'))
const Evaluate = lazy(() => import('./pages/Evaluate.jsx'))
const Finance = lazy(() => import('./pages/Finance.jsx'))
const Payments = lazy(() => import('./pages/Payments.jsx'))
const Incidents = lazy(() => import('./pages/Incidents.jsx'))
const Behavior = lazy(() => import('./pages/Behavior.jsx'))
const Gallery = lazy(() => import('./pages/Gallery.jsx'))
const Canteen = lazy(() => import('./pages/Canteen.jsx'))
const Documents = lazy(() => import('./pages/Documents.jsx'))
const Budget = lazy(() => import('./pages/Budget.jsx'))
const Inventory = lazy(() => import('./pages/Inventory.jsx'))
const Recruit = lazy(() => import('./pages/Recruit.jsx'))
const Journal = lazy(() => import('./pages/Journal.jsx'))
const Admissions = lazy(() => import('./pages/Admissions.jsx'))
const Setup = lazy(() => import('./pages/Setup.jsx'))
const Inscription = lazy(() => import('./pages/Inscription.jsx'))
const HR = lazy(() => import('./pages/HR.jsx'))
const Accounting = lazy(() => import('./pages/Accounting.jsx'))
const Academic = lazy(() => import('./pages/Academic.jsx'))
const Facilities = lazy(() => import('./pages/Facilities.jsx'))
const Accidents = lazy(() => import('./pages/Accidents.jsx'))
const ChildFile = lazy(() => import('./pages/ChildFile.jsx'))
const Interop = lazy(() => import('./pages/Interop.jsx'))
const ImportData = lazy(() => import('./pages/ImportData.jsx'))
const Requests = lazy(() => import('./pages/Requests.jsx'))
const Notices = lazy(() => import('./pages/Notices.jsx'))
const Schools = lazy(() => import('./pages/Schools.jsx'))
const Notifications = lazy(() => import('./pages/Notifications.jsx'))
const Messages = lazy(() => import('./pages/Messages.jsx'))
const Attendance = lazy(() => import('./pages/Attendance.jsx'))
const Homework = lazy(() => import('./pages/Homework.jsx'))
const Library = lazy(() => import('./pages/Library.jsx'))
const Transport = lazy(() => import('./pages/Transport.jsx'))
const Events = lazy(() => import('./pages/Events.jsx'))
const Exams = lazy(() => import('./pages/Exams.jsx'))
const Timetable = lazy(() => import('./pages/Timetable.jsx'))
const Live = lazy(() => import('./pages/Live.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))
const Results = lazy(() => import('./pages/Results.jsx'))
const Staff = lazy(() => import('./pages/Staff.jsx'))
const Pointage = lazy(() => import('./pages/Pointage.jsx'))
const Social = lazy(() => import('./pages/Social.jsx'))
const Security = lazy(() => import('./pages/Security.jsx'))
import { ROUTE_ROLES } from '@core/access.js'
import { featureEnabled } from '@core/features.js'

// ── Security: strict per-route authorization by role ──
// La table des permissions vit dans access.js (source unique, refus par défaut) :
// deux copies finissaient toujours par diverger.
// Must be logged in AND (if roles set) hold an allowed role, else bounce to own
// dashboard. Prevents e.g. a parent opening /app/finance by typing the URL.
function Protected({ el, roles, path }){
  const u=current()
  if(!u) return <Navigate to="/login" replace/>
  // Un module éteint (features.js) n'est plus atteignable, même en tapant l'URL.
  if(path && !featureEnabled(path)) return <Navigate to="/app" replace/>
  if(roles && !roles.includes(u.role)){
    toast.error(t('Accès non autorisé pour votre rôle.'))
    return <Navigate to="/app" replace/>
  }
  return <AppShell>{el}</AppShell>
}
const R=(el,path)=> <Protected el={el} roles={ROUTE_ROLES[path]} path={path}/>

// ⚠️ AUDIT 2026-07-25 : aucun error boundary — le moindre throw dans une page
// lazy = ÉCRAN BLANC sans issue. ErrorState existait dans ui.jsx… utilisé nulle
// part. Le voici, global : la page fautive s'excuse, le reste de l'app survit.
import { Component } from 'react'
import { ErrorState } from './components/ui.jsx'
import { captureException } from './telemetry.js'
class Boundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error){ return { error } }
  // Une erreur de rendu attrapée ici n'est PAS une exception globale : sans cet
  // appel, Sentry ne la verrait jamais — exactement les pages mortes du 2026-07-29.
  componentDidCatch(error, info){ console.error('[boundary]', error); captureException(error, { route: this.props.routeKey, componentStack: info?.componentStack }) }
  // ⚠️ QA 2026-07-26 : sans ce réarmement, la PREMIÈRE erreur gelait toute
  // l'application — chaque page suivante restait l'écran d'excuse, sans que
  // rien ne le dise. Une page fautive ne condamne plus les autres.
  componentDidUpdate(prev){ if (this.state.error && prev.routeKey !== this.props.routeKey) this.setState({ error: null }) }
  render(){
    if (this.state.error) return (
      <div className="min-h-screen grid place-items-center bg-canvas p-6">
        <ErrorState onRetry={() => { this.setState({ error: null }); location.reload() }}/>
      </div>)
    return this.props.children
  }
}

/** La clé de route : elle change à chaque navigation et réarme le boundary. */
function RoutedBoundary({ children }){
  const loc = useLocation()
  return <Boundary routeKey={loc.pathname}>{children}</Boundary>
}

export default function App(){
  return (
    <HashRouter>
      <ScrollToTop/>
      <Toaster position="top-right" toastOptions={{ style:{ borderRadius:'12px', fontSize:'14px' } }}/>
      {/* role="status" : un <div> nu ne peut PAS porter aria-label (axe :
          aria-prohibited-attr). Le défaut ne se voyait qu'au hasard du temps de
          chargement — la page était scannée pendant que ce squelette était
          encore à l'écran. Avec un rôle, le lecteur d'écran annonce enfin
          l'attente, et le contrôle d'accessibilité cesse d'être capricieux. */}
      <RoutedBoundary>
      <Suspense fallback={<div className="min-h-screen grid place-items-center"><div role="status" aria-live="polite" className="skeleton w-40 h-10" aria-label={t('Chargement…')}/></div>}>
      <Routes>
        {/* La vitrine publique : une coquille partagée (en-tête + pied) et une
            VRAIE route par entrée de menu (CR-006). URL propre, favori possible,
            bouton « précédent » respecté, entrée active marquée. */}
        <Route element={<SiteChrome/>}>
          <Route path="/" element={<Home/>}/>
          <Route path="/modules" element={<ModulesPage/>}/>
          <Route path="/donnees" element={<DataPage/>}/>
          <Route path="/tarifs" element={<PricingPage/>}/>
          <Route path="/faq" element={<FaqPage/>}/>
        </Route>
        {/* ⚠️ AUDIT 2026-07-25 (S-9) : en mode serveur, /login (connexions démo
            en un clic) restait joignable après RemoteGate — escalade de rôle
            côté client. En mode serveur, la porte est RemoteGate, pas ici. */}
        <Route path="/login" element={isRemote() ? <Navigate to="/app" replace/> : <Login/>}/>
        {/* Le premier écran d'une école : pas de menu, pas de coquille — une seule question. */}
        {/* ⚠️ AUDIT 2026-07-25 : /setup était PUBLIC — n'importe qui réécrivait
            le nom et les niveaux de l'école. Désormais protégé (direction). */}
        <Route path="/setup" element={R(<Setup/>, "/setup")}/>
        {/* PUBLIQUE, sans compte : c'est le PARENT qui dépose la candidature.
            L'école ne ressaisit rien — la donnée entre à la source. */}
        <Route path="/inscription" element={<Inscription/>}/>
        {/* Récupération d'accès (CR-013) : publiques par nature — on y arrive
            justement quand on ne peut PAS se connecter. */}
        <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie/>}/>
        <Route path="/reinitialiser" element={<Reinitialiser/>}/>
        <Route path="/app" element={R(<Dashboard/>, "/app")}/>
        <Route path="/app/schools" element={R(<Schools/>, "/app/schools")}/>
        <Route path="/app/settings" element={R(<Settings/>, "/app/settings")}/>
        <Route path="/app/accounts" element={R(<Accounts/>, "/app/accounts")}/>
        <Route path="/app/audit" element={R(<Audit/>, "/app/audit")}/>
        <Route path="/app/students" element={R(<Students/>, "/app/students")}/>
        <Route path="/app/eleve/:id" element={R(<StudentProfile/>, "/app/eleve")}/>
        <Route path="/app/teachers" element={R(<Teachers/>, "/app/teachers")}/>
        <Route path="/app/staff" element={R(<Staff/>, "/app/staff")}/>
        <Route path="/app/pointage" element={R(<Pointage/>, "/app/pointage")}/>
        <Route path="/app/evaluate" element={R(<Evaluate/>, "/app/evaluate")}/>
        <Route path="/app/results" element={R(<Results/>, "/app/results")}/>
        <Route path="/app/timetable" element={R(<Timetable/>, "/app/timetable")}/>
        <Route path="/app/attendance" element={R(<Attendance/>, "/app/attendance")}/>
        <Route path="/app/homework" element={R(<Homework/>, "/app/homework")}/>
        <Route path="/app/exams" element={R(<Exams/>, "/app/exams")}/>
        <Route path="/app/finance" element={R(<Finance/>, "/app/finance")}/>
        <Route path="/app/payments" element={R(<Payments/>, "/app/payments")}/>
        <Route path="/app/live" element={R(<Live/>, "/app/live")}/>
        <Route path="/app/library" element={R(<Library/>, "/app/library")}/>
        <Route path="/app/transport" element={R(<Transport/>, "/app/transport")}/>
        <Route path="/app/events" element={R(<Events/>, "/app/events")}/>
        <Route path="/app/social" element={R(<Social/>, "/app/social")}/>
        <Route path="/app/security" element={R(<Security/>, "/app/security")}/>
        <Route path="/app/incidents" element={R(<Incidents/>, "/app/incidents")}/>
        <Route path="/app/behavior" element={R(<Behavior/>, "/app/behavior")}/>
        <Route path="/app/gallery" element={R(<Gallery/>, "/app/gallery")}/>
        <Route path="/app/canteen" element={R(<Canteen/>, "/app/canteen")}/>
        <Route path="/app/documents" element={R(<Documents/>, "/app/documents")}/>
        <Route path="/app/budget" element={R(<Budget/>, "/app/budget")}/>
        <Route path="/app/inventory" element={R(<Inventory/>, "/app/inventory")}/>
        <Route path="/app/recruit" element={R(<Recruit/>, "/app/recruit")}/>
        <Route path="/app/journal" element={R(<Journal/>, "/app/journal")}/>
        <Route path="/app/admissions" element={R(<Admissions/>, "/app/admissions")}/>
        <Route path="/app/hr" element={R(<HR/>, "/app/hr")}/>
        <Route path="/app/accounting" element={R(<Accounting/>, "/app/accounting")}/>
        <Route path="/app/academic" element={R(<Academic/>, "/app/academic")}/>
        <Route path="/app/facilities" element={R(<Facilities/>, "/app/facilities")}/>
        <Route path="/app/accidents" element={R(<Accidents/>, "/app/accidents")}/>
        <Route path="/app/child" element={R(<ChildFile/>, "/app/child")}/>
        <Route path="/app/interop" element={R(<Interop/>, "/app/interop")}/>
        <Route path="/app/import" element={R(<ImportData/>, "/app/import")}/>

        <Route path="/app/requests" element={R(<Requests/>, "/app/requests")}/>
        <Route path="/app/messages" element={R(<Messages/>, "/app/messages")}/>
        <Route path="/app/notices" element={R(<Notices/>, "/app/notices")}/>
        <Route path="/app/notifications" element={R(<Notifications/>, "/app/notifications")}/>
        <Route path="*" element={<Navigate to={current() ? "/app" : "/"} replace/>}/>
      </Routes>
      </Suspense>
      </RoutedBoundary>
    </HashRouter>
  )
}
