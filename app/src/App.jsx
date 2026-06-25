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

const Page = ({el}) => current() ? <AppShell>{el}</AppShell> : <Navigate to="/" replace/>
export default function App(){
  return (
    <HashRouter>
      <Toaster position="top-right" toastOptions={{ style:{ borderRadius:'12px', fontSize:'14px' } }}/>
      <Routes>
        <Route path="/" element={<Login/>}/>
        <Route path="/app" element={<Page el={<Dashboard/>}/>}/>
        <Route path="/app/students" element={<Page el={<Students/>}/>}/>
        <Route path="/app/teachers" element={<Page el={<Teachers/>}/>}/>
        <Route path="/app/accounts" element={<Page el={<Accounts/>}/>}/>
        <Route path="/app/evaluate" element={<Page el={<Evaluate/>}/>}/>
        <Route path="/app/finance" element={<Page el={<Finance/>}/>}/>
        <Route path="/app/payments" element={<Page el={<Payments/>}/>}/>
        <Route path="/app/incidents" element={<Page el={<Incidents/>}/>}/>
        <Route path="/app/requests" element={<Page el={<Requests/>}/>}/>
        <Route path="/app/notices" element={<Page el={<Notices/>}/>}/>
        <Route path="/app/schools" element={<Page el={<Schools/>}/>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </HashRouter>
  )
}
