import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { current } from './auth.js'
import AppShell from './components/AppShell.jsx'
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
const P=({el})=> current()? <AppShell>{el}</AppShell> : <Navigate to="/" replace/>
export default function App(){
  return (
    <HashRouter>
      <Toaster position="top-right" toastOptions={{ style:{ borderRadius:'12px', fontSize:'14px' } }}/>
      <Routes>
        <Route path="/" element={<Login/>}/>
        <Route path="/app" element={<P el={<Dashboard/>}/>}/>
        <Route path="/app/students" element={<P el={<Students/>}/>}/>
        <Route path="/app/teachers" element={<P el={<Teachers/>}/>}/>
        <Route path="/app/accounts" element={<P el={<Accounts/>}/>}/>
        <Route path="/app/evaluate" element={<P el={<Evaluate/>}/>}/>
        <Route path="/app/attendance" element={<P el={<Attendance/>}/>}/>
        <Route path="/app/homework" element={<P el={<Homework/>}/>}/>
        <Route path="/app/exams" element={<P el={<Exams/>}/>}/>
        <Route path="/app/finance" element={<P el={<Finance/>}/>}/>
        <Route path="/app/payments" element={<P el={<Payments/>}/>}/>
        <Route path="/app/library" element={<P el={<Library/>}/>}/>
        <Route path="/app/transport" element={<P el={<Transport/>}/>}/>
        <Route path="/app/events" element={<P el={<Events/>}/>}/>
        <Route path="/app/incidents" element={<P el={<Incidents/>}/>}/>
        <Route path="/app/requests" element={<P el={<Requests/>}/>}/>
        <Route path="/app/messages" element={<P el={<Messages/>}/>}/>
        <Route path="/app/notices" element={<P el={<Notices/>}/>}/>
        <Route path="/app/notifications" element={<P el={<Notifications/>}/>}/>
        <Route path="/app/schools" element={<P el={<Schools/>}/>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </HashRouter>
  )
}
