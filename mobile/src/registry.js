// Table route → écran natif. Même clés que le web (nav.js / access.js).
// Un écran absent d'ici s'affiche « Bientôt sur mobile » (Shell.js) — la barre
// et le menu Plus listent TOUT le menu du rôle, comme le web.
import Dashboard from './screens/Dashboard.js'
import Live from './screens/Live.js'
import Social from './screens/Social.js'
import Events from './screens/Events.js'
import Messages from './screens/Messages.js'
import Notices from './screens/Notices.js'
import Notifications from './screens/Notifications.js'
import Payments from './screens/Payments.js'
import Bulletin from './screens/Bulletin.js'
import Evaluate from './screens/Evaluate.js'
import Attendance from './screens/Attendance.js'
import Timetable from './screens/Timetable.js'
import Pointage from './screens/Pointage.js'
import Students from './screens/Students.js'
import Teachers from './screens/Teachers.js'
import Staff from './screens/Staff.js'
import Results from './screens/Results.js'
import Finance from './screens/Finance.js'
import Incidents from './screens/Incidents.js'
import Requests from './screens/Requests.js'
import Security from './screens/Security.js'
import Journal from './screens/Journal.js'
import Gallery from './screens/Gallery.js'
import Canteen from './screens/Canteen.js'
import Accidents from './screens/Accidents.js'
import Behavior from './screens/Behavior.js'
import Admissions from './screens/Admissions.js'

export const SCREENS = {
  '/app': Dashboard,
  '/app/admissions': Admissions,
  '/app/journal': Journal,
  '/app/gallery': Gallery,
  '/app/canteen': Canteen,
  '/app/accidents': Accidents,
  '/app/behavior': Behavior,
  '/app/live': Live,
  '/app/social': Social,
  '/app/events': Events,
  '/app/messages': Messages,
  '/app/notices': Notices,
  '/app/notifications': Notifications,
  '/app/payments': Payments,
  '/app/evaluate': Evaluate,
  '/app/attendance': Attendance,
  '/app/timetable': Timetable,
  '/app/pointage': Pointage,
  '/app/students': Students,
  '/app/teachers': Teachers,
  '/app/staff': Staff,
  '/app/results': Results,
  '/app/finance': Finance,
  '/app/incidents': Incidents,
  '/app/requests': Requests,
  '/app/security': Security,
  // Écrans mobiles sans route web directe (préfixe ~ : pas de garde d'accès web)
  '~bulletin': Bulletin,
}
