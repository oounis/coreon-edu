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
import Histoires from './pages/Histoires.jsx'

// ── Security: strict per-route authorization by role ──
const ALL=['owner','schooladmin','admin','teacher','supervisor','parent']
// Must be logged in AND (if roles set) hold an allowed role, else bounce to own
// dashboard. Prevents e.g. a parent opening /app/finance by typing the URL.
function Protected({ el, roles }){
  const u=current()
  if(!u) return <Navigate to="/login" replace/>
  if(roles && !roles.includes(u.role)){
    toast.error("Accès non autorisé pour votre rôle.")
    return <Navigate to="/app" replace/>
  }
  return <AppShell>{el}</AppShell>
}
const R=(el,roles)=> <Protected el={el} roles={roles}/>

export default function App(){
  return (
    <HashRouter>
      <Toaster position="top-right" toastOptions={{ style:{ borderRadius:'12px', fontSize:'14px' } }}/>
      <Routes>
        <Route path="/" element={<Landing/>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/app" element={R(<Dashboard/>, ALL)}/>
        <Route path="/app/schools" element={R(<Schools/>, ['owner'])}/>
        <Route path="/app/settings" element={R(<Settings/>, ['owner','schooladmin'])}/>
        <Route path="/app/accounts" element={R(<Accounts/>, ['schooladmin'])}/>
        <Route path="/app/students" element={R(<Students/>, ['schooladmin','admin','supervisor','teacher'])}/>
        <Route path="/app/teachers" element={R(<Teachers/>, ['schooladmin','admin'])}/>
        <Route path="/app/evaluate" element={R(<Evaluate/>, ['teacher'])}/>
        <Route path="/app/timetable" element={R(<Timetable/>, ['schooladmin','admin','teacher','parent','supervisor'])}/>
        <Route path="/app/attendance" element={R(<Attendance/>, ['schooladmin','teacher','admin','supervisor'])}/>
        <Route path="/app/homework" element={R(<Homework/>, ['teacher','admin','parent'])}/>
        <Route path="/app/exams" element={R(<Exams/>, ['schooladmin','admin','teacher','parent'])}/>
        <Route path="/app/finance" element={R(<Finance/>, ['schooladmin','admin'])}/>
        <Route path="/app/payments" element={R(<Payments/>, ['parent'])}/>
        <Route path="/app/live" element={R(<Live/>, ['parent'])}/>
        <Route path="/app/library" element={R(<Library/>, ['schooladmin','admin','teacher'])}/>
        <Route path="/app/transport" element={R(<Transport/>, ['schooladmin','admin','parent'])}/>
        <Route path="/app/events" element={R(<Events/>, ALL)}/>
        <Route path="/app/incidents" element={R(<Incidents/>, ['supervisor','admin','schooladmin'])}/>
        <Route path="/app/requests" element={R(<Requests/>, ['teacher','admin','schooladmin'])}/>
        <Route path="/app/messages" element={R(<Messages/>, ALL)}/>
        <Route path="/app/notices" element={R(<Notices/>, ALL)}/>
        <Route path="/app/histoires" element={R(<Histoires/>, ALL)}/>
        <Route path="/app/notifications" element={R(<Notifications/>, ALL)}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </HashRouter>
  )
}
