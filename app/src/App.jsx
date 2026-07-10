import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { current } from './auth.js'
import AppShell from './components/AppShell.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Students from './pages/Students.jsx'
import Teachers from './pages/Teachers.jsx'
import Accounts from './pages/Accounts.jsx'
import Evaluate from './pages/Evaluate.jsx'
import Finance from './pages/Finance.jsx'
import Payments from './pages/Payments.jsx'
import Incidents from './pages/Incidents.jsx'
import Requests from './pages/Requests.jsx'
import Notices from './pages/Notices.jsx'
import Schools from './pages/Schools.jsx'
import Notifications from './pages/Notifications.jsx'
import Messages from './pages/Messages.jsx'
import Attendance from './pages/Attendance.jsx'
import Homework from './pages/Homework.jsx'
import Library from './pages/Library.jsx'
import Transport from './pages/Transport.jsx'
import Events from './pages/Events.jsx'
import Exams from './pages/Exams.jsx'
import Timetable from './pages/Timetable.jsx'
import Live from './pages/Live.jsx'
import Settings from './pages/Settings.jsx'
import Results from './pages/Results.jsx'
import Staff from './pages/Staff.jsx'
import Pointage from './pages/Pointage.jsx'
import Social from './pages/Social.jsx'
import Security from './pages/Security.jsx'
import { ROUTE_ROLES } from './access.js'
import { featureEnabled } from './features.js'

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
    toast.error("Accès non autorisé pour votre rôle.")
    return <Navigate to="/app" replace/>
  }
  return <AppShell>{el}</AppShell>
}
const R=(el,path)=> <Protected el={el} roles={ROUTE_ROLES[path]} path={path}/>

export default function App(){
  return (
    <HashRouter>
      <Toaster position="top-right" toastOptions={{ style:{ borderRadius:'12px', fontSize:'14px' } }}/>
      <Routes>
        <Route path="/" element={<Landing/>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/app" element={R(<Dashboard/>, "/app")}/>
        <Route path="/app/schools" element={R(<Schools/>, "/app/schools")}/>
        <Route path="/app/settings" element={R(<Settings/>, "/app/settings")}/>
        <Route path="/app/accounts" element={R(<Accounts/>, "/app/accounts")}/>
        <Route path="/app/students" element={R(<Students/>, "/app/students")}/>
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
        <Route path="/app/requests" element={R(<Requests/>, "/app/requests")}/>
        <Route path="/app/messages" element={R(<Messages/>, "/app/messages")}/>
        <Route path="/app/notices" element={R(<Notices/>, "/app/notices")}/>
        <Route path="/app/notifications" element={R(<Notifications/>, "/app/notifications")}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </HashRouter>
  )
}
